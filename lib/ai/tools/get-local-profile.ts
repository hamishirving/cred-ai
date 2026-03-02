/**
 * Get Local Profile Tool
 *
 * Queries the seeded local database for candidate profile data.
 * Use this instead of getProfile (which hits the Credentially API)
 * when working with seeded demo data.
 */

import { tool } from "ai";
import { z } from "zod";
import { getCandidateContext } from "@/lib/ai/agents/compliance-companion/queries";

export const getLocalProfile = tool({
	description: `Look up a candidate profile from the local database (seeded demo data).
Use this tool to get candidate details including name, email, role, placement, and onboarding status.
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
	}) => {
		console.log("[getLocalProfile] Looking up profile:", profileId);

		const context = await getCandidateContext(profileId, organisationId);

		if (!context) {
			return { error: `Profile ${profileId} not found in organisation ${organisationId}` };
		}

		// Also fetch the full profile record for fields not in CandidateContext
		const { getProfileById } = await import("@/lib/db/queries");
		const fullProfile = await getProfileById({ id: profileId });

		return {
			data: {
				profileId: context.profileId,
				firstName: context.firstName,
				lastName: context.lastName,
				email: context.email,
				organisationId,
				phone: fullProfile?.phone ?? null,
				dateOfBirth: fullProfile?.dateOfBirth?.toISOString().split("T")[0] ?? null,
				sex: fullProfile?.sex ?? null,
				nationalId: fullProfile?.nationalId ?? null,
				address: fullProfile?.address ?? null,
				professionalRegistration: fullProfile?.professionalRegistration ?? null,
				role: context.role,
				placement: context.placement,
				daysInOnboarding: context.daysInOnboarding,
				daysSinceLastActivity: context.daysSinceLastActivity,
			},
		};
	},
});
