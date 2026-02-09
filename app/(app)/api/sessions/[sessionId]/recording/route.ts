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

		// Check session status first — recording only available after COMPLETED
		const bbSession = await bb.sessions.retrieve(sessionId);
		console.log(`[recording] sessionId=${sessionId} sessionStatus=${bbSession.status}`);

		if (bbSession.status === "RUNNING") {
			// Request the session to finish so the recording gets processed
			const projectId = process.env.BROWSERBASE_PROJECT_ID;
			if (projectId) {
				try {
					await bb.sessions.update(sessionId, { projectId, status: "REQUEST_RELEASE" });
					console.log(`[recording] Sent REQUEST_RELEASE for ${sessionId}`);
				} catch {
					// May already be released
				}
			}
			return Response.json([], { status: 202 });
		}

		// Call BrowserBase API directly — the SDK may not parse the response correctly
		const res = await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}/recording`, {
			headers: { "x-bb-api-key": apiKey },
		});

		console.log(`[recording] sessionId=${sessionId} apiStatus=${res.status} contentType=${res.headers.get("content-type")}`);

		if (!res.ok) {
			console.log(`[recording] API error: ${res.status} ${res.statusText}`);
			return Response.json([], { status: 202 });
		}

		const raw = await res.text();
		console.log(`[recording] sessionId=${sessionId} rawLength=${raw.length} preview=${raw.slice(0, 200)}`);

		if (!raw || raw === "[]") {
			return Response.json([], { status: 202 });
		}

		const recording = JSON.parse(raw);

		if (!Array.isArray(recording) || recording.length === 0) {
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
