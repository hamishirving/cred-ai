/**
 * storeAttachment Tool
 *
 * Stores a base64-encoded file attachment to Supabase storage.
 * Returns a signed URL for downstream tools (classify, verify).
 * Used by the inbound email agent to process email attachments.
 *
 * Two variants:
 * - `storeAttachment` (static): requires base64Content in the input (general use)
 * - `createStoreAttachment(attachments)`: factory that closes over an attachments
 *   array so the model only needs to pass an attachmentIndex. This avoids dumping
 *   megabytes of base64 data into the conversation context.
 */

import { tool } from "ai";
import { z } from "zod";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const BUCKET = "documents";

/** Attachment shape as received from inbound email webhook */
export interface EmailAttachment {
	fileName: string;
	contentType: string;
	base64Content: string;
	contentLength: number;
}

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

/** Core upload logic shared by both variants */
async function uploadToStorage({
	base64Content,
	fileName,
	contentType,
	organisationId,
	profileId,
}: {
	base64Content: string;
	fileName: string;
	contentType: string;
	organisationId: string;
	profileId: string;
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
> {
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
}

/**
 * Static variant — requires base64Content in the tool input.
 * Kept for backward compatibility / non-agent use cases.
 */
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

	execute: async (input) => uploadToStorage(input),
});

/**
 * Factory variant — closes over the attachments array so the model only needs
 * to specify an attachmentIndex (0-based). The tool pulls the base64Content
 * from the closure, keeping it out of the conversation context entirely.
 */
export function createStoreAttachment(attachments: EmailAttachment[]) {
	return tool({
		description: `Stores an email attachment to Supabase storage and returns a signed URL.
Use this as the first step when processing inbound email attachments.
Pass the attachmentIndex (0-based) to select which attachment to store — the file data is loaded automatically.
The signed URL can then be passed to classifyDocument and verifyDocumentEvidence.`,

		inputSchema: z.object({
			attachmentIndex: z
				.number()
				.int()
				.min(0)
				.describe(
					`0-based index of the attachment to store (0 to ${attachments.length - 1})`,
				),
			organisationId: z.string().uuid().describe("Organisation ID"),
			profileId: z.string().uuid().describe("Candidate profile ID"),
		}),

		execute: async ({ attachmentIndex, organisationId, profileId }) => {
			if (attachmentIndex < 0 || attachmentIndex >= attachments.length) {
				return {
					error: `Invalid attachmentIndex ${attachmentIndex}. Must be 0-${attachments.length - 1}.`,
				};
			}

			const att = attachments[attachmentIndex];
			return uploadToStorage({
				base64Content: att.base64Content,
				fileName: att.fileName,
				contentType: att.contentType,
				organisationId,
				profileId,
			});
		},
	});
}
