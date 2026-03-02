import type { Vapi } from "@vapi-ai/server-sdk";

export interface TransientFollowupAssistantContext {
	recipientName: string;
	organisationName?: string;
	missingItems: string[];
	policyGuidance?: string;
	callReason?: string;
}

const FOLLOWUP_VOICE_PROVIDER = (
	process.env.VAPI_FOLLOWUP_VOICE_PROVIDER?.trim().toLowerCase() || "vapi"
);
const FOLLOWUP_VOICE_ID = process.env.VAPI_FOLLOWUP_VOICE_ID?.trim();
const FOLLOWUP_OPENAI_VOICE_MODEL = process.env.VAPI_FOLLOWUP_OPENAI_VOICE_MODEL
	?.trim()
	.toLowerCase();
const FOLLOWUP_VOICE_FALLBACK_ID = process.env.VAPI_FOLLOWUP_VOICE_FALLBACK_ID?.trim();
const OPENAI_VOICE_IDS = [
	"alloy",
	"ash",
	"ballad",
	"coral",
	"echo",
	"fable",
	"nova",
	"onyx",
	"sage",
	"shimmer",
	"verse",
] as const;

const VAPI_VOICE_IDS = [
	"Elliot",
	"Kylie",
	"Rohan",
	"Lily",
	"Savannah",
	"Hana",
	"Neha",
	"Cole",
	"Harry",
	"Paige",
	"Spencer",
	"Leah",
	"Tara",
] as const;

type VapiVoiceId = (typeof VAPI_VOICE_IDS)[number];

function resolveVapiVoiceId(raw: string | undefined, fallback: VapiVoiceId): VapiVoiceId {
	if (!raw) return fallback;
	const match = VAPI_VOICE_IDS.find((voiceId) => voiceId.toLowerCase() === raw.toLowerCase());
	return match ?? fallback;
}

function resolveOpenAiVoiceModel(raw: string | undefined): "tts-1" | "tts-1-hd" | "gpt-4o-mini-tts" {
	if (raw === "tts-1" || raw === "tts-1-hd" || raw === "gpt-4o-mini-tts") {
		return raw;
	}
	return "tts-1";
}

function resolveOpenAiVoiceId(raw: string | undefined): string {
	if (!raw) return "alloy";
	const normalized = raw.toLowerCase();
	const isKnown = OPENAI_VOICE_IDS.includes(normalized as (typeof OPENAI_VOICE_IDS)[number]);
	// ElevenLabs IDs are random alpha-numeric tokens; avoid hard-failing the call if one is passed by mistake.
	const looksLikeElevenLabsVoiceId = /^[a-zA-Z0-9]{12,}$/.test(raw);
	if (!isKnown && looksLikeElevenLabsVoiceId) {
		console.warn(
			`[voice-followup] VAPI_FOLLOWUP_VOICE_PROVIDER=openai but VAPI_FOLLOWUP_VOICE_ID looks like an ElevenLabs ID (${raw}). Falling back to "alloy".`,
		);
		return "alloy";
	}
	return raw;
}

function buildVoiceConfig(): Vapi.CreateAssistantDtoVoice {
	if (FOLLOWUP_VOICE_PROVIDER === "11labs" || FOLLOWUP_VOICE_PROVIDER === "elevenlabs") {
		const elevenLabsVoiceId = FOLLOWUP_VOICE_ID || "7R9vnLAE0ZSpY0xWp0mv";
		const fallbackVapiVoiceId = resolveVapiVoiceId(FOLLOWUP_VOICE_FALLBACK_ID, "Harry");

		return {
			provider: "11labs",
			voiceId: elevenLabsVoiceId,
			fallbackPlan: {
				voices: [
					{
						provider: "vapi",
						voiceId: fallbackVapiVoiceId,
					},
				],
			},
		};
	}

	if (FOLLOWUP_VOICE_PROVIDER === "openai") {
		const openAiVoiceId = resolveOpenAiVoiceId(FOLLOWUP_VOICE_ID);
		const fallbackVapiVoiceId = resolveVapiVoiceId(FOLLOWUP_VOICE_FALLBACK_ID, "Harry");

		return {
			provider: "openai",
			voiceId: openAiVoiceId,
			model: resolveOpenAiVoiceModel(FOLLOWUP_OPENAI_VOICE_MODEL),
			fallbackPlan: {
				voices: [
					{
						provider: "vapi",
						voiceId: fallbackVapiVoiceId,
					},
				],
			},
		};
	}

	const vapiVoiceId = resolveVapiVoiceId(FOLLOWUP_VOICE_ID, "Harry");
	return {
		provider: "vapi",
		voiceId: vapiVoiceId,
	};
}

