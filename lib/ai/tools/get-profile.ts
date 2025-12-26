import { tool } from "ai";
import { z } from "zod";
import {
	getProfileByEmail,
	getProfileById,
	isApiError,
} from "@/lib/api/credentially-client";
import type { ProfileDto } from "@/lib/api/types";

export const getProfile = tool({
	description: `Look up an employee profile from the Credentially system.
Use this tool when the user asks about:
- Finding an employee by email or name
- Getting employee details (role, compliance status, custom fields)
- Checking someone's job position or work information
- Looking up profile information

Provide either an email address OR a profile ID. Email search is most common.`,

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
	}),

	execute: async ({
		email,
		profileId,
	}): Promise<{ data: ProfileDto } | { error: string }> => {
		console.log("[getProfile] Input:", { email, profileId });

		// Validate input
		if (!email && !profileId) {
			return {
				error: "Please provide either an email address or profile ID",
			};
		}

		if (email && profileId) {
			return {
				error: "Please provide either email OR profile ID, not both",
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
		} else {
			return { error: "Either email or profileId must be provided" };
		}

		// Check for errors
		if (isApiError(result)) {
			return { error: result.error };
		}

		// Return successful result
		return { data: result };
	},
});
