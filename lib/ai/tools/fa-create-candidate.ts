/**
 * FA Create Candidate Tool
 *
 * Creates a candidate in First Advantage for background screening.
 */

import { tool } from "ai";
import { z } from "zod";
import { getFAClient } from "@/lib/api/first-advantage/client";

export const faCreateCandidate = tool({
	description: `Create a candidate in First Advantage for background screening.
Must be called before initiating a screening. Returns the FA candidate ID needed for screening.`,

	inputSchema: z.object({
		givenName: z.string().describe("Candidate first name"),
		familyName: z.string().describe("Candidate last name"),
		email: z.string().email().optional().describe("Candidate email"),
		clientReferenceId: z
			.string()
			.describe("Our internal reference (profile ID)"),
		dateOfBirth: z
			.string()
			.optional()
			.describe("Date of birth (YYYY-MM-DD)"),
	}),

	execute: async (input) => {
		try {
			const client = getFAClient();
			const candidate = await client.createCandidate(input);
			return { data: candidate };
		} catch (error) {
			return {
				error: `Failed to create candidate: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
