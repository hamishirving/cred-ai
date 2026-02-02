import { tool } from "ai";
import { z } from "zod";
import { cookies } from "next/headers";
import * as postmark from "postmark";
import { logEmailActivity } from "@/lib/db/queries";

/**
 * Strip markdown formatting from text for plain-text emails.
 * Converts markdown links to "text (url)" format and removes
 * bold/italic/heading syntax.
 */
function stripMarkdown(text: string): string {
	return text
		// Convert [text](url) links to "text (url)"
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
		// Remove bold **text** or __text__
		.replace(/(\*\*|__)(.*?)\1/g, "$2")
		// Remove italic *text* or _text_ (but not mid-word underscores)
		.replace(/(\*|_)(.*?)\1/g, "$2")
		// Remove heading markers
		.replace(/^#{1,6}\s+/gm, "")
		// Remove horizontal rules
		.replace(/^[-*_]{3,}\s*$/gm, "")
		// Clean up bullet markers to plain dashes
		.replace(/^\*\s+/gm, "- ");
}

/**
 * Convert markdown body to simple HTML for email rendering.
 * Handles links, bold, italic, paragraphs, and line breaks.
 */
function markdownToEmailHtml(text: string): string {
	const html = text
		// Remove heading markers (before escaping)
		.replace(/^#{1,6}\s+/gm, "")
		// Remove horizontal rules
		.replace(/^[-*_]{3,}\s*$/gm, "")
		// Clean up bullet markers to plain dashes
		.replace(/^\*\s+/gm, "- ")
		// Escape HTML entities
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		// Convert markdown links to <a> tags
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
		// Convert bold
		.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>")
		// Convert italic
		.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>")
		// Convert line breaks to <br>
		.replace(/\n/g, "<br>");

	return html;
}

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
	organisationId: z
		.string()
		.uuid()
		.optional()
		.describe("Organisation ID (required when called outside browser context, e.g. from webhooks)"),
});

export type EmailDraft = z.infer<typeof emailSchema>;

export const draftEmail = tool({
	description: `Draft and send an email. Use this when the user asks to:
- Write or draft an email
- Send a message to someone
- Compose correspondence
- Follow up with someone via email

Keep emails concise and professional. Avoid unnecessary pleasantries and get to the point.

IMPORTANT: When asking someone to upload documents, complete tasks, or take any action in the system, you MUST include this portal link in the body: [Access your portal](https://portal.credentially.io)`,

	inputSchema: emailSchema,

	execute: async (input) => {
		console.log("[draftEmail] Drafting email:", { to: input.recipientEmail, subject: input.subject });

		// Resolve org ID: prefer explicit param, fall back to cookie
		let organisationId = input.organisationId;
		if (!organisationId) {
			try {
				const cookieStore = await cookies();
				organisationId = cookieStore.get("selectedOrgId")?.value;
			} catch {
				// No cookie access (e.g. webhook context) — that's fine
			}
		}

		try {
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

			// Send via Postmark if API key is configured
			let status: "sent" | "drafted" = "drafted";
			if (process.env.POSTMARK_SERVER_TOKEN) {
				try {
					const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);
					await client.sendEmail({
						From: process.env.POSTMARK_FROM_EMAIL || "compliance@credentially.io",
						To: input.recipientEmail,
						Subject: input.subject,
						TextBody: stripMarkdown(input.body),
						HtmlBody: markdownToEmailHtml(input.body),
						...(input.cc ? { Cc: input.cc } : {}),
						MessageStream: "outbound",
					});
					status = "sent";
					console.log("[draftEmail] Email sent via Postmark to:", input.recipientEmail);
				} catch (sendError) {
					console.error("[draftEmail] Postmark send failed, email drafted only:", sendError);
				}
			}

			return {
				data: {
					subject: input.subject,
					body: input.body,
					recipientName: input.recipientName,
					recipientEmail: input.recipientEmail,
					status,
				},
			};
		} catch (error) {
			console.error("[draftEmail] Error:", error);
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
