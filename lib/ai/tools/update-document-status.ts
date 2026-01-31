/**
 * update-document-status Tool
 *
 * Updates a compliance document's verification status.
 * In the playground, this simulates the update and logs the action.
 * In production, this would call the Credentially API.
 */

import { tool } from "ai";
import { z } from "zod";

export const updateDocumentStatus = tool({
	description: `Updates a compliance document's verification status with evidence.

When to use:
- After verifying a certificate, mark it as VERIFIED with evidence
- When a certificate is found to be invalid or unverifiable
- When a certificate has expired
- To attach verification evidence (source URL, timestamp, fields)`,

	inputSchema: z.object({
		documentId: z
			.string()
			.optional()
			.describe("Document ID if known"),
		status: z
			.enum(["verified", "unverifiable", "expired", "pending_review"])
			.describe("New verification status"),
		evidence: z
			.object({
				source: z.string().optional().describe("Verification source (e.g. AHA portal)"),
				verifiedAt: z.string().optional().describe("When verification was performed"),
				expiryDate: z.string().optional().describe("Certificate expiry date"),
				verificationFields: z
					.record(z.string())
					.optional()
					.describe("Fields extracted from the verification source"),
				notes: z.string().optional().describe("Additional notes"),
			})
			.describe("Evidence supporting the status update"),
	}),

	execute: async ({
		documentId,
		status,
		evidence,
	}): Promise<{ data: { status: string; evidence: unknown; message: string } } | { error: string }> => {
		console.log("[updateDocumentStatus] Updating:", { documentId, status, evidence });

		// Playground simulation — log the action
		// In production, this would call the Credentially API

		return {
			data: {
				status,
				evidence,
				message: `Document status updated to ${status.toUpperCase()}. Evidence recorded.`,
			},
		};
	},
});
