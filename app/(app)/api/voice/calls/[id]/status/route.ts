import { type NextRequest, NextResponse } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";
import { auth } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";
import { getVoiceCallById, updateVoiceCall } from "@/lib/db/queries";

interface CallStatusResponse {
	success: boolean;
	status?: string;
	artifact?: {
		recordingUrl?: string;
		transcript?: string;
		structuredOutputs?: Record<string, unknown>;
		messages?: unknown[];
	};
	error?: string;
}

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		// 1. Check authentication
		const session = await auth();
		if (!session?.user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		// 2. Fetch call from database (includes ownership check)
		const call = await getVoiceCallById({
			id,
			userId: session.user.id,
		});

		if (!call) {
			return NextResponse.json(
				{
					success: false,
					error: "Call not found",
				},
				{ status: 404 },
			);
		}

		// 3. If no VAPI call ID, call hasn't been initiated yet
		if (!call.vapiCallId) {
			return NextResponse.json({
				success: true,
				status: call.status,
			});
		}

		// 4. Poll VAPI for current status
		const apiKey = process.env.VAPI_API_KEY;
		if (!apiKey) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing VAPI API key configuration",
				},
				{ status: 500 },
			);
		}

		const vapi = new VapiClient({ token: apiKey });
		const vapiCall = await vapi.calls.get({ id: call.vapiCallId });

		// 5. Update database if status changed to ended
		if (vapiCall.status === "ended" && call.status !== "ended") {
			await updateVoiceCall({
				id: call.id,
				status: "ended",
				outcome: "completed",
				duration: vapiCall.startedAt && vapiCall.endedAt
					? Math.round(
							(new Date(vapiCall.endedAt).getTime() -
								new Date(vapiCall.startedAt).getTime()) /
								1000,
						)
					: undefined,
				recordingUrl: vapiCall.artifact?.recordingUrl,
				// Transcript stored as string in VAPI, returned directly via API - not stored in DB
				capturedData: vapiCall.artifact?.structuredOutputs as Record<string, unknown> | undefined,
				endedAt: new Date(),
			});
		}

		// 6. Return response matching voice-ai structure
		return NextResponse.json({
			success: true,
			status: vapiCall.status,
			artifact: vapiCall.artifact
				? {
						recordingUrl: vapiCall.artifact.recordingUrl,
						transcript: vapiCall.artifact.transcript,
						structuredOutputs: vapiCall.artifact.structuredOutputs,
						messages: vapiCall.artifact.messages,
					}
				: undefined,
		});
	} catch (error) {
		console.error("Error fetching call status:", error);

		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";

		return NextResponse.json(
			{
				success: false,
				error: `Failed to fetch call status: ${errorMessage}`,
			},
			{ status: 500 },
		);
	}
}
