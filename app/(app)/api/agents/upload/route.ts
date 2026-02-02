/**
 * Agent Document Upload API Route
 *
 * POST /api/agents/upload
 *
 * Uploads a file to Supabase Storage and returns a public URL.
 * Used by agent input forms to provide document URLs to the agent runner.
 */

import { auth } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function POST(request: Request) {
	// 1. Auth
	const session = await auth();
	if (!session?.user) {
		return new ChatSDKError("unauthorized:chat").toResponse();
	}

	// 2. Parse multipart form data
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return Response.json(
			{ error: "Invalid form data" },
			{ status: 400 },
		);
	}

	const file = formData.get("file") as File | null;
	if (!file) {
		return Response.json(
			{ error: "No file provided" },
			{ status: 400 },
		);
	}

	// 3. Validate file type (images and PDFs)
	const allowedTypes = [
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/gif",
		"application/pdf",
	];
	if (!allowedTypes.includes(file.type)) {
		return Response.json(
			{ error: `Unsupported file type: ${file.type}. Allowed: ${allowedTypes.join(", ")}` },
			{ status: 400 },
		);
	}

	// 4. Upload to Supabase Storage
	const supabase = await createClient();
	const ext = file.name.split(".").pop() || "bin";
	const fileName = `${session.user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

	const { error: uploadError } = await supabase.storage
		.from("documents")
		.upload(fileName, file, {
			contentType: file.type,
			upsert: false,
		});

	if (uploadError) {
		console.error("[agents/upload] Upload error:", uploadError);
		return Response.json(
			{ error: `Upload failed: ${uploadError.message}` },
			{ status: 500 },
		);
	}

	// 5. Get signed URL (1 hour expiry) — needed for Claude API to download
	const { data: signedData, error: signedError } = await supabase.storage
		.from("documents")
		.createSignedUrl(fileName, 3600);

	if (signedError || !signedData?.signedUrl) {
		console.error("[agents/upload] Signed URL error:", signedError);
		return Response.json(
			{ error: "Upload succeeded but failed to generate signed URL" },
			{ status: 500 },
		);
	}

	return Response.json({
		url: signedData.signedUrl,
		fileName: file.name,
		fileType: file.type,
		fileSize: file.size,
	});
}
