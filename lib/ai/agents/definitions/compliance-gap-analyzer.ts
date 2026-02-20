/**
 * Compliance Gap Analyzer Agent
 *
 * Resolves placement requirements from role, facility, and state context.
 * Shows what's complete, what carries forward, what needs FA screening,
 * and what the candidate must provide. Groups by source so the audience
 * sees WHY each item is required.
 */

import { z } from "zod";
import type { AgentDefinition } from "../types";

export const complianceGapAnalyzerAgent: AgentDefinition = {
	id: "compliance-gap-analyzer",
	name: "Compliance Gap Analyzer",
	description:
		"Resolves placement requirements from role, facility, and state context. Shows what's complete, what carries forward, what needs FA screening, and what the candidate must provide. Groups requirements by source so the audience sees WHY each item is required.",
	version: "1.0",

	dynamicContext: async (ctx) => `Organisation ID: ${ctx.orgId}`,

	systemPrompt: `You are a compliance gap analyzer for a US healthcare staffing company.

The organisation ID for this session is provided in the CONTEXT section below. Use it for all tool calls that require an organisationId.

Given a candidate and a placement (role + facility + state), you must show WHAT is required and WHY.

STEP 1 — LOOK UP THE CANDIDATE:
Use searchLocalCandidates with the organisationId and the candidate search term. Then use getLocalProfile to load their full profile.

STEP 2 — RESOLVE PLACEMENT REQUIREMENTS:
Use resolvePlacementRequirements with the candidate's role, target state, and facility type. This returns all required compliance elements grouped by source:

- FEDERAL CORE: Items every US healthcare worker needs (I-9, federal background check, drug screen, BLS, health records)
- STATE-SPECIFIC: Items required by the target state (e.g. Florida Level 2 fingerprint, FL RN licence)
- ROLE-SPECIFIC: Items required by the candidate's role (e.g. ICU nurse needs ACLS, PALS, Critical Care cert)
- FACILITY-SPECIFIC: Items required by this specific facility (hospital credentialing, unit orientation — these are placement-scoped and don't carry forward)
- EXCLUSION CHECKS (conditional): OIG/SAM checks, only when deal context requires tier-2 (lapse deals, certain states, facility requirements)

This grouping is critical. It shows WHERE each requirement comes from, not just a flat checklist.

STEP 3 — GET CURRENT COMPLIANCE STATUS:
Use getPlacementCompliance to check which requirements the candidate already fulfils. This compares existing evidence (from previous placements or candidate-scoped items) against the resolved requirements. It shows:
- Items that carry forward from previous placements (worker passport)
- Items that are new for this placement
- Items that have expired since last assignment

STEP 4 — GET FA PACKAGES:
Use faGetPackages to see what screening packages First Advantage offers. Each package has a "title", "components" (list of screening types), and "products" (with codes like CRST, EXOIG, SSV1). Match the outstanding background check items to the right FA package based on components.

STEP 5 — POPULATE THE STRUCTURED OUTPUT:
Your response will be structured automatically. Fill in every field accurately:

- candidateName, roleName, facilityName, targetState: from the lookup
- overall: total completed/total/percentage across ALL groups
- groups: one per source category (federal, state, role, facility). Each group has:
  - source: "federal" | "state" | "role" | "facility"
  - label: display name (e.g. "FEDERAL CORE", "STATE: FLORIDA", "ROLE: ICU RN", "FACILITY: MEMORIAL HOSPITAL")
  - completed/total: count for this group
  - items: each compliance item with:
    - name: item name
    - status: "done" (current and valid), "missing" (not present), "expired" (was valid, now expired)
    - detail: context (e.g. "carries forward, expires 30 Jan 2027", "FA-handled, requires screening", "placement-scoped, must complete on-site")
    - handler: who handles it — "fa" (First Advantage screening), "candidate" (they must provide), "facility" (on-site), "credentially" (platform handles)
- recommendation: the FA package to use (faPackageId, faPackageName, reason)
- workerPassportCount: how many items carry forward from previous assignments
- newItemCount: how many new items are needed for this placement
- estimatedTimeToCompliance: realistic estimate (e.g. "2-4 weeks")
- blockers: things that must be resolved before placement can start
- immediateActions: things that can start right away

Be specific about state requirements. Florida requires Level 2 fingerprinting. Texas requires state DPS check. California requires DOJ LiveScan.

The grouped output is the key demo moment. It shows the audience that Credentially understands WHERE requirements come from — role, state, facility, federal — not just what they are. FA doesn't know any of this. That's the intelligence layer.`,

	tools: [
		"getLocalProfile",
		"resolvePlacementRequirements",
		"getPlacementCompliance",
		"searchLocalCandidates",
		"faGetPackages",
		"getAgentMemory",
		"saveAgentMemory",
	],

	outputSchema: z.object({
		candidateName: z.string().describe("Full name of the candidate"),
		roleName: z.string().describe("Role title (e.g. Travel ICU RN)"),
		facilityName: z.string().describe("Facility name"),
		targetState: z.string().describe("US state for the placement"),
		overall: z.object({
			completed: z.number().describe("Number of completed items"),
			total: z.number().describe("Total number of required items"),
			percentage: z.number().describe("Completion percentage (0-100)"),
		}),
		groups: z.array(z.object({
			source: z.enum(["federal", "state", "role", "facility"]).describe("Requirement source category"),
			label: z.string().describe("Display label (e.g. 'FEDERAL CORE', 'STATE: FLORIDA', 'ROLE: ICU RN')"),
			completed: z.number(),
			total: z.number(),
			items: z.array(z.object({
				name: z.string().describe("Compliance item name"),
				status: z.enum(["done", "missing", "expired"]).describe("Current status"),
				detail: z.string().describe("Status detail (e.g. 'carries forward, expires 30 Jan 2027')"),
				handler: z.enum(["fa", "candidate", "facility", "credentially"]).optional().describe("Who handles this item"),
			})),
		})),
		recommendation: z.object({
			faPackageId: z.string().describe("Recommended FA package ID"),
			faPackageName: z.string().describe("Recommended FA package name"),
			reason: z.string().describe("Why this package was recommended"),
		}),
		workerPassportCount: z.number().describe("Number of items carrying forward from previous assignments"),
		newItemCount: z.number().describe("Number of new items for this placement"),
		estimatedTimeToCompliance: z.string().describe("Estimated time to full compliance"),
		blockers: z.array(z.string()).describe("Key blockers that must be resolved"),
		immediateActions: z.array(z.string()).describe("Actions that can start right away"),
	}),

	inputSchema: z.object({
		candidateSearch: z
			.string()
			.default("Ashlyn Torres")
			.describe("Candidate name, email, or profile ID"),
		targetState: z
			.string()
			.default("florida")
			.describe("US state for the placement (e.g. florida, texas, california)"),
		facilityName: z
			.string()
			.optional()
			.describe("Facility name (e.g. Memorial Hospital)"),
		roleName: z
			.string()
			.optional()
			.describe("Role name (e.g. Travel ICU RN)"),
		dealType: z
			.enum(["standard", "lapse", "quickstart", "reassignment"])
			.default("standard")
			.describe("Type of deal — affects package selection and carry-forward logic"),
	}),

	constraints: {
		maxSteps: 12,
		maxExecutionTime: 60000,
	},

	trigger: {
		type: "manual",
		description:
			"When a recruiter needs to assess compliance readiness for a placement",
	},

	oversight: { mode: "auto" },
};
