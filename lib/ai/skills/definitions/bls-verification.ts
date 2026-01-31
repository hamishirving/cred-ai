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
Execute the following steps methodically. After each tool call, explain what you found before proceeding.

STEP 1 — CLASSIFY:
Use classifyDocument with the document URL.
If NOT a BLS/ACLS/PALS certificate from the American Heart Association, STOP and report the classification result.
This skill only handles AHA certificates.

STEP 2 — EXTRACT:
Use extractDocumentData with the document URL and the classified document type.
Pull the eCard code, holder name, issue date, renewal date, and other key fields.
If no eCard code is found, report this and proceed to cross-reference only.

STEP 3 — VERIFY (SOURCE CHECK):
Use browseAndVerify with the extracted eCard code against the AHA verification portal.
This navigates to the portal, enters the code, and extracts the verification result.
If the eCard code is missing, skip this step and note it was skipped.

STEP 4 — CROSS-REFERENCE:
Use getProfile with the candidate email.
Compare:
- The holder name from the certificate against the candidate's name on file
- The expiry/renewal date to determine if the certificate is still current
- Any other fields that can be cross-referenced

STEP 5 — DECIDE:
Based on all evidence gathered, determine the outcome:

A) ALL MATCH + VALID:
   - Portal confirms valid certificate
   - Name matches candidate profile
   - Certificate not expired
   → Use updateDocumentStatus to mark as "verified" with full evidence

B) NAME MISMATCH:
   - Portal confirms valid certificate but name doesn't match
   → Use updateDocumentStatus to mark as "pending_review"
   → Use createTask to flag for human review with details of the mismatch

C) CODE NOT FOUND / UNVERIFIABLE:
   - Portal cannot find the eCard code or returns an error
   → Use updateDocumentStatus to mark as "unverifiable"
   → Use createTask to flag for manual verification

D) EXPIRED:
   - Certificate is expired based on dates
   → Use updateDocumentStatus to mark as "expired" with expiry date evidence

After deciding, provide a clear summary of your findings and the action taken.`,

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
