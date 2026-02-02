/**
 * classify-document Tool
 *
 * Vision-based document classification using Claude.
 * Identifies document type, issuing body, and confidence level.
 * Supports both images and PDFs via the AI SDK file content part.
 */

import { generateText, tool } from "ai";
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
	// Default to image/jpeg for unknown — Claude will figure it out
	return "image/jpeg";
}

export const classifyDocument = tool({
	description: `Classifies an uploaded document by type using vision analysis.
Returns the document category, issuing body, and confidence level.

When to use:
- When a document is uploaded and its type needs to be determined
- Before running type-specific verification workflows
- To identify certificates, licences, or compliance documents`,

	inputSchema: z.object({
		documentUrl: z
			.string()
			.describe("URL of the document image to classify"),
	}),

	execute: async ({
		documentUrl,
	}): Promise<
		| {
				data: {
					type: string;
					issuer: string;
					confidence: number;
					details: string;
				};
		  }
		| { error: string }
	> => {
		console.log("[classifyDocument] Classifying:", documentUrl);

		try {
			const mediaType = inferMediaType(documentUrl);

			const result = await generateText({
				model: myProvider.languageModel("chat-model"),
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: `Classify this document. Return a JSON object with:
- type: the document type (e.g. "bls_certificate", "acls_certificate", "pals_certificate", "nursing_licence", "dbs_certificate", "passport", "visa", "training_certificate", "unknown")
- issuer: the issuing organisation (e.g. "American Heart Association", "NMC", "GMC", "DBS", etc.)
- confidence: a number from 0 to 1 indicating classification confidence
- details: a brief description of what you see

Respond ONLY with the JSON object, no other text.`,
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

			// Parse the JSON response
			const text = result.text.trim();
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				return { error: "Failed to parse classification result" };
			}

			const parsed = JSON.parse(jsonMatch[0]);

			return {
				data: {
					type: parsed.type || "unknown",
					issuer: parsed.issuer || "Unknown",
					confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
					details: parsed.details || "No details available",
				},
			};
		} catch (error) {
			console.error("[classifyDocument] Error:", error);
			return {
				error: `Failed to classify document: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	},
});
