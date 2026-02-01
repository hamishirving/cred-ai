import { tool } from "ai";
import { z } from "zod";
import { cookies } from "next/headers";
import { logEmailActivity } from "@/lib/db/queries";

const emailSchema = z.object({
	recipientName: z.string().describe("Recipient's first name"),
	recipientEmail: z.string().email().describe("Recipient email address"),
	subject: z
		.string()
		.describe("Email subject line - keep it concise and clear"),
	body: z
		.string()
		.describe("Email body content - keep it brief and professional"),
	reasoning: z
		.string()
		.optional()
		.describe("Brief explanation of composition choices (for audit trail)"),
	cc: z.string().optional().describe("CC recipients (comma-separated)"),
	profileId: z
		.string()
		.uuid()
		.optional()
		.describe("Profile ID of the recipient (for activity logging)"),
});

export type EmailDraft = z.infer<typeof emailSchema>;

export const draftEmail = tool({
	description: `Draft an email based on the user's request. Use this when the user asks to:
- Write or draft an email
- Send a message to someone
- Compose correspondence
- Follow up with someone via email

Keep emails concise and professional. Avoid unnecessary pleasantries and get to the point.

IMPORTANT: When asking someone to upload documents, complete tasks, or take any action in the system, you MUST include this portal link in the body: [Access your portal](https://portal.credentially.io)`,

	inputSchema: emailSchema,

	execute: async (input) => {
		console.log("[draftEmail] Drafting email:", { to: input.recipientEmail, subject: input.subject });

		try {
			// Get org ID for activity logging
			const cookieStore = await cookies();
			const organisationId = cookieStore.get("selectedOrgId")?.value;

			// Log email as activity if we have org context and a profile ID
			if (organisationId && input.profileId) {
				await logEmailActivity({
					organisationId,
					profileId: input.profileId,
					subject: input.subject,
					body: input.body,
					recipientEmail: input.recipientEmail,
					recipientName: input.recipientName,
					reasoning: input.reasoning,
				});
			}

			return {
				data: {
					subject: input.subject,
					body: input.body,
					recipientName: input.recipientName,
					recipientEmail: input.recipientEmail,
					status: "drafted" as const,
				},
			};
		} catch (error) {
			console.error("[draftEmail] Error logging activity:", error);
			// Still return the draft even if logging fails
			return {
				data: {
					subject: input.subject,
					body: input.body,
					recipientName: input.recipientName,
					recipientEmail: input.recipientEmail,
					status: "drafted" as const,
				},
			};
		}
	},
});
