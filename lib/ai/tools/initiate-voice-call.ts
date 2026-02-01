import { tool } from "ai";
import { z } from "zod";
import { isValidPhoneNumber, initiateCall } from "@/lib/voice/vapi-client";
import { getTemplate } from "@/lib/voice/templates";
import { createVoiceCall } from "@/lib/db/queries";
import { auth } from "@/lib/auth";

/**
 * Tool for initiating a VAPI voice call.
 *
 * Validates phone number, looks up template, creates a DB record,
 * and initiates the call via the VAPI client.
 */
export const initiateVoiceCallTool = tool({
	description: `Initiate an outbound voice call via VAPI.
Use this to call a reference contact for employment verification or reference checks.
The call will be recorded and transcribed. Captured data will be available via getCallStatus.`,

	inputSchema: z.object({
		phoneNumber: z
			.string()
			.describe("Phone number in E.164 format (e.g. +441234567890)"),
		recipientName: z.string().describe("Name of the person being called"),
		templateSlug: z
			.string()
			.describe("Voice template slug (e.g. 'reference-check')"),
		context: z
			.record(z.string())
			.describe("Context variables for the call template (candidateName, refereeName, etc.)"),
	}),

	execute: async ({ phoneNumber, recipientName, templateSlug, context }) => {
		console.log("[initiateVoiceCall] Starting call:", {
			phoneNumber,
			recipientName,
			templateSlug,
		});

		try {
			// Validate phone number
			if (!isValidPhoneNumber(phoneNumber)) {
				return { error: `Invalid phone number format: ${phoneNumber}. Must be E.164 format.` };
			}

			// Look up template
			const template = getTemplate(templateSlug);
			if (!template) {
				return { error: `Unknown voice template: ${templateSlug}` };
			}

			// Get current user for DB record
			const session = await auth();
			const userId = session?.user?.id ?? "system";

			// Create DB record
			const voiceCall = await createVoiceCall({
				userId,
				templateSlug,
				phoneNumber,
				recipientName,
				context,
			});

			// Initiate VAPI call
			const result = await initiateCall({
				assistantId: template.vapiAssistantId,
				phoneNumber,
				variables: context,
			});

			return {
				data: {
					callId: voiceCall.id,
					vapiCallId: result.vapiCallId,
					status: "queued",
				},
			};
		} catch (error) {
			console.error("[initiateVoiceCall] Error:", error);
			return { error: `Failed to initiate call: ${error instanceof Error ? error.message : String(error)}` };
		}
	},
});
