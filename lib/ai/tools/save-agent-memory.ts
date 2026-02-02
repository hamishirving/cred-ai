import { tool } from "ai";
import { z } from "zod";
import { upsertAgentMemory } from "@/lib/db/queries";

/**
 * Tool for persisting agent memory after execution.
 *
 * Saves context for future runs — tone used, items covered,
 * compliance state at time of run, etc.
 */
export const saveAgentMemoryTool = tool({
	description: `Save persistent memory for this agent's interaction with a subject.
Use this at the end of a run to record what was covered — tone used, items celebrated,
blockers mentioned, compliance percentage, etc. This data will be available on the next run.

Memory is merged (upserted) — if memory exists it will be replaced with the new payload.`,

	inputSchema: z.object({
		agentId: z.string().describe("Agent identifier (e.g. 'onboarding-companion')"),
		subjectId: z.string().uuid().describe("Subject ID (usually a profile ID)"),
		orgId: z.string().uuid().describe("Organisation ID"),
		memory: z
			.record(z.unknown())
			.describe("Memory payload to persist (replaces existing memory)"),
	}),

	execute: async ({ agentId, subjectId, orgId, memory }) => {
		console.log("[saveAgentMemory] Saving memory:", { agentId, subjectId, orgId });

		try {
			const result = await upsertAgentMemory({ agentId, subjectId, orgId, memory });

			return {
				data: {
					success: true,
					runCount: result.runCount,
				},
			};
		} catch (error) {
			console.error("[saveAgentMemory] Error:", error);
			return { error: "Failed to save agent memory." };
		}
	},
});
