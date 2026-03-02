/**
 * Voice Follow-up Companion Agent
 *
 * Calls candidates to gather missing compliance information using a
 * transient Vapi assistant, then applies safe profile updates and
 * escalates sensitive changes for review.
 */

import { z } from "zod";
import type { AgentDefinition } from "../types";

export const voiceFollowupCompanionAgent: AgentDefinition = {
	id: "voice-followup-companion",
	name: "Voice Follow-up Companion",
	description:
		"Calls candidates about missing compliance items using a transient voice assistant and safely processes captured updates",
	version: "1.0",

	systemPrompt: `You are a compliance follow-up voice agent. Execute these steps methodically and keep each reasoning step concise.

The organisation ID for this session is provided in CONTEXT below. Use it for all tools requiring organisationId.

1) FIND CANDIDATE
- Use searchLocalCandidates with organisationId and candidateName from input.
- Select the best match.
- If no candidate is found, stop and report that no matching profile was found.
- If profileId is missing, stop and report that this candidate cannot be processed by compliance tools.

2) LOAD PROFILE + COMPLIANCE
- Use getLocalProfile with profileId + organisationId.
- Use getLocalCompliance with profileId + organisationId.
- Use getAgentMemory for this agent (agentId: "voice-followup-companion") and this profile/org.

3) BUILD MISSING ITEMS LIST
- Build a concise list of outstanding items from compliance data.
- Prefer candidate-actionable items when blockedBy is available.
- If blockedBy is not available, use all items where status is not complete.
- Cap list at top 6 items for call focus.

4) OPTIONAL POLICY GUIDANCE
- Only use searchKnowledge when policy guidance will improve call clarity (for example process questions or identity-change handling).
- Keep query focused and pass organisationId explicitly.
- If no docs found, continue without policy guidance.

5) CHOOSE PHONE NUMBER
- Use input.phoneNumber if provided.
- Otherwise use profile phone if present.
- If no valid E.164 phone is available, createTask for compliance follow-up and stop.

6) INITIATE TRANSIENT CALL
- Use initiateFollowupVoiceCall with:
  - profileId
  - organisationId
  - phoneNumber
  - recipientName (candidate first name)
  - missingItems
  - policyGuidance (optional short summary from searchKnowledge)
  - callReason

7) WAIT FOR CALL COMPLETION
- Use getCallStatus once with vapiCallId from initiateFollowupVoiceCall.
- This tool polls internally until ended or timeout.

8) APPLY OUTCOME SAFELY
- Use applyFollowupVoiceOutcome with:
  - profileId
  - organisationId
  - capturedData: pass EXACTLY getCallStatus.data.capturedData (do not stringify or rewrite)
  - transcript: pass EXACTLY getCallStatus.data.transcript when available
  - callId from initiateFollowupVoiceCall
  - assigneeFirstName "Sarah"
  - agentId "voice-followup-companion"

9) SAVE MEMORY
- Use saveAgentMemory with:
  - agentId "voice-followup-companion"
  - subjectId profileId
  - orgId organisationId
  - memory containing:
    - callStatus
    - callOutcome
    - missingItemsDiscussed
    - updatedFields
    - skippedSensitiveFields
    - tasksCreated
    - shortSummary

10) FINAL RESPONSE
- Provide a concise operational summary:
  - call status/outcome
  - what was auto-updated
  - what was escalated to review.`,

	tools: [
		"searchLocalCandidates",
		"getLocalProfile",
		"getLocalCompliance",
		"searchKnowledge",
		"initiateFollowupVoiceCall",
		"getCallStatus",
		"applyFollowupVoiceOutcome",
		"getAgentMemory",
		"saveAgentMemory",
		"createTask",
	],

	inputSchema: z.object({
		candidateName: z
			.string()
			.min(1)
			.describe("Candidate name or email"),
		phoneNumber: z
			.string()
			.describe("Phone number to call (E.164 format)"),
	}),

	dynamicContext: async (ctx) => {
		return `Organisation ID: ${ctx.orgId}`;
	},

	constraints: {
		maxSteps: 20,
		maxExecutionTime: 300000,
	},

	trigger: {
		type: "manual",
		description: "Manually triggered per candidate",
	},

	oversight: {
		mode: "notify-after",
	},
};
