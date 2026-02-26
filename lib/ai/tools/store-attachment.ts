/**
 * storeAttachment Tool
 *
 * Stores a base64-encoded file attachment to Supabase storage.
 * Returns a signed URL for downstream tools (classify, verify).
 * Used by the inbound email agent to process email attachments.
 */

import { tool } from "ai";
import { z } from "zod";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const BUCKET = "documents";

/** Map MIME type to file extension */
function mimeToExt(contentType: string): string {
	if (contentType.includes("pdf")) return "pdf";
	if (contentType.includes("png")) return "png";
	if (contentType.includes("webp")) return "webp";
	if (contentType.includes("gif")) return "gif";
	if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
	if (contentType.includes("tiff")) return "tiff";
	if (contentType.includes("bmp")) return "bmp";
	return "bin";
}

export const storeAttachment = tool({
	description: `Stores a base64-encoded email attachment to Supabase storage and returns a signed URL.
Use this as the first step when processing inbound email attachments.
The signed URL can then be passed to classifyDocument and verifyDocumentEvidence.`,

	inputSchema: z.object({
		base64Content: z.string().describe("Base64-encoded file content"),
		fileName: z.string().describe("Original filename"),
		contentType: z.string().describe("MIME type of the file"),
		organisationId: z.string().uuid().describe("Organisation ID"),
		profileId: z.string().uuid().describe("Candidate profile ID"),
	}),

	execute: async ({
		base64Content,
		fileName,
		contentType,
		organisationId,
		profileId,
	}): Promise<
		| {
				data: {
					storagePath: string;
					signedUrl: string;
					fileName: string;
					contentType: string;
					fileSize: number;
				};
		  }
		| { error: string }
	> => {
		console.log("[storeAttachment] Storing:", fileName, "for profile:", profileId);

		try {
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
			const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

			if (!supabaseUrl || !supabaseKey) {
				return { error: "Supabase storage not configured" };
			}

			const supabase = createSupabaseAdmin(supabaseUrl, supabaseKey);

			// Decode base64 to buffer
			const buffer = Buffer.from(base64Content, "base64");
			const ext = mimeToExt(contentType);
			const storagePath = `inbound/${organisationId}/${profileId}/${randomUUID()}.${ext}`;

			// Upload to Supabase storage
			const { error: uploadError } = await supabase.storage
				.from(BUCKET)
				.upload(storagePath, buffer, {
					contentType,
					upsert: true,
				});

			if (uploadError) {
				return { error: `Upload failed: ${uploadError.message}` };
			}

			// Generate 1-hour signed URL
			const { data: signedData } = await supabase.storage
				.from(BUCKET)
				.createSignedUrl(storagePath, 3600);

			if (!signedData?.signedUrl) {
				return { error: "Failed to generate signed URL" };
			}

			return {
				data: {
					storagePath,
					signedUrl: signedData.signedUrl,
					fileName,
					contentType,
					fileSize: buffer.length,
				},
			};
		} catch (error) {
			console.error("[storeAttachment] Error:", error);
			return {
				error: `Failed to store attachment: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	},
});
