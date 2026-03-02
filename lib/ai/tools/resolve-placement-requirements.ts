/**
 * Resolve Placement Requirements Tool
 *
 * AI SDK tool wrapper around resolvePlacementRequirements().
 * Returns the full set of compliance requirements for a placement context.
 */

import { tool } from "ai";
import { z } from "zod";
import { resolvePlacementRequirements } from "@/lib/compliance/resolve-requirements";
import type { RequirementGroup } from "@/lib/compliance/resolve-requirements";

export const resolvePlacementRequirementsTool = tool({
	description: `Resolve all compliance requirements for a US healthcare placement.
Walks the package hierarchy (federal core -> role -> state -> facility + conditional OIG/SAM)
to build the full requirement set.

Use this tool when:
- A user asks what compliance items are needed for a specific placement
- You need to determine FA-handled vs agency-handled requirements
- You need to check if OIG/SAM exclusion checks are required for a deal

Requires organisationId and placement context (roleSlug, jurisdiction, facilityType).`,

	inputSchema: z.object({
		organisationId: z
			.string()
			.uuid()
			.describe("The organisation ID (TravelNurse Pro)"),
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
		roleSlug,
		jurisdiction,
		facilityType,
		isLapseDeal,
		facilityRequiresOigSam,
	}): Promise<{ data: RequirementGroup[] } | { error: string }> => {
		console.log(
			"[resolvePlacementRequirements] Resolving for:",
			{ roleSlug, jurisdiction, facilityType, isLapseDeal },
		);

		try {
			const groups = await resolvePlacementRequirements(organisationId, {
				roleSlug,
				jurisdiction,
				facilityType,
				isLapseDeal,
				facilityRequiresOigSam,
			});

			return { data: groups };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[resolvePlacementRequirements] Error:", message);
			return { error: message };
		}
	},
});
