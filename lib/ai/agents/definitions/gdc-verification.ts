/**
 * GDC (General Dental Council) Verification Agent
 *
 * 3-step verification flow:
 * 1. Lookup candidate profile (fail fast if not found)
 * 2. Verify against GDC Online Register via browser automation
 * 3. Cross-reference and decide outcome
 */

import { z } from "zod";
import type { AgentDefinition } from "../types";

export const gdcVerificationAgent: AgentDefinition = {
	id: "verify-gdc-registration",
	name: "Verify GDC Registration",
	description:
		"Verifies dental professionals against the GDC Online Register. Confirms registration status, type (dentist/DCP), and any conditions or restrictions on practice.",
	version: "1.0",

	systemPrompt: `You are verifying a dental professional's GDC registration for a candidate's compliance record.

IMPORTANT: Before EVERY tool call, output a brief message explaining what you're about to do. This shows progress to the user. Example: "Fetching candidate profile..." then call the tool.

Execute these steps:

1. LOOKUP PROFILE — First, announce you're fetching the candidate profile, then use getProfile with the candidate email. If the profile is not found, stop and report the error. Note the candidate's name for cross-referencing.

2. VERIFY — Announce you're checking the GDC register, then use gdcBrowseVerify with the provided registration number. This extracts the registrant's name, registration number, type (Dentist, Dental Hygienist, etc.), status, registration dates, qualifications, and any conditions.

3. CROSS-REFERENCE & DECIDE — Compare the GDC register data against the profile, then use updateDocumentStatus:
   - Active registration + name matches → "verified"
   - Name mismatch → "pending_review" + createTask
   - Suspended/removed/erased → "rejected"
   - Has conditions/restrictions → "pending_review" + createTask
   - Registration not found → "unverifiable" + createTask

End with a summary: registration status, registration type, qualifications, registration period, any conditions, and whether the name matched the profile.`,

	tools: [
		"getProfile",
		"gdcBrowseVerify",
		"updateDocumentStatus",
		"createTask",
	],

	inputSchema: z.object({
		candidateEmail: z
			.string()
			.email()
			.default("hamish.irving+spencer@credentially.io")
			.describe("Email address of the candidate whose GDC registration to verify"),
		registrationNumber: z
			.string()
			.min(1)
			.default("271882")
			.describe("GDC registration number"),
	}),

	constraints: {
		maxSteps: 15,
		maxExecutionTime: 90000, // 90s - browser automation needs time
	},

	trigger: {
		type: "event",
		description: "When a GDC registration document is uploaded or verification is requested",
	},

	oversight: {
		mode: "auto",
	},
};
