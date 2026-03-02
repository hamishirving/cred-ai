/**
 * Search Local Candidates Tool
 *
 * Searches the seeded local database for candidates by name or email.
 * Joins users → org_memberships to search across the data model.
 * Returns matching candidates with basic info so the agent
 * can select the right one without needing a UUID upfront.
 */

import { tool } from "ai";
import { z } from "zod";
import { and, eq, ilike, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, orgMemberships } from "@/lib/db/schema";

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

export const searchLocalCandidates = tool({
	description: `Search for candidates in the local database by name or email.
Returns a list of matching candidates with their profile ID, user ID, name, and email.
Use this to find a candidate before loading their full profile or compliance data.
If no search term is provided, returns all candidates for the organisation.`,

	inputSchema: z.object({
		organisationId: z
			.string()
			.uuid()
			.optional()
			.describe("Organisation ID to search within. Omit to search across all organisations."),
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
					userId: string;
					profileId: string | null;
					firstName: string;
					lastName: string;
					email: string;
					organisationId: string;
				}>;
		  }
		| { error: string }
	> => {
		console.log("[searchLocalCandidates] Searching:", { organisationId, search });

		const conditions: ReturnType<typeof eq>[] = [];

		if (organisationId) {
			conditions.push(eq(orgMemberships.organisationId, organisationId));
		}

		if (search) {
			// Split search into words so "Ashlyn Torres" matches firstName=Ashlyn OR lastName=Torres
			const words = search.trim().split(/\s+/).filter(Boolean);
			const wordConditions = words.flatMap((word) => {
				const pattern = `%${word}%`;
				return [
					ilike(users.firstName, pattern),
					ilike(users.lastName, pattern),
					ilike(users.email, pattern),
				];
			});
			if (wordConditions.length > 0) {
				conditions.push(or(...wordConditions)!);
			}
		}

		const query = db
			.select({
				userId: users.id,
				profileId: orgMemberships.profileId,
				firstName: users.firstName,
				lastName: users.lastName,
				email: users.email,
				organisationId: orgMemberships.organisationId,
			})
			.from(orgMemberships)
			.innerJoin(users, eq(orgMemberships.userId, users.id));

		const results = await (conditions.length > 0
			? query.where(and(...conditions))
			: query
		).limit(20);

		return {
			data: results.map((r) => ({
				userId: r.userId,
				profileId: r.profileId,
				firstName: r.firstName,
				lastName: r.lastName,
				email: r.email,
				organisationId: r.organisationId,
			})),
		};
	},
});
