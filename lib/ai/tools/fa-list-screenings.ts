/**
 * FA List Screenings Tool
 *
 * Queries the fa_screenings table to find screening records.
 * Supports lookup by profileId (preferred) or candidateName (via profile search).
 */

import { tool } from "ai";
import { z } from "zod";
import { desc, eq, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { faScreenings, profiles } from "@/lib/db/schema";
import { getFAScreeningsByProfileId } from "@/lib/db/queries";

export const faListScreenings = tool({
	description: `Search for First Advantage screenings for a candidate.
Provide profileId for a direct lookup, or candidateName to search by name.
Returns all screening records from the database, ordered by most recent first.`,

	inputSchema: z.object({
		profileId: z
			.string()
			.optional()
			.describe("Candidate profile UUID — preferred, fastest lookup"),
		candidateName: z
			.string()
			.optional()
			.describe("Candidate name to search for (falls back to profile name match)"),
	}),

	execute: async (input) => {
		try {
			// Direct lookup by profileId
			if (input.profileId) {
				const screenings = await getFAScreeningsByProfileId({
					profileId: input.profileId,
				});
				if (screenings.length > 0) {
					return { data: screenings };
				}
				return { data: null, message: "No screenings found for this profile" };
			}

			// Fallback: search by candidate name via profiles table
			if (input.candidateName) {
				const nameParts = input.candidateName.trim().split(/\s+/);
				const firstName = nameParts[0] ?? "";
				const lastName = nameParts.slice(1).join(" ") || "";

				// Find matching profiles
				const matchingProfiles = await db
					.select({ id: profiles.id })
					.from(profiles)
					.where(
						or(
							ilike(profiles.firstName, `%${firstName}%`),
							ilike(profiles.lastName, `%${lastName}%`),
						),
					)
					.limit(10);

				if (matchingProfiles.length === 0) {
					return { data: null, message: "No candidate profiles found matching that name" };
				}

				// Get screenings for all matching profiles
				const profileIds = matchingProfiles.map((p) => p.id);
				const screenings = await db
					.select()
					.from(faScreenings)
					.where(
						or(...profileIds.map((pid) => eq(faScreenings.profileId, pid))),
					)
					.orderBy(desc(faScreenings.createdAt));

				if (screenings.length > 0) {
					return { data: screenings };
				}
				return { data: null, message: "No screenings found for this candidate in First Advantage" };
			}

			return { error: "Provide either profileId or candidateName" };
		} catch (error) {
			return {
				error: `Failed to list screenings: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
