import { tool } from "ai";
import { z } from "zod";
import { getCallStatus as getVapiCallStatus } from "@/lib/voice/vapi-client";
import { getVoiceCallByVapiId, updateVoiceCall } from "@/lib/db/queries";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_DURATION_MS = 180000; // 3 minutes

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
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
		vapiCallId: z.string().describe("VAPI call ID (returned from initiateVoiceCall)"),
	}),

	execute: async ({ vapiCallId }) => {
		console.log("[getCallStatus] Waiting for call to complete:", vapiCallId);

		const startTime = Date.now();
		let pollCount = 0;

		try {
			while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
				pollCount++;
				const result = await getVapiCallStatus(vapiCallId);
				console.log(`[getCallStatus] Poll ${pollCount}: status=${result.status}`);

				if (result.status === "ended") {
					// Update our DB record
					const voiceCall = await getVoiceCallByVapiId({ vapiCallId });
					if (voiceCall) {
						await updateVoiceCall({
							id: voiceCall.id,
							status: "ended",
							outcome: result.outcome,
							duration: result.duration,
							capturedData: result.capturedData,
							transcript: result.transcript,
						});
					}

					return {
						data: {
							status: result.status,
							outcome: result.outcome,
							capturedData: result.capturedData,
							transcript: result.transcript,
							duration: result.duration,
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
					capturedData: finalResult.capturedData,
					transcript: finalResult.transcript,
					duration: finalResult.duration,
					pollCount,
					timedOut: true,
				},
			};
		} catch (error) {
			console.error("[getCallStatus] Error:", error);
			return { error: `Failed to get call status: ${error instanceof Error ? error.message : String(error)}` };
		}
	},
});
