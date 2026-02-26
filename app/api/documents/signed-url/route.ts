/**
 * Document Signed URL API Route
 *
 * GET /api/documents/signed-url?path=evidence/org-id/profile-id/slug-id.pdf
 *
 * Returns a time-limited signed URL for accessing a document in Supabase Storage.
 */

import { auth } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	const session = await auth();
	if (!session?.user) {
		return new ChatSDKError("unauthorized:chat").toResponse();
	}

	const { searchParams } = new URL(request.url);
	const filePath = searchParams.get("path");

	if (!filePath) {
		return Response.json({ error: "Missing path parameter" }, { status: 400 });
	}

	const supabase = await createClient();

	const { data, error } = await supabase.storage
		.from("documents")
		.createSignedUrl(filePath, 3600);

	if (error || !data?.signedUrl) {
		console.error("[documents/signed-url] Error:", error);
		return Response.json(
			{ error: "Failed to generate signed URL" },
			{ status: 500 },
		);
	}

	return Response.json({ url: data.signedUrl });
}
