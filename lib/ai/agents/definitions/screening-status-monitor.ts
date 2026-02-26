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
		"Checks the status of pending First Advantage screenings, maps results back to compliance elements, detects anomalies (e.g. negative dilute), and creates escalations when human decisions are needed.",
	version: "1.1",

	dynamicContext: async (ctx) => `Organisation ID: ${ctx.orgId}`,

	systemPrompt: `You are monitoring active background screenings via First Advantage.

The organisation ID for this session is provided in the CONTEXT section below. Use it for all tool calls that require an organisationId.

STEP 1 — GET SCREENING ID:
If a screeningId is provided in the input, use that directly.
If a candidateSearch is provided:
  1. Use searchLocalCandidates to find the candidate and get their profile ID (UUID).
  2. Use faListScreenings with the profileId to query the database for screening records. This is the primary source of truth — it returns all FA screening records for that candidate, ordered by most recent first. Pick the most recent active one.
  3. If faListScreenings returns no results, try faListScreenings with candidateName as a fallback.
  4. Optionally, check getAgentMemory for additional context (placementId, notes), but do NOT depend on it for the screening ID.

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
- Drug Screen - 13 Panel → drug-screen
- TB Test - QuantiFERON → tb-test
- Physical Examination → physical-examination

Multiple FA components may map to the same compliance element (e.g. Florida Level 2 covers county, state, sex offender, and FACIS). That's correct — one compliance element can require multiple screening components. A compliance element can only be marked verified when ALL its mapped screening components are complete and clear.

IMPORTANT: Only include compliance elements that actually appear in the getPlacementCompliance results. Do not invent slugs.

STEP 4.5 — DETECT ANOMALIES:
After mapping results, check for anomalies that require human decisions:

**Negative Dilute:** If any drug screen report item has result "negative_dilute", this means the urine specimen was too dilute to confirm a negative result. This is NOT a positive — it's inconclusive. Most employer policies require a recollection.

When you detect a negative dilute:
1. Use createEscalation to create a high-priority escalation with:
   - escalationType: "verification_failed"
   - priority: "high"
   - question: "Drug Screen returned Negative Dilute — how should we proceed?"
   - aiReasoning: Explain that the specimen was too dilute for a definitive negative, that this is common (hydration, diuretics) and not indicative of substance use, but most employer policies require action.
   - aiRecommendation: "Order Recollection — most common policy response, gives the candidate another chance with a supervised collection."
   - complianceElementSlug: "drug-screen"
   - 3 options:
     a) "Order Recollection" (isRecommended: true, action type: "custom", config: { action: "order_recollection" }) — Schedule a new supervised collection. Most common response per SAMHSA guidelines.
     b) "Accept as Negative" (action type: "approve") — Accept the dilute specimen as negative. Some policies allow this for non-safety-sensitive roles.
     c) "Escalate to MRO" (action type: "escalate") — Send to Medical Review Officer for clinical evaluation. Required if there's reason for concern.

2. Also use createTask to surface the escalation on the placement:
   - title: "Drug Screen: Negative Dilute — decision required"
   - category: "escalation"
   - priority: "high"
   - subjectType: "placement"
   - subjectId: the placementId from the agent memory (if available)
   - complianceElementSlugs: ["drug-screen"]
   - assigneeFirstName: "Sarah" (Compliance Manager)
   - agentId: "screening-status-monitor"

3. Include the escalation data in your structured output.

STEP 5 — UPDATE MEMORY:
Use saveAgentMemory to update screening records — mark completed ones, update statuses.

STEP 6 — FINISH:
After completing all tool calls, write a single short sentence like "Status check complete." and stop. Do NOT write out the results as text — the data will be automatically structured into a visual dashboard from your tool results. Do NOT create tables, lists, or summaries of the screening items.`,

	tools: [
		"searchLocalCandidates",
		"faCheckScreening",
		"faListScreenings",
		"faGetReport",
		"getLocalProfile",
		"getPlacementCompliance",
		"resolvePlacementRequirements",
		"getAgentMemory",
		"saveAgentMemory",
		"createTask",
		"createEscalation",
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
		escalation: z.object({
			escalationId: z.string(),
			type: z.string(),
			priority: z.string(),
			question: z.string(),
			aiReasoning: z.string(),
			aiRecommendation: z.string(),
			options: z.array(z.object({
				id: z.string(),
				label: z.string(),
				description: z.string(),
				isRecommended: z.boolean(),
			})),
		}).optional().describe("Escalation created if an anomaly was detected (e.g. negative dilute)"),
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
