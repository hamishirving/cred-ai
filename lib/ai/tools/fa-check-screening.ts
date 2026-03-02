/**
 * FA Check Screening Tool
 *
 * Checks the status of a First Advantage background screening
 * and updates the persistent record in fa_screenings.
 */

import { tool } from "ai";
import { z } from "zod";
import { getFAClient } from "@/lib/api/first-advantage/client";
import { upsertFAScreening } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { faScreenings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const faCheckScreening = tool({
	description: `Check the status of a First Advantage background screening.
Returns overall status and per-component breakdown (criminal, drug test, etc.).
Updates the persistent screening record in the database.
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

			// Look up the existing DB record to get org/profile context for upsert
			const [existing] = await db
				.select()
				.from(faScreenings)
				.where(eq(faScreenings.faScreeningId, input.screeningId))
				.limit(1);

			if (existing) {
				await upsertFAScreening({
					organisationId: existing.organisationId,
					profileId: existing.profileId,
					placementId: existing.placementId,
					faScreeningId: screening.id,
					faCandidateId: screening.candidateId,
					faPackageId: screening.packageId,
					status: screening.status as "Pending" | "In Progress" | "Complete",
					result: screening.result as "Pending" | "Clear" | "Consider" | "Adverse",
					reportItems: screening.reportItems,
					portalUrl: screening.links?.admin?.web ?? null,
					submittedAt: new Date(screening.submittedAt),
					estimatedCompletionAt: screening.estimatedCompletionTime
						? new Date(screening.estimatedCompletionTime)
						: null,
					rawResponse: screening as unknown as Record<string, unknown>,
				});
			}

			return { data: screening };
		} catch (error) {
			return {
				error: `Failed to check screening: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
