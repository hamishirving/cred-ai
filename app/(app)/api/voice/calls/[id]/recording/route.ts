import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";
import { getVoiceCallById } from "@/lib/db/queries";

// ============================================================
// GET /api/voice/calls/[id]/recording
// Redirects to a short-lived signed Vapi recording URL.
//
// Vapi's public recordingUrl fields went auth-only on 2026-07-25.
// Recordings must now be fetched from the authenticated artifact
// endpoint with the server-side VAPI_API_KEY, which 302-redirects
// to a signed URL. We proxy that redirect so the key stays server
// side and no audio bytes stream through the app.
// ============================================================

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

		// 3. No VAPI call means no recording yet
		if (!call.vapiCallId) {
			return NextResponse.json(
				{
					success: false,
					error: "No recording available for this call",
				},
				{ status: 404 },
			);
		}

		// 4. Resolve the signed recording URL from Vapi's authenticated endpoint
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

		const vapiResponse = await fetch(
			`https://api.vapi.ai/call/${call.vapiCallId}/mono-recording`,
			{
				headers: { Authorization: `Bearer ${apiKey}` },
				redirect: "manual",
			},
		);

		const location = vapiResponse.headers.get("location");
		if (
			vapiResponse.status >= 300 &&
			vapiResponse.status < 400 &&
			location
		) {
			// 5. Send the browser straight to the short-lived signed URL
			return NextResponse.redirect(location, 302);
		}

		return NextResponse.json(
			{
				success: false,
				error: `Failed to retrieve recording from Vapi (status ${vapiResponse.status})`,
			},
			{ status: 502 },
		);
	} catch (error) {
		console.error("Error getting call recording:", error);

		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}

		return NextResponse.json(
			{
				success: false,
				error: "Failed to get call recording",
			},
			{ status: 500 },
		);
	}
}
