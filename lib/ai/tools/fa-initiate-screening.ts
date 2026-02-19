/**
 * FA Initiate Screening Tool
 *
 * Initiates a background screening through First Advantage.
 */

import { tool } from "ai";
import { z } from "zod";
import { getFAClient } from "@/lib/api/first-advantage/client";

export const faInitiateScreening = tool({
	description: `Initiate a background screening through First Advantage.
Requires a candidate ID (from faCreateCandidate) and a package ID (from faSelectPackage).
Returns the screening ID for status tracking.`,

	inputSchema: z.object({
		candidateId: z
			.string()
			.describe("FA candidate ID from faCreateCandidate"),
		packageId: z
			.string()
			.describe("FA package ID from faSelectPackage"),
	}),

	execute: async (input) => {
		try {
			const client = getFAClient();
			const screening = await client.initiateScreening(input);
			return { data: screening };
		} catch (error) {
			return {
				error: `Failed to initiate screening: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
