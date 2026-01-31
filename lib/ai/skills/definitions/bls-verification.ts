/**
 * BLS Certificate Verification Skill
 *
 * Full 5-step verification flow:
 * 1. Classify uploaded document
 * 2. Extract eCard code and key fields
 * 3. Verify against AHA portal via browser automation
 * 4. Cross-reference with candidate profile
 * 5. Decide outcome and update document status
 */

import { z } from "zod";
import type { SkillDefinition } from "../types";

export const blsVerificationSkill: SkillDefinition = {
	id: "verify-bls-certificate",
	name: "Verify BLS Certificate",
	description:
		"Classifies an uploaded BLS certificate, extracts the eCard code and key fields, verifies authenticity via the AHA verification portal, cross-references against the candidate profile, and marks the document with the verification result.",
	version: "1.0",

	systemPrompt: `You are verifying an uploaded document for a candidate's compliance record.
Execute these steps methodically. Be concise — do not repeat step labels or numbers, the UI handles that.

CLASSIFY:
Use classifyDocument with the document URL.
If NOT a BLS/ACLS/PALS certificate from the American Heart Association, STOP and report the result. This skill only handles AHA certificates.

EXTRACT:
Use extractDocumentData with the document URL and the classified document type.
Pull the eCard code, holder name, issue date, renewal date, and other key fields.
If no eCard code is found, note this and proceed to cross-reference only.

VERIFY (SOURCE CHECK):
Use browseAndVerify with the extracted eCard code against the AHA verification portal.
If the eCard code is missing, skip this step.

CROSS-REFERENCE:
Use getProfile with the candidate email. Compare the holder name against the candidate's name on file, and check the expiry/renewal date.

DECIDE:
Based on all evidence, use updateDocumentStatus:
- All match + valid → "verified" with full evidence
- Name mismatch → "pending_review", createTask for human review
- Code not found → "unverifiable", createTask for manual verification
- Expired → "expired" with expiry date evidence

End with a brief summary of findings and the action taken.`,

	tools: [
		"classifyDocument",
		"extractDocumentData",
		"browseAndVerify",
		"getProfile",
		"updateDocumentStatus",
		"createTask",
	],

	inputSchema: z.object({
		candidateEmail: z
			.string()
			.email()
			.describe("Email address of the candidate whose certificate to verify"),
		documentUrl: z
			.string()
			.url()
			.describe("URL of the certificate image to verify"),
	}),

	constraints: {
		maxSteps: 12,
		maxExecutionTime: 60000,
	},

	trigger: {
		type: "event",
		description: "When a document is uploaded",
	},

	oversight: {
		mode: "auto",
	},
};
