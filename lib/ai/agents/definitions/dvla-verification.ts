/**
 * DVLA Driving Licence Verification Agent
 *
 * 3-step verification flow:
 * 1. Verify against GOV.UK portal via browser automation
 * 2. Cross-reference with candidate profile
 * 3. Decide outcome and update document status
 */

import { z } from "zod";
import type { AgentDefinition } from "../types";

export const dvlaVerificationAgent: AgentDefinition = {
	id: "verify-dvla-licence",
	name: "Verify DVLA Driving Licence",
	description:
		"Verifies UK driving licences against the GOV.UK View Driving Licence portal. Confirms licence validity, entitlements, and penalty points for logistics and emergency services roles.",
	version: "1.0",

	systemPrompt: `You are verifying a UK driving licence for a candidate's compliance record.

IMPORTANT: Before EVERY tool call, output a brief message explaining what you're about to do. This shows progress to the user. Example: "Checking DVLA portal for licence status..." then call the tool.

Execute these steps:

1. VERIFY — First, announce you're checking the DVLA portal, then use dvlaBrowseVerify with the provided credentials (licenceNumber, niNumber, postcode). This extracts driver details, licence status, entitlements, and penalty points.

2. CROSS-REFERENCE — Announce you're fetching the candidate profile, then use getProfile with the candidate email. Compare:
   - Name from portal vs candidate profile
   - Check for disqualifications
   - Note penalty points (12+ = disqualification)

3. DECIDE — Announce your decision, then use updateDocumentStatus:
   - Valid licence + name matches → "verified"
   - Name mismatch → "pending_review" + createTask
   - Disqualified/revoked → "rejected"
   - 9+ penalty points → "pending_review" + createTask
   - Wrong credentials → "unverifiable" + createTask

End with a summary: licence status, key categories (C, C+E, D), total points, any concerns.`,

	tools: [
		"dvlaBrowseVerify",
		"getProfile",
		"updateDocumentStatus",
		"createTask",
	],

	inputSchema: z.object({
		candidateEmail: z
			.string()
			.email()
			.default("hamish.irving+spencer@credentially.io")
			.describe("Email address of the candidate whose licence to verify"),
		licenceNumber: z
			.string()
			.min(1)
			.default("SPENC910213DR9GG77")
			.describe("16-character DVLA driving licence number"),
		niNumber: z
			.string()
			.min(1)
			.default("JX683618C")
			.describe("National Insurance number"),
		postcode: z
			.string()
			.min(1)
			.default("BL52BZ")
			.describe("Postcode registered with DVLA"),
	}),

	constraints: {
		maxSteps: 15,
		maxExecutionTime: 90000, // 90s - longer timeout for multi-tab scraping
	},

	trigger: {
		type: "event",
		description: "When a driving licence document is uploaded or verification is requested",
	},

	oversight: {
		mode: "auto",
	},
};
