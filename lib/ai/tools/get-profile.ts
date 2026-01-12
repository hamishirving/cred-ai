import { tool } from "ai";
import { z } from "zod";
import {
	getProfileByEmail,
	getProfileById,
	loadProfiles,
	isApiError,
} from "@/lib/api/credentially-client";
import type { ProfileDto } from "@/lib/api/types";

export const getProfile = tool({
	description: `Look up an employee profile from the Credentially system.
Use this tool when the user asks about:
- Finding an employee by email, profile ID, or name
- Getting employee details (role, compliance status, custom fields)
- Checking someone's job position or work information
- Looking up profile information

Provide either an email address OR a profile ID OR a name. Email search is most common.`,

	inputSchema: z.object({
		email: z
			.string()
			.email()
			.optional()
			.describe("Email address of the employee to look up"),
		profileId: z
			.string()
			.optional()
			.describe("Profile ID if known (alternative to email)"),
		name: z
			.string()
			.min(1)
			.optional()
			.describe(
				"Name to search for (partial matches ok). Returns 1 profile or a list of matching profiles to disambiguate.",
			),
	}),

	execute: async ({
		email,
		profileId,
		name,
	}): Promise<
		| { data: ProfileDto }
		| { matches: ProfileDto[]; total: number; query: string }
		| { error: string }
	> => {
		console.log("[getProfile] Input:", { email, profileId, name });

		// Validate input
		const providedCount = [email, profileId, name].filter(Boolean).length;
		if (providedCount === 0) {
			return {
				error: "Please provide either an email address, profile ID, or name",
			};
		}

		if (providedCount > 1) {
			return {
				error: "Please provide only one of: email, profile ID, or name",
			};
		}

		// Perform lookup
		let result;
		if (email) {
			console.log(`[getProfile] Looking up by email: ${email}`);
			result = await getProfileByEmail(email);
		} else if (profileId) {
			console.log(`[getProfile] Looking up by ID: ${profileId}`);
			result = await getProfileById(profileId);
		} else if (name) {
			const page = await loadProfiles({
				page: 0,
				size: 10,
				filter: { nameOrEmail: name },
			});

			if (isApiError(page)) {
				return { error: page.error };
			}

			const matchesFromApi = page.content ?? [];
			const queryTokens = name
				.trim()
				.toLowerCase()
				.split(/\s+/)
				.filter(Boolean);
			const matches =
				queryTokens.length === 0
					? matchesFromApi
					: matchesFromApi.filter((p) => {
							const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
							for (const token of queryTokens) {
								if (!fullName.includes(token)) return false;
							}
							return true;
						});
			if (matches.length === 0) {
				return { error: `No profiles found matching "${name}"` };
			}

			if (matches.length === 1) {
				return { data: matches[0] };
			}

			return {
				matches,
				total: page.totalElements,
				query: name,
			};
		} else {
			return { error: "Either email, profileId, or name must be provided" };
		}

		// Check for errors
		if (isApiError(result)) {
			return { error: result.error };
		}

		// Return successful result
		return { data: result };
	},
});
