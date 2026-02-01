/**
 * Search Local Candidates Tool
 *
 * Searches the seeded local database for candidates by name or email.
 * Returns a list of matching candidates with basic info so the agent
 * can select the right one without needing a UUID upfront.
 */

import { tool } from "ai";
import { z } from "zod";
import { and, eq, ilike, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { profiles } from "@/lib/db/schema";

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

export const searchLocalCandidates = tool({
	description: `Search for candidates in the local database by name or email.
Returns a list of matching candidates with their profile ID, name, and email.
Use this to find a candidate before loading their full profile or compliance data.
If no search term is provided, returns all candidates for the organisation.`,

	inputSchema: z.object({
		organisationId: z
			.string()
			.uuid()
			.describe("The organisation ID to search within"),
		search: z
			.string()
			.optional()
			.describe("Name or email to search for (partial match). Omit to list all candidates."),
	}),

	execute: async ({
		organisationId,
		search,
	}): Promise<
		| {
				data: Array<{
					profileId: string;
					firstName: string;
					lastName: string;
					email: string;
				}>;
		  }
		| { error: string }
	> => {
		console.log("[searchLocalCandidates] Searching:", { organisationId, search });

		const conditions = [eq(profiles.organisationId, organisationId)];

		if (search) {
			const pattern = `%${search}%`;
			conditions.push(
				or(
					ilike(profiles.firstName, pattern),
					ilike(profiles.lastName, pattern),
					ilike(profiles.email, pattern),
				)!,
			);
		}

		const results = await db
			.select({
				id: profiles.id,
				firstName: profiles.firstName,
				lastName: profiles.lastName,
				email: profiles.email,
			})
			.from(profiles)
			.where(and(...conditions))
			.limit(20);

		return {
			data: results.map((r) => ({
				profileId: r.id,
				firstName: r.firstName,
				lastName: r.lastName,
				email: r.email,
			})),
		};
	},
});
