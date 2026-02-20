/**
 * Background Screening Agent
 *
 * Creates a candidate in First Advantage, selects the appropriate
 * screening package via faSelectPackage, and initiates the background
 * check. Saves the screening ID to agent memory for status tracking.
 */

import { z } from "zod";
import type { AgentDefinition } from "../types";

export const backgroundScreeningAgent: AgentDefinition = {
	id: "background-screening",
	name: "Background Screening",
	description:
		"Creates a candidate in First Advantage, selects the appropriate screening package, and initiates the background check. Saves screening details for status tracking.",
	version: "1.0",

	dynamicContext: async (ctx) => `Organisation ID: ${ctx.orgId}`,

	systemPrompt: `You are initiating a background screening via First Advantage for a healthcare worker.

The organisation ID for this session is provided in the CONTEXT section below. Use it for all tool calls that require an organisationId.

STEP 1 — LOOK UP THE CANDIDATE:
Use searchLocalCandidates with the organisationId and the candidate's name or email, then getLocalProfile to get their full details. You need their full name, email, and profile ID.

STEP 2 — CHECK COMPLIANCE STATUS:
Use getPlacementCompliance to understand what screening is needed. Focus on items that require FA screening (background checks, drug screens, exclusion checks). Check what's already been screened and is still current — don't re-screen unnecessarily (this is the worker passport value).

STEP 3 — SELECT FA PACKAGE:
Use faSelectPackage to determine the correct package. ALWAYS call this tool — do not reason about package selection yourself. Cite the tool's output (package name, tier, and reason) in your explanation.

The tool implements this logic:
- Package #1 (Standard): SSN Trace, County Criminal, Federal Criminal, Nationwide Criminal 7yr, NSOPW, FACIS Level III.
- Package #2 (Standard + OIG/SAM): Everything in #1 plus Statewide Criminal, OIG (HHS), EPLS/SAM (GSA).
- Triggers for #2: lapse deals, certain states, facility OIG/SAM requirements, government placements.

STEP 4 — CREATE FA CANDIDATE:
Use faCreateCandidate with the candidate's details. Use their Credentially profile ID as the clientReferenceId to maintain the link.

STEP 5 — INITIATE SCREENING:
Use faInitiateScreening with the FA candidate ID and the package ID returned by faSelectPackage in step 3.

STEP 6 — SAVE MEMORY:
Use saveAgentMemory to record the screening ID, package, candidate name, and timestamp so the status monitor can track it later. Use the memory key "fa-screenings".

STEP 7 — SUMMARISE:
Report what was initiated:
- Candidate name and FA candidate ID
- Package selected and why (cite faSelectPackage output)
- Screening components included
- Expected turnaround time (3-5 business days)
- Next steps: use the Screening Status Monitor agent to track progress

Be methodical. Explain each decision briefly so the audience understands why this package was selected.`,

	tools: [
		"getLocalProfile",
		"getPlacementCompliance",
		"searchLocalCandidates",
		"faGetPackages",
		"faSelectPackage",
		"faCreateCandidate",
		"faInitiateScreening",
		"getAgentMemory",
		"saveAgentMemory",
		"createTask",
	],

	inputSchema: z.object({
		candidateSearch: z
			.string()
			.describe("Candidate name, email, or profile ID"),
		targetState: z
			.string()
			.default("florida")
			.describe("US state for the placement"),
		facilityName: z
			.string()
			.optional()
			.describe("Facility name"),
		dealType: z
			.enum(["standard", "lapse", "quickstart", "reassignment"])
			.default("standard"),
	}),

	constraints: {
		maxSteps: 15,
		maxExecutionTime: 45000,
	},

	trigger: {
		type: "manual",
		description:
			"When a compliance team member needs to initiate background screening",
	},

	oversight: { mode: "auto" },
};
