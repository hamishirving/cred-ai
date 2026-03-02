/**
 * BON (Board of Nursing) Verification Agent
 *
 * 3-step verification flow:
 * 1. Lookup — verify licence against TX Board of Nursing via browser automation
 * 2. Cross-reference — compare extracted name with candidate profile
 * 3. Decide — update document status based on match and licence status
 */

import { z } from "zod";
import type { AgentDefinition } from "../types";

export const bonVerificationAgent: AgentDefinition = {
	id: "verify-bon-licence",
	name: "Verify Nursing Licence (BON)",
	description:
		"Verifies nursing professionals against the Texas Board of Nursing licence lookup. Confirms licence status, type (RN/LVN), expiration, and compact multistate status.",
	version: "1.0",

	systemPrompt: `You are verifying a nursing professional's licence against the Texas Board of Nursing for a candidate's compliance record.

IMPORTANT: Before EVERY tool call, output a brief message explaining what you're about to do. This shows progress to the user. Example: "Looking up licence on TX Board of Nursing..." then call the tool.

Execute these steps:

1. FIND CANDIDATE — Announce you're searching for the candidate, then use searchLocalCandidates with the candidate email. This returns the candidate's profileId, name, and organisation. If not found, stop and report the error.

2. LOOKUP — Announce you're checking the TX BON register, then use bonBrowseVerify with the provided licence number. This navigates to the TX BON licence lookup, handles the CAPTCHA, searches by licence number, clicks "View Report", and extracts the registrant's name, licence type (RN, LVN/LPN), licence number, status, issue dates, expiration date, and compact status. Multiple licence cards may be returned if the person holds both RN and LVN/LPN licences.

3. CROSS-REFERENCE — Compare the name on the licence(s) with the candidate's name from step 1. Note: BON typically shows names as "LASTNAME, FIRSTNAME MIDDLENAME" in uppercase.

4. DECIDE — Based on the verification results, use updateDocumentStatus:
   - Current licence + name matches → "verified"
   - Name mismatch → "pending_review" + createTask explaining the discrepancy
   - Expired licence → "expired" + createTask
   - Suspended/revoked → "rejected" + createTask
   - Licence not found → "unverifiable" + createTask

End with a summary: licence holder name, all licence types found, status of each, expiration dates, compact status, NCSBN ID, and whether the name matched the profile.`,

	tools: [
		"bonBrowseVerify",
		"searchLocalCandidates",
		"updateDocumentStatus",
		"createTask",
	],

	inputSchema: z.object({
		candidateEmail: z
			.string()
			.email()
			.default("james.hickox@email.com")
			.describe(
				"Email address of the candidate whose nursing licence to verify",
			),
		licenceNumber: z
			.string()
			.min(1)
			.default("801653")
			.describe("TX BON licence number"),
	}),

	constraints: {
		maxSteps: 15,
		maxExecutionTime: 90000, // 90s — browser automation + CAPTCHA needs time
	},

	trigger: {
		type: "event",
		description:
			"When a nursing licence document is uploaded or BON verification is requested",
	},

	oversight: {
		mode: "auto",
	},
};
