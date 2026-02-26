/**
 * Get Local Compliance Tool
 *
 * Queries the seeded local database for compliance status.
 * If the candidate has an active placement, resolves requirements per placement
 * context (federal → state → role → facility) using the same engine as the
 * placement page. Falls back to the generic candidate context otherwise.
 */

import { tool } from "ai";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getCandidateContext } from "@/lib/ai/agents/compliance-companion/queries";
import { checkPlacementCompliance } from "@/lib/compliance/resolve-requirements";
import { db } from "@/lib/db";
import { placements, roles, workNodes, workNodeTypes } from "@/lib/db/schema";

export const getLocalCompliance = tool({
	description: `Get compliance status for a candidate from the local database (seeded demo data).
Returns compliance items with blocking analysis — what's complete, what's pending, and who's responsible for the next action.
Requires both profileId and organisationId.`,

	inputSchema: z.object({
		profileId: z
			.string()
			.uuid()
			.describe("The profile ID of the candidate"),
		organisationId: z
			.string()
			.uuid()
			.describe("The organisation ID the candidate belongs to"),
	}),

	execute: async ({ profileId, organisationId }) => {
		console.log(
			"[getLocalCompliance] Getting compliance for profile:",
			profileId,
		);

		// Try to find an active placement for this candidate
		const [placement] = await db
			.select({
				id: placements.id,
				roleSlug: roles.slug,
				jurisdiction: workNodes.jurisdiction,
				typeId: workNodes.typeId,
			})
			.from(placements)
			.innerJoin(roles, eq(roles.id, placements.roleId))
			.innerJoin(workNodes, eq(workNodes.id, placements.workNodeId))
			.where(
				and(
					eq(placements.profileId, profileId),
					eq(placements.organisationId, organisationId),
					inArray(placements.status, ["pending", "active", "onboarding", "compliance"]),
				),
			)
			.limit(1);

		// If they have a placement, use the placement compliance engine
		if (placement) {
			let facilityType = "hospital";
			if (placement.typeId) {
				const [nodeType] = await db
					.select({ name: workNodeTypes.name })
					.from(workNodeTypes)
					.where(eq(workNodeTypes.id, placement.typeId))
					.limit(1);
				if (nodeType) {
					facilityType = nodeType.name.toLowerCase();
				}
			}

			const result = await checkPlacementCompliance(
				organisationId,
				profileId,
				{
					roleSlug: placement.roleSlug,
					jurisdiction: placement.jurisdiction || "florida",
					facilityType,
				},
			);

			return {
				data: {
					completed: result.summary.met,
					total: result.summary.total,
					percentage: result.summary.percentage,
					items: result.items.map((item) => ({
						elementId: item.slug,
						elementName: item.name,
						elementSlug: item.slug,
						status: item.status,
						packageName: item.packageSlug
							.replace(/-/g, " ")
							.replace(/^\w/, (c) => c.toUpperCase())
							.replace(/\b(us|uk)\b/gi, (m) => m.toUpperCase()),
						carryForward: item.carryForward,
						faHandled: item.faHandled,
					})),
				},
			};
		}

		// No placement — fall back to generic candidate context
		const context = await getCandidateContext(profileId, organisationId);

		if (!context) {
			return {
				error: `Profile ${profileId} not found in organisation ${organisationId}`,
			};
		}

		return {
			data: {
				completed: context.compliance.completed,
				total: context.compliance.total,
				percentage: context.compliance.percentage,
				items: context.compliance.items.map((item) => ({
					...item,
					packageName: null,
					carryForward: false,
					faHandled: false,
				})),
			},
		};
	},
});
