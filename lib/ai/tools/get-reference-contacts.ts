import { tool } from "ai";
import { z } from "zod";
import { getReferenceContactsForProfile } from "@/lib/db/queries";

/**
 * Tool for retrieving reference contacts for a candidate.
 *
 * Returns all reference contacts (referees) associated with a profile,
 * including their status and any captured data from previous checks.
 */
export const getReferenceContactsTool = tool({
	description: `Get reference contacts (referees) for a candidate profile.
Use this to find people who can provide employment references for a candidate.
Returns contact details, relationship, employment dates, and check status.`,

	inputSchema: z.object({
		profileId: z.string().uuid().describe("Profile ID of the candidate"),
		organisationId: z.string().uuid().describe("Organisation ID"),
	}),

	execute: async ({ profileId, organisationId }) => {
		console.log("[getReferenceContacts] Loading contacts:", { profileId, organisationId });

		try {
			const contacts = await getReferenceContactsForProfile({ profileId, organisationId });
			return { data: contacts };
		} catch (error) {
			console.error("[getReferenceContacts] Error:", error);
			return { error: "Failed to load reference contacts." };
		}
	},
});
