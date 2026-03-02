import { tool } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createVoiceCall, getOrganisationById, updateVoiceCall } from "@/lib/db/queries";
import {
	getMissingConfig,
	initiateCall,
	isValidPhoneNumber,
	isVapiConfigured,
} from "@/lib/voice/vapi-client";
import { buildTransientFollowupAssistant } from "@/lib/voice/transient-followup-assistant";

const FOLLOWUP_TEMPLATE_SLUG = "candidate-followup-transient-v1";
const DEMO_FOLLOWUP_PHONE_NUMBER = "+447780781414";

export const initiateFollowupVoiceCallTool = tool({
	description: `Initiate an outbound follow-up call using a transient Vapi assistant.
Use this when you need to call a candidate about missing compliance information and capture updates.
This tool does not require a static Vapi assistant ID.`,

	inputSchema: z.object({
		profileId: z.string().uuid().describe("Candidate profile ID"),
		organisationId: z.string().uuid().describe("Organisation ID"),
		phoneNumber: z
			.string()
			.describe("Phone number in E.164 format (e.g. +14155551234)"),
		recipientName: z.string().describe("Candidate first name or display name"),
		missingItems: z
			.array(z.string())
			.default([])
			.describe("List of missing compliance items to discuss"),
		policyGuidance: z
			.string()
			.optional()
			.describe("Optional policy/process guidance to ground call responses"),
		callReason: z
			.string()
			.optional()
			.describe("Optional one-line reason for this call"),
	}),

	execute: async ({
		profileId,
		organisationId,
		phoneNumber,
		recipientName,
		missingItems,
		policyGuidance,
		callReason,
	}) => {
		const requestedPhoneNumber = phoneNumber;
		const effectivePhoneNumber = DEMO_FOLLOWUP_PHONE_NUMBER;

		console.log("[initiateFollowupVoiceCall] Starting transient call:", {
			profileId,
			organisationId,
			requestedPhoneNumber,
			effectivePhoneNumber,
		});

		try {
			if (!isVapiConfigured()) {
				const missing = getMissingConfig();
				return {
					error: `Voice service not configured. Missing: ${missing.join(", ")}`,
				};
			}

			if (!isValidPhoneNumber(effectivePhoneNumber)) {
				return {
					error: `Invalid phone number format: ${effectivePhoneNumber}. Must be E.164 format.`,
				};
			}

			const session = await auth();
			const userId = session?.user?.id ?? "system";
			const organisation = await getOrganisationById({ id: organisationId });
			const organisationName = organisation?.name ?? "the compliance team";

			const assistant = buildTransientFollowupAssistant({
				recipientName,
				organisationName,
				missingItems,
				policyGuidance,
				callReason,
			});

			const voiceCall = await createVoiceCall({
				userId,
				templateSlug: FOLLOWUP_TEMPLATE_SLUG,
				phoneNumber: effectivePhoneNumber,
				recipientName,
				context: {
					mode: "transient",
					profileId,
					organisationId,
					missingItems,
					policyGuidance: policyGuidance ?? null,
					callReason: callReason ?? null,
					requestedPhoneNumber,
				},
				vapiAssistantId: "transient",
			});

			const variables: Record<string, string> = {
				candidateName: recipientName,
				organisationId,
				organisationName,
				profileId,
				missingItems: missingItems.join(", "),
				policyGuidance: policyGuidance ?? "",
				callReason: callReason ?? "",
			};

			const result = await initiateCall({
				assistant,
				phoneNumber: effectivePhoneNumber,
				variables,
			});

			await updateVoiceCall({
				id: voiceCall.id,
				vapiCallId: result.vapiCallId,
				status: "queued",
			});

			return {
				data: {
					callId: voiceCall.id,
					vapiCallId: result.vapiCallId,
					status: "queued",
					mode: "transient",
					templateSlug: FOLLOWUP_TEMPLATE_SLUG,
				},
			};
		} catch (error) {
			console.error("[initiateFollowupVoiceCall] Error:", error);
			return {
				error: `Failed to initiate follow-up call: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
