/**
 * FA Get Report Tool
 *
 * Gets a report link for a completed First Advantage screening.
 */

import { tool } from "ai";
import { z } from "zod";
import { getFAClient } from "@/lib/api/first-advantage/client";

export const faGetReport = tool({
	description: `Get a report link for a completed First Advantage screening.
Returns a URL to the full screening report. Only works for completed screenings.`,

	inputSchema: z.object({
		screeningId: z.string().describe("FA screening ID"),
	}),

	execute: async (input) => {
		try {
			const client = getFAClient();
			const report = await client.getReportLink(input.screeningId);
			return { data: report };
		} catch (error) {
			return {
				error: `Failed to get report: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
