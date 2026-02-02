import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";
import Browserbase from "@browserbasehq/sdk";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ sessionId: string }> },
) {
	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError("unauthorized:chat").toResponse();
	}

	const { sessionId } = await params;

	if (!sessionId) {
		return new ChatSDKError("bad_request:api", "Missing sessionId").toResponse();
	}

	const apiKey = process.env.BROWSERBASE_API_KEY;

	if (!apiKey) {
		return new ChatSDKError(
			"bad_request:api",
			"Browserbase API key not configured",
		).toResponse();
	}

	try {
		const bb = new Browserbase({ apiKey });
		const recording = await bb.sessions.recording.retrieve(sessionId);

		console.log(
			`[recording] sessionId=${sessionId} type=${typeof recording} isArray=${Array.isArray(recording)} length=${Array.isArray(recording) ? recording.length : "n/a"} keys=${recording && typeof recording === "object" && !Array.isArray(recording) ? Object.keys(recording).join(",") : "n/a"}`,
		);

		// Return empty array if no recording data (not ready yet)
		if (!recording || (Array.isArray(recording) && recording.length === 0)) {
			return Response.json([], { status: 202 });
		}

		return Response.json(recording);
	} catch (error) {
		// Browserbase returns 404/422 when recording isn't processed yet
		const statusCode = (error as { status?: number })?.status;
		if (statusCode === 404 || statusCode === 422) {
			return Response.json([], { status: 202 });
		}

		console.error("Failed to retrieve session recording:", error);
		return new ChatSDKError(
			"bad_request:api",
			"Failed to retrieve session recording",
		).toResponse();
	}
}