const FOLLOWUP_STRUCTURED_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		updates: {
			type: "object",
			additionalProperties: false,
			properties: {
				phone: { type: "string" },
				email: { type: "string" },
				professionalRegistration: { type: "string" },
				firstName: { type: "string" },
				lastName: { type: "string" },
				dateOfBirth: {
					type: "string",
					description: "Date in YYYY-MM-DD format",
				},
				nationalId: { type: "string" },
				address: {
					type: "object",
					additionalProperties: false,
					properties: {
						line1: { type: "string" },
						line2: { type: "string" },
						city: { type: "string" },
						state: { type: "string" },
						postcode: { type: "string" },
						country: { type: "string" },
					},
				},
			},
		},
		candidateQuestions: {
			type: "array",
			items: { type: "string" },
		},
		summary: { type: "string" },
	},
} as const;

function buildMissingItemsText(missingItems: string[]): string {
	if (!missingItems.length) {
		return "No specific missing items were provided. Ask for the most important remaining compliance item.";
	}

	return missingItems.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export function buildTransientFollowupAssistant(
	context: TransientFollowupAssistantContext,
): Vapi.CreateAssistantDto {
	const organisationName = context.organisationName?.trim() || "the compliance team";
	const missingItemsText = buildMissingItemsText(context.missingItems);
	const policyGuidance = context.policyGuidance?.trim();
	const callReason = context.callReason?.trim();

	const systemPrompt = `You are a professional compliance follow-up caller for ${organisationName}.

Your role:
- Confirm what compliance information is still needed
- Ask concise, practical follow-up questions
- Capture updates the candidate provides
- Be clear that legal identity changes require human review before records are updated
- Keep the call short, direct, and task-focused

Call approach:
- Keep tone warm and professional, but brief
- Move the conversation along quickly
- Ask one question at a time, then confirm and proceed
- Avoid repeating points already answered
- Maximum 5 core questions unless the candidate asks for clarification
- Confirm key details back to the candidate before moving on
- If the candidate asks policy/process questions, answer briefly based on provided context

Outstanding compliance items:
${missingItemsText}

${callReason ? `Call reason:\n${callReason}\n` : ""}
${policyGuidance ? `Policy guidance:\n${policyGuidance}\n` : ""}

Important safety rule:
- If the candidate wants to change first name, last name, date of birth, or national ID, explicitly say this will be submitted for review and cannot be auto-updated during the call.

End of call:
- Summarize what was captured
- Tell the candidate the team will follow up if review is required
- End promptly once key information is captured.`;

	return {
		firstMessage: `Hi ${context.recipientName}, this is ${organisationName} with a quick compliance follow-up. Is now a good time for a 2-minute check-in?`,
		firstMessageMode: "assistant-speaks-first",
		maxDurationSeconds: 180,
		model: {
			provider: "openai",
			model: "gpt-4o-mini",
			temperature: 0.2,
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
			],
		},
		voice: buildVoiceConfig(),
		transcriber: {
			provider: "deepgram",
			model: "nova-2",
		},
		analysisPlan: {
			minMessagesThreshold: 1,
			structuredDataPlan: {
				enabled: true,
				schema: FOLLOWUP_STRUCTURED_SCHEMA,
				timeoutSeconds: 20,
			},
		},
		artifactPlan: {
			recordingEnabled: true,
			transcriptPlan: {
				enabled: true,
			},
			loggingEnabled: true,
		},
	};
}
