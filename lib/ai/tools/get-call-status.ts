import { tool } from "ai";
import { z } from "zod";
import { getCallStatus as getVapiCallStatus } from "@/lib/voice/vapi-client";
import { getVoiceCallByVapiId, updateVoiceCall } from "@/lib/db/queries";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_DURATION_MS = 180000; // 3 minutes
const POST_END_POLL_INTERVAL_MS = 3000;
const MAX_POST_END_ARTIFACT_WAIT_MS = 30000; // wait up to 30s for transcript/analysis hydration

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasCallArtifacts(result: {
	transcript?: unknown[];
	capturedData?: Record<string, unknown>;
	recordingUrl?: string;
}) {
	return Boolean(
		(result.transcript && result.transcript.length > 0) ||
			result.capturedData ||
			result.recordingUrl,
	);
}

/**
 * Tool for waiting on a voice call to complete.
 *
 * Polls VAPI internally every 5 seconds until the call ends or the
 * timeout is reached. Returns a single result with transcript and
 * captured data — uses only one agent step regardless of how many
 * polls were needed.
 */
export const getCallStatusTool = tool({
	description: `Wait for a voice call to complete and return the results.
Polls automatically every 5 seconds until the call ends (up to 3 minutes).
Returns transcript and captured data when complete. Only call this once — it handles all polling internally.`,

	inputSchema: z.object({
		vapiCallId: z
			.string()
			.describe("VAPI call ID (returned from initiateVoiceCall)"),
	}),

	execute: async ({ vapiCallId }) => {
		console.log("[getCallStatus] Waiting for call to complete:", vapiCallId);

		const startTime = Date.now();
		let pollCount = 0;

		try {
			while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
				pollCount++;
				const result = await getVapiCallStatus(vapiCallId);
				console.log(
					`[getCallStatus] Poll ${pollCount}: status=${result.status}`,
				);

				if (result.status === "ended") {
					let finalResult = result;

					// Vapi can return status=ended before analysis/artifacts are fully hydrated.
					// If outcome looks completed but data is empty, wait briefly and re-poll.
					if (!hasCallArtifacts(result) && result.outcome === "completed") {
						const postEndStart = Date.now();
						while (Date.now() - postEndStart < MAX_POST_END_ARTIFACT_WAIT_MS) {
							await sleep(POST_END_POLL_INTERVAL_MS);
							pollCount++;
							const retry = await getVapiCallStatus(vapiCallId);
							if (retry.status !== "ended") continue;
							finalResult = retry;
							if (
								hasCallArtifacts(retry) ||
								(retry.outcome && retry.outcome !== "completed")
							) {
								break;
							}
						}
					}

					// Update our DB record
					const voiceCall = await getVoiceCallByVapiId({ vapiCallId });
					if (voiceCall) {
						await updateVoiceCall({
							id: voiceCall.id,
							status: "ended",
							outcome: finalResult.outcome,
							duration: finalResult.duration,
							recordingUrl: finalResult.recordingUrl,
							capturedData: finalResult.capturedData,
							transcript: finalResult.transcript,
						});
					}

					return {
						data: {
							status: finalResult.status,
							outcome: finalResult.outcome,
							endedReason: finalResult.endedReason,
							capturedData: finalResult.capturedData,
							transcript: finalResult.transcript,
							recordingUrl: finalResult.recordingUrl,
							duration: finalResult.duration,
							pollCount,
						},
					};
				}

				await sleep(POLL_INTERVAL_MS);
			}

			// Timed out — return last known status
			const finalResult = await getVapiCallStatus(vapiCallId);
			return {
				data: {
					status: finalResult.status,
					outcome: finalResult.outcome ?? "timeout",
					endedReason: finalResult.endedReason,
					capturedData: finalResult.capturedData,
					transcript: finalResult.transcript,
					recordingUrl: finalResult.recordingUrl,
					duration: finalResult.duration,
					pollCount,
					timedOut: true,
				},
			};
		} catch (error) {
			console.error("[getCallStatus] Error:", error);
			return {
				error: `Failed to get call status: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
