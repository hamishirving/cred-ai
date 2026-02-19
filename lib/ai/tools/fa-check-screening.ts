/**
 * FA Check Screening Tool
 *
 * Checks the status of a First Advantage background screening.
 */

import { tool } from "ai";
import { z } from "zod";
import { getFAClient } from "@/lib/api/first-advantage/client";

export const faCheckScreening = tool({
	description: `Check the status of a First Advantage background screening.
Returns overall status and per-component breakdown (criminal, drug test, etc.).
Poll this to track screening progress.`,

	inputSchema: z.object({
		screeningId: z
			.string()
			.describe("FA screening ID from faInitiateScreening"),
	}),

	execute: async (input) => {
		try {
			const client = getFAClient();
			const screening = await client.getScreening(input.screeningId);
			return { data: screening };
		} catch (error) {
			return {
				error: `Failed to check screening: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
