import { tool } from "ai";
import { z } from "zod";
import { getProfileDocuments, isApiError } from "@/lib/api/credentially-client";
import type { DocumentDto } from "@/lib/api/types";

export const getDocuments = tool({
	description: `Retrieve all compliance documents for an employee profile.
Use this tool when the user asks about:
- Documents uploaded for an employee
- Compliance document status (verified, expired, etc.)
- Document types (e.g., ID, certifications, qualifications)
- OCR extracted fields from documents
- Document verification status and history

Requires the profile ID (can be obtained from getProfile tool first).`,

	inputSchema: z.object({
		profileId: z
			.string()
			.describe("The ID of the profile to get documents for"),
	}),

	execute: async ({
		profileId,
	}): Promise<{ data: DocumentDto[] } | { error: string }> => {
		console.log("[getDocuments] Getting documents for profile:", profileId);

		const result = await getProfileDocuments(profileId);

		if (isApiError(result)) {
			return { error: result.error };
		}

		return { data: result };
	},
});
