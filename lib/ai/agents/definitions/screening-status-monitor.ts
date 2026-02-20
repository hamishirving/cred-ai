/**
 * Screening Status Monitor Agent
 *
 * Checks the status of pending First Advantage screenings,
 * maps completed results back to compliance elements, and
 * provides a status report with per-component breakdown.
 */

import { z } from "zod";
import type { AgentDefinition } from "../types";

export const screeningStatusMonitorAgent: AgentDefinition = {
	id: "screening-status-monitor",
	name: "Screening Status Monitor",
	description:
		"Checks the status of pending First Advantage screenings, maps results back to compliance elements, and provides a status report.",
	version: "1.0",

	dynamicContext: async (ctx) => `Organisation ID: ${ctx.orgId}`,

	systemPrompt: `You are monitoring active background screenings via First Advantage.

The organisation ID for this session is provided in the CONTEXT section below. Use it for all tool calls that require an organisationId.

STEP 1 — GET SCREENING ID:
If a screeningId is provided in the input, use that directly.
If a candidateSearch is provided:
  1. Use searchLocalCandidates to find the candidate and get their profile ID (UUID)
  2. Use getAgentMemory with agentId "background-screening", subjectId set to the candidate's profile UUID, and the orgId from context. This is where the Background Screening agent saves screening details.
The memory payload contains the FA screening ID, package info, and candidate details.

STEP 2 — CHECK SCREENING STATUS:
For each active screening, use faCheckScreening to get the current status. This returns the overall status and per-component breakdown.

STEP 3 — GET REPORT (IF COMPLETE):
If a screening is complete, use faGetReport to get the report link.

STEP 4 — MAP TO COMPLIANCE:
Use getPlacementCompliance to understand the candidate's current compliance status. Map FA reportItem types to the ACTUAL compliance element slugs returned by getPlacementCompliance. Use ONLY slugs that appear in the compliance data. Common mappings:
- Enhanced Nationwide Criminal Search (7 year) → federal-background-check
- County Criminal Record → florida-level2-background (or the state-specific background element)
- State Criminal Repository → florida-level2-background (or the state-specific background element)
- DOJ Sex Offender Search → florida-level2-background (covered by state Level 2)
- FACIS L3 → florida-level2-background (covered by state Level 2)
- OIG-Excluded Parties → oig-exclusion-check
- GSA-Excluded Parties → sam-exclusion-check
- SSN Trace → federal-background-check (supporting check)
- Drivers Record → federal-background-check (supporting check)

Multiple FA components may map to the same compliance element (e.g. Florida Level 2 covers county, state, sex offender, and FACIS). That's correct — one compliance element can require multiple screening components. A compliance element can only be marked verified when ALL its mapped screening components are complete and clear.

IMPORTANT: Only include compliance elements that actually appear in the getPlacementCompliance results. Do not invent slugs.

STEP 5 — UPDATE MEMORY:
Use saveAgentMemory to update screening records — mark completed ones, update statuses.

STEP 6 — FINISH:
After completing all tool calls, write a single short sentence like "Status check complete." and stop. Do NOT write out the results as text — the data will be automatically structured into a visual dashboard from your tool results. Do NOT create tables, lists, or summaries of the screening items.`,

	tools: [
		"searchLocalCandidates",
		"faCheckScreening",
		"faGetReport",
		"getLocalProfile",
		"getPlacementCompliance",
		"resolvePlacementRequirements",
		"getAgentMemory",
		"saveAgentMemory",
		"createTask",
	],

	outputSchema: z.object({
		candidateName: z.string().describe("Full name of the candidate"),
		screeningId: z.string().describe("FA screening ID"),
		packageName: z.string().describe("FA package name (e.g. Healthcare Standard)"),
		overallStatus: z.enum(["Pending", "In Progress", "Complete"]).describe("Overall screening status"),
		overallResult: z.enum(["Pending", "Clear", "Consider", "Adverse"]).describe("Overall screening result"),
		submittedAt: z.string().describe("ISO timestamp when screening was submitted"),
		estimatedCompletionTime: z.string().optional().describe("Estimated completion time from FA"),
		portalLink: z.string().optional().describe("Sterling portal link (links.admin.web)"),
		reportLink: z.string().optional().describe("Report download link (only if complete)"),
		reportItems: z.array(z.object({
			type: z.string().describe("Human-readable name (e.g. SSN Trace, County Criminal Record)"),
			status: z.enum(["pending", "in_progress", "complete"]).describe("Item status"),
			result: z.string().nullable().describe("Result: clear, consider, adverse, or null if pending"),
			jurisdiction: z.string().optional().describe("Jurisdiction info (root/description combined)"),
			estimatedCompletionTime: z.string().optional().describe("Per-item estimated completion"),
		})),
		complianceImpact: z.array(z.object({
			reportItemType: z.string().describe("FA report item type name"),
			complianceElement: z.string().describe("Mapped compliance element slug"),
			canBeVerified: z.boolean().describe("Whether this element can now be marked verified"),
		})).describe("Mapping of FA report items to compliance elements"),
	}),

	inputSchema: z.object({
		screeningId: z
			.string()
			.optional()
			.describe("FA screening ID to check (or retrieve from agent memory)"),
		candidateSearch: z
			.string()
			.default("Ashlyn Torres")
			.describe("Candidate name to look up screening from memory"),
	}),

	constraints: {
		maxSteps: 20,
		maxExecutionTime: 60000,
	},

	trigger: {
		type: "manual",
		description: "When checking on pending background screenings",
	},

	oversight: { mode: "auto" },
};
