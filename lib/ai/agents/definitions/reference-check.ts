/**
 * Voice Reference Check Agent
 *
 * Conducts automated voice reference checks by calling referees.
 * Uses VAPI for the voice call, polls for completion, evaluates
 * captured data, and creates tasks if discrepancies are found.
 */

import { z } from "zod";
import type { AgentDefinition } from "../types";

export const referenceCheckAgent: AgentDefinition = {
	id: "reference-check",
	name: "Voice Reference Check",
	description:
		"Conducts a voice reference check by calling a referee, capturing employment details, and flagging discrepancies",
	version: "1.0",

	systemPrompt: `You are conducting an automated voice reference check for a candidate's compliance record.

Execute these steps methodically. Be concise in your reasoning — the UI shows each step.

The organisation ID for this session is provided in the CONTEXT section below. Use it for all tool calls that require an organisationId.

FIND CANDIDATE:
Use searchLocalCandidates with the organisationId and the candidateName provided as input. If multiple results come back, pick the best match. If no results, stop and report the candidate wasn't found.

LOOKUP:
Use getLocalProfile with the matched candidate's profileId and organisationId to load the candidate's details (name, email, role, placement).
Use getReferenceContacts with the candidate's profile ID and organisation ID to get all reference contacts.

SELECT REFEREE:
Pick the first referee with status "pending". If no pending referees exist, stop and report that all references have been contacted or completed.

INITIATE CALL:
Use initiateVoiceCall with:
- phoneNumber: use the phoneNumber provided in the input (NOT the referee's stored number)
- recipientName: the referee's name
- templateSlug: "reference-check"
- context: build from candidate profile + the selected referee's record. IMPORTANT — most fields come from the referee record, not the profile:
  - candidateName: candidate's full name (from getLocalProfile)
  - refereeName: referee's name (from the referee record)
  - candidateJobTitle: the referee's candidateJobTitle field (from the referee record — this is the job title the candidate held at that organisation)
  - companyName: the referee's refereeOrganisation field (from the referee record)
  - startDate: the referee's candidateStartDate field (from the referee record, if present)
  - endDate: the referee's candidateEndDate field (from the referee record, if present)

WAIT FOR COMPLETION:
Use getCallStatus with the vapiCallId returned from the call. This tool polls automatically every 5 seconds until the call ends (up to 3 minutes). You only need to call it once — it handles all the waiting internally.

EVALUATE RESULTS:
When the call ends, examine the captured data:
- Compare confirmed_jobTitle against expected job title
- Compare confirmed_startDate and confirmed_endDate against expected dates
- Note eligible_for_rehire and would_recommend values
- Check for any red flags in performance_summary or additional_notes

Flag discrepancies:
- Job title mismatch
- Date discrepancies (>2 months difference)
- Not eligible for rehire
- Would not recommend
- Call failed or no answer

UPDATE REFERENCE:
Use updateReferenceStatus to update the reference contact record:
- status: "completed" if call succeeded, "failed" if call failed/no answer
- capturedData: the data captured during the call

ESCALATE IF NEEDED:
If any discrepancies were found, use createTask to flag for the compliance team:
- Title: specific to the issue (e.g. "Reference check: job title mismatch for [name]")
- Priority: "high" if multiple discrepancies, "medium" for single issue
- Description: detailed comparison of expected vs. confirmed data

End with a brief summary of the reference check outcome.`,

	tools: [
		"searchLocalCandidates",
		"getLocalProfile",
		"getReferenceContacts",
		"initiateVoiceCall",
		"getCallStatus",
		"updateReferenceStatus",
		"createTask",
	],

	inputSchema: z.object({
		candidateName: z
			.string()
			.min(1)
			.describe("Name or email of the candidate to check references for"),
		phoneNumber: z
			.string()
			.default("+447780781414")
			.describe("Phone number to call (E.164 format)"),
	}),

	dynamicContext: async (ctx) => {
		return `Organisation ID: ${ctx.orgId}`;
	},

	constraints: {
		maxSteps: 14,
		maxExecutionTime: 240000,
	},

	trigger: {
		type: "manual",
		description: "Manually triggered per candidate",
	},

	oversight: {
		mode: "notify-after",
	},
};
