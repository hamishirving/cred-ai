import { tool } from "ai";
import { cookies } from "next/headers";
import { z } from "zod";
import { logSmsActivity } from "@/lib/db/queries";
import { isValidPhoneNumber, sendTwilioSms } from "@/lib/sms/twilio-client";

const SMS_TEST_OVERRIDE_TO = process.env.SMS_TEST_OVERRIDE_TO?.trim();

const smsSchema = z.object({
	recipientName: z.string().describe("Recipient's first name"),
	recipientPhone: z
		.string()
		.describe("Recipient phone number in E.164 format (e.g. +447780781414)"),
	body: z
		.string()
		.min(1)
		.max(640)
		.describe("SMS body content. Keep concise and actionable."),
	reasoning: z
		.string()
		.optional()
		.describe("Brief explanation of channel choice (for audit trail)"),
	profileId: z
		.string()
		.uuid()
		.optional()
		.describe("Profile ID of the recipient (for activity logging)"),
	organisationId: z
		.string()
		.uuid()
		.optional()
		.describe(
			"Organisation ID (required when called outside browser context, e.g. from webhooks)",
		),
});

export const sendSms = tool({
	description: `Send an SMS via Twilio. Use this when the user asks to:
- Send a text message
- Send a short, urgent update
- Nudge a candidate with one clear action

Use SMS for short, time-sensitive nudges. For detailed multi-step guidance, use draftEmail.`,

	inputSchema: smsSchema,

	execute: async (input) => {
		const targetPhone = SMS_TEST_OVERRIDE_TO || input.recipientPhone;
		const usingOverride = Boolean(
			SMS_TEST_OVERRIDE_TO && SMS_TEST_OVERRIDE_TO !== input.recipientPhone,
		);
		console.log("[sendSms] Sending SMS:", {
			to: targetPhone,
			usingOverride,
		});

		if (!isValidPhoneNumber(targetPhone)) {
			return {
				error: `Invalid phone number format: ${targetPhone}. Must be E.164 format.`,
				data: {
					recipientName: input.recipientName,
					recipientPhone: targetPhone,
					requestedRecipientPhone: input.recipientPhone,
					wasOverridden: usingOverride,
					body: input.body,
					status: "failed" as const,
				},
			};
		}

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
			const result = await sendTwilioSms({
				to: targetPhone,
				body: input.body,
			});
			// Without status webhooks, treat successful API acceptance as "sent"
			// so UI doesn't show Twilio's transient "queued" state.
			const deliveryStatus = "sent";

			// Log SMS as activity if we have org context and a profile ID
			if (organisationId && input.profileId) {
				try {
					await logSmsActivity({
						organisationId,
						profileId: input.profileId,
						recipientPhone: targetPhone,
						recipientName: input.recipientName,
						body: input.body,
						twilioSid: result.sid,
						status: deliveryStatus,
						reasoning: input.reasoning,
					});
				} catch (logError) {
					console.warn("[sendSms] Failed to log sent SMS activity:", logError);
				}
			}

			return {
				data: {
					recipientName: input.recipientName,
					recipientPhone: targetPhone,
					requestedRecipientPhone: input.recipientPhone,
						wasOverridden: usingOverride,
						body: input.body,
						status: deliveryStatus,
						sid: result.sid,
						from: result.from,
						to: result.to,
				},
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to send SMS";
			console.error("[sendSms] Error:", errorMessage);

			// Log failed SMS if we have org context and a profile ID
			if (organisationId && input.profileId) {
				try {
					await logSmsActivity({
						organisationId,
						profileId: input.profileId,
						recipientPhone: targetPhone,
						recipientName: input.recipientName,
						body: input.body,
						status: "failed",
						errorMessage,
						reasoning: input.reasoning,
					});
				} catch (logError) {
					console.warn("[sendSms] Failed to log SMS activity:", logError);
				}
			}

			return {
				error: `Failed to send SMS: ${errorMessage}`,
				data: {
					recipientName: input.recipientName,
					recipientPhone: targetPhone,
					requestedRecipientPhone: input.recipientPhone,
					wasOverridden: usingOverride,
					body: input.body,
					status: "failed" as const,
				},
			};
		}
	},
});
