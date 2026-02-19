/**
 * Get Placement Compliance Tool
 *
 * AI SDK tool wrapper around checkPlacementCompliance().
 * Checks a candidate's evidence against resolved placement requirements.
 */

import { tool } from "ai";
import { z } from "zod";
import { checkPlacementCompliance } from "@/lib/compliance/resolve-requirements";

export const getPlacementComplianceTool = tool({
	description: `Check a candidate's compliance status against placement requirements.
Resolves all requirements for the placement context, then checks the candidate's
evidence against them. Returns each item's status (met, expiring, pending, missing)
with carry-forward tagging and FA-handled flags.

Use this tool when:
- You need to see a candidate's compliance gap for a specific placement
- You need to identify which items First Advantage needs to process
- You need to determine what carries forward from a previous assignment
- A user asks about a candidate's readiness for a placement

Requires organisationId, profileId, and placement context.`,

	inputSchema: z.object({
		organisationId: z
			.string()
			.uuid()
			.describe("The organisation ID"),
		profileId: z
			.string()
			.uuid()
			.describe("The candidate's profile ID"),
		roleSlug: z
			.string()
			.describe("Role slug (e.g. travel-rn, travel-icu-rn)"),
		jurisdiction: z
			.string()
			.describe("State/jurisdiction (e.g. florida, california, texas)"),
		facilityType: z
			.string()
			.describe("Facility type (e.g. hospital)"),
		isLapseDeal: z
			.boolean()
			.optional()
			.describe("Whether this is a lapse deal (inactive > 90 days). Triggers OIG/SAM."),
		facilityRequiresOigSam: z
			.boolean()
			.optional()
			.describe("Whether the facility requires OIG/SAM exclusion checks"),
	}),

	execute: async ({
		organisationId,
		profileId,
		roleSlug,
		jurisdiction,
		facilityType,
		isLapseDeal,
		facilityRequiresOigSam,
	}) => {
		console.log(
			"[getPlacementCompliance] Checking compliance for:",
			{ profileId, roleSlug, jurisdiction, facilityType },
		);

		try {
			const result = await checkPlacementCompliance(
				organisationId,
				profileId,
				{
					roleSlug,
					jurisdiction,
					facilityType,
					isLapseDeal,
					facilityRequiresOigSam,
				},
			);

			return { data: result };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[getPlacementCompliance] Error:", message);
			return { error: message };
		}
	},
});
