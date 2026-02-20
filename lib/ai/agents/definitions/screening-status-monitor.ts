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
If a candidateSearch is provided, use getAgentMemory with key "fa-screenings" to find the screening ID for that candidate.
If neither is provided, use getAgentMemory to retrieve all active screening records.

STEP 2 — CHECK SCREENING STATUS:
For each active screening, use faCheckScreening to get the current status. This returns the overall status and per-component breakdown.

STEP 3 — GET REPORT (IF COMPLETE):
If a screening is complete, use faGetReport to get the report link.

STEP 4 — MAP TO COMPLIANCE:
Use getPlacementCompliance to understand the candidate's current compliance status. When screening results complete, explain which FA screening components map to which compliance elements:
- criminal_federal → federal-background-check
- criminal_county → county-background-check
- criminal_nationwide → nationwide-background-check
- ssn_trace → ssn-verification
- drug_test → drug-screen
- oig_exclusion / sam_exclusion → oig-exclusion-check / sam-exclusion-check
- sex_offender → sex-offender-check
- facis_level3 → facis-check

Reference the compliance status to show the impact of screening completion. Show which compliance elements can now be marked as verified.

STEP 5 — PRESENT STATUS:
For each screening, report:
- Candidate name and screening ID
- Overall status (pending / in_progress / complete) with clear visual indicator
- Per-component breakdown: component type, status, result if available
- Time elapsed since initiation
- If complete: overall result (clear / consider / adverse)
- If complete: which compliance elements can now be marked as verified
- Report link if available

STEP 6 — UPDATE MEMORY:
Use saveAgentMemory to update screening records — mark completed ones, update statuses.

Format as a clear status dashboard — scannable, with indicators for each screening and component.`,

	tools: [
		"faCheckScreening",
		"faGetReport",
		"getLocalProfile",
		"getPlacementCompliance",
		"resolvePlacementRequirements",
		"getAgentMemory",
		"saveAgentMemory",
		"createTask",
	],

	inputSchema: z.object({
		screeningId: z
			.string()
			.optional()
			.describe("FA screening ID to check (or retrieve from agent memory)"),
		candidateSearch: z
			.string()
			.optional()
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
