import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";
import { getVoiceCallById } from "@/lib/db/queries";

// ============================================
// GET /api/voice/calls/[id] - Get call details
// ============================================

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

		// 2. Fetch call (includes ownership check)
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

		// 3. Return call details
		return NextResponse.json({
			id: call.id,
			templateSlug: call.templateSlug,
			phoneNumber: call.phoneNumber,
			recipientName: call.recipientName,
			context: call.context,
			capturedData: call.capturedData,
			status: call.status,
			outcome: call.outcome,
			recordingUrl: call.recordingUrl,
			transcript: call.transcript,
			duration: call.duration,
			createdAt: call.createdAt.toISOString(),
			startedAt: call.startedAt?.toISOString(),
			endedAt: call.endedAt?.toISOString(),
		});
	} catch (error) {
		console.error("Error getting voice call:", error);

		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}

		return NextResponse.json(
			{
				success: false,
				error: "Failed to get voice call",
			},
			{ status: 500 },
		);
	}
}
