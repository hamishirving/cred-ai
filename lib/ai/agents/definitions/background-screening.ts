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
		"Creates a candidate in First Advantage, selects the appropriate screening package (background + drug/health when needed), and initiates the screening. Saves screening details for status tracking.",
	version: "1.1",

	dynamicContext: async (ctx) => `Organisation ID: ${ctx.orgId}`,

	systemPrompt: `You are initiating a background screening via First Advantage for a healthcare worker.

The organisation ID for this session is provided in the CONTEXT section below. Use it for all tool calls that require an organisationId.

STEP 1 — LOOK UP THE CANDIDATE:
Use searchLocalCandidates with the organisationId and the candidate's name or email, then getLocalProfile to get their full details. You need their full name, email, profile ID, date of birth, SSN (nationalId), sex, and address (including state for the ISO 3166-2 region code).

STEP 2 — CHECK COMPLIANCE STATUS:
Use getPlacementCompliance to understand what screening is needed. Focus on items that require FA screening: background checks, exclusion checks, AND health/drug screening (drug-screen, tb-test, physical-examination). Check what's already been screened and is still current — don't re-screen unnecessarily (this is the worker passport value).

STEP 3 — SELECT FA PACKAGE:
Use faSelectPackage to determine the correct package. ALWAYS call this tool — do not reason about package selection yourself. Cite the tool's output (package name, tier, and reason) in your explanation.

If compliance gaps include drug-screen, tb-test, or physical-examination, set includeDrugHealth to true. This selects a package that bundles background + drug/health screening.

The tool implements this logic:
- Package #1 (539146, Standard): SSN Trace, County Criminal, Federal Criminal, Nationwide Criminal 7yr, NSOPW, FACIS Level III. Default for standard placements.
- Package #2 (626709, Enhanced): Everything in #1 plus Statewide Criminal, OIG (HHS), EPLS/SAM (GSA). Used when state or facility requires additional checks.
- Package #3 (626711, Full): Everything in #2 plus National Wants & Warrants, OIG variant. Used for lapse deals and government placements.
- Drug & Health variant: adds Drug Screen (13-panel), TB Test (QuantiFERON), Physical Examination.
- Triggers for #3: lapse deals, certain states, facility OIG/SAM requirements, government placements.

STEP 4 — CREATE FA CANDIDATE:
Use faCreateCandidate with the candidate's details from getLocalProfile. Use their Credentially profile ID as the clientReferenceId to maintain the link.

Required fields for screening:
- givenName, familyName, email
- dob (YYYY-MM-DD format) — from dateOfBirth in profile
- ssn (XXX-XX-XXXX format) — from nationalId in profile
- address: addressLine (from address.line1), municipality (from address.city), regionCode (US- + address.state, e.g. "US-FL"), postalCode (from address.postcode), countryCode "US"
- driversLicenseNumber and driversLicenseState (ISO 3166-2) if required by the package

All these fields should be available from the candidate's profile. If any are missing, note what's missing in your summary.

STEP 5 — INITIATE SCREENING:
Use faInitiateScreening with the FA candidate ID and the package ID returned by faSelectPackage in step 3.

IMPORTANT: You must also pass organisationId (from context), profileId (the candidate's profile UUID from step 1), and placementId (from input, if provided). These are required for the tool to persist the screening record to the database.

If the package includes drug/health screening (includesDrugHealth was true), you MUST pass drugScreening with:
- sex: from the candidate's profile (sex field)
- addressLine: from the candidate's address.line1
- municipality: from the candidate's address.city
- regionCode: "US-" + address.state (e.g. "US-FL")
- postalCode: from the candidate's address.postcode

FA uses this to route the candidate to the nearest collection clinic for their drug screen, TB test, and physical.

Note: The screening record is automatically persisted to the database by faInitiateScreening — no need to save it to agent memory. The Screening Status Monitor agent will find it via faListScreenings.

STEP 6 — SUMMARISE:
Report what was initiated:
- Candidate name and FA candidate ID
- Package selected and why (cite faSelectPackage output)
- Screening components included (background checks, and drug/health if applicable)
- If drug/health included: mention clinic routing based on candidate address
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
		"createTask",
	],

	inputSchema: z.object({
		candidateSearch: z
			.string()
			.default("Ashlyn Torres")
			.describe("Candidate name, email, or profile ID"),
		targetState: z
			.string()
			.default("florida")
			.describe("US state for the placement"),
		facilityName: z
			.string()
			.default("Memorial Hospital Jacksonville")
			.describe("Facility name"),
		dealType: z
			.enum(["standard", "lapse", "quickstart", "reassignment"])
			.default("standard")
			.describe("Type of deal — affects package selection and OIG/SAM requirements"),
		placementId: z
			.string()
			.optional()
			.describe("Placement ID to link screening back to the placement for task/escalation tracking"),
	}),

	constraints: {
		maxSteps: 15,
		maxExecutionTime: 60000,
	},

	trigger: {
		type: "manual",
		description:
			"When a compliance team member needs to initiate background screening",
	},

	oversight: { mode: "auto" },
};
