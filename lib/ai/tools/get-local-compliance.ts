/**
 * Get Local Compliance Tool
 *
 * Queries the seeded local database for compliance status.
 * Use this instead of getCompliancePackages (which hits the Credentially API)
 * when working with seeded demo data.
 */

import { tool } from "ai";
import { z } from "zod";
import { getCandidateContext } from "@/lib/ai/agents/compliance-companion/queries";

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

	execute: async ({
		profileId,
		organisationId,
	}): Promise<
		| {
				data: {
					completed: number;
					total: number;
					percentage: number;
					items: Array<{
						elementId: string;
						elementName: string;
						elementSlug: string;
						status: string;
						blockedBy: string;
						blockingReason: string;
						actionRequired?: string;
						expiresAt?: Date;
					}>;
				};
		  }
		| { error: string }
	> => {
		console.log("[getLocalCompliance] Getting compliance for profile:", profileId);

		const context = await getCandidateContext(profileId, organisationId);

		if (!context) {
			return { error: `Profile ${profileId} not found in organisation ${organisationId}` };
		}

		return {
			data: {
				completed: context.compliance.completed,
				total: context.compliance.total,
				percentage: context.compliance.percentage,
				items: context.compliance.items,
			},
		};
	},
});
