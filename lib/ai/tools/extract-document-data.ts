/**
 * extract-document-data Tool
 *
 * Vision-based field extraction from documents using Claude.
 * Extracts structured data fields based on document type.
 * Supports both images and PDFs via the AI SDK file content part.
 */

import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";

/** Determine media type from a URL */
function inferMediaType(url: string): string {
	const lower = url.toLowerCase().split("?")[0];
	if (lower.endsWith(".pdf")) return "application/pdf";
	if (lower.endsWith(".png")) return "image/png";
	if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
	if (lower.endsWith(".webp")) return "image/webp";
	if (lower.endsWith(".gif")) return "image/gif";
	return "image/jpeg";
}

/** Extraction schemas by document type */
const extractionSchemas: Record<string, z.ZodObject<z.ZodRawShape>> = {
	bls_certificate: z.object({
		holderName: z.string().describe("Full name of the certificate holder"),
		ecardCode: z.string().describe("eCard code from the certificate"),
		issueDate: z.string().describe("Date the certificate was issued"),
		renewByDate: z.string().describe("Date the certificate must be renewed by"),
		completionLocation: z
			.string()
			.optional()
			.describe("Where the training was completed"),
		certificateType: z
			.string()
			.optional()
			.describe("Specific certificate type (e.g. BLS HeartCode)"),
	}),
	acls_certificate: z.object({
		holderName: z.string().describe("Full name of the certificate holder"),
		ecardCode: z.string().describe("eCard code from the certificate"),
		issueDate: z.string().describe("Date the certificate was issued"),
		renewByDate: z.string().describe("Date the certificate must be renewed by"),
		completionLocation: z.string().optional(),
		certificateType: z.string().optional(),
	}),
	pals_certificate: z.object({
		holderName: z.string().describe("Full name of the certificate holder"),
		ecardCode: z.string().describe("eCard code from the certificate"),
		issueDate: z.string().describe("Date the certificate was issued"),
		renewByDate: z.string().describe("Date the certificate must be renewed by"),
		completionLocation: z.string().optional(),
		certificateType: z.string().optional(),
	}),
};

/** Default schema for unknown document types */
const defaultSchema = z.object({
	holderName: z.string().optional().describe("Name of the document holder"),
	documentNumber: z.string().optional().describe("Document reference number"),
	issueDate: z.string().optional().describe("Issue date"),
	expiryDate: z.string().optional().describe("Expiry date"),
	issuingBody: z.string().optional().describe("Organisation that issued the document"),
	additionalFields: z
		.record(z.string())
		.optional()
		.describe("Any other relevant fields found"),
});

export const extractDocumentData = tool({
	description: `Extracts structured data from a document image using vision analysis.
Returns key fields relevant to the document type.

When to use:
- After a document has been classified
- To pull specific fields for verification or data entry
- To extract eCard codes, names, dates from certificates`,

	inputSchema: z.object({
		documentUrl: z.string().describe("URL of the document image"),
		documentType: z
			.string()
			.describe("The classified document type (e.g. bls_certificate)"),
	}),

	execute: async ({
		documentUrl,
		documentType,
	}): Promise<{ data: Record<string, unknown> } | { error: string }> => {
		console.log("[extractDocumentData] Extracting:", { documentUrl, documentType });

		try {
			const schema = extractionSchemas[documentType] || defaultSchema;
			const mediaType = inferMediaType(documentUrl);

			const result = await generateObject({
				model: myProvider.languageModel("chat-model"),
				schema,
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: `Extract the following fields from this ${documentType.replace(/_/g, " ")} document. Be precise with names, codes, and dates. If a field isn't visible, leave it empty.`,
							},
							{
								type: "file",
								data: new URL(documentUrl),
								mediaType,
							},
						],
					},
				],
			});

			return { data: result.object as Record<string, unknown> };
		} catch (error) {
			console.error("[extractDocumentData] Error:", error);
			return {
				error: `Failed to extract document data: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	},
});
