import { tool } from "ai";
import { z } from "zod";

const emailSchema = z.object({
	to: z.string().describe("Recipient email address"),
	subject: z
		.string()
		.describe("Email subject line - keep it concise and clear"),
	body: z
		.string()
		.describe("Email body content - keep it brief and professional"),
	cc: z.string().optional().describe("CC recipients (comma-separated)"),
});

export type EmailDraft = z.infer<typeof emailSchema>;

export const draftEmail = tool({
	description: `Draft an email based on the user's request. Use this when the user asks to:
- Write or draft an email
- Send a message to someone
- Compose correspondence
- Follow up with someone via email

Keep emails concise and professional. Avoid unnecessary pleasantries and get to the point.`,

	inputSchema: emailSchema,

	execute: (input): EmailDraft => {
		// The AI generates the email, we just pass it through
		return {
			to: input.to,
			subject: input.subject,
			body: input.body,
			cc: input.cc,
		};
	},
});
