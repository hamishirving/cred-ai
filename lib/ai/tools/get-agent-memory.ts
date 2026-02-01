import { tool } from "ai";
import { z } from "zod";
import { getAgentMemory } from "@/lib/db/queries";

/**
 * Tool for reading agent memory during execution.
 *
 * Allows agents to recall context from previous runs — tone used,
 * items celebrated, blockers mentioned, etc.
 */
export const getAgentMemoryTool = tool({
	description: `Read persistent memory for this agent's previous interactions with a subject.
Use this to recall what happened in previous runs — what tone was used, what was celebrated,
what blockers were mentioned, compliance percentage at last run, etc.

Returns null if no memory exists (first run for this subject).`,

	inputSchema: z.object({
		agentId: z.string().describe("Agent identifier (e.g. 'onboarding-companion')"),
		subjectId: z.string().uuid().describe("Subject ID (usually a profile ID)"),
		orgId: z.string().uuid().describe("Organisation ID"),
	}),

	execute: async ({ agentId, subjectId, orgId }) => {
		console.log("[getAgentMemory] Loading memory:", { agentId, subjectId, orgId });

		try {
			const result = await getAgentMemory({ agentId, subjectId, orgId });

			if (!result) {
				return { data: null };
			}

			return {
				data: {
					memory: result.memory,
					runCount: result.runCount,
					lastRunAt: result.lastRunAt.toISOString(),
				},
			};
		} catch (error) {
			console.error("[getAgentMemory] Error:", error);
			return { error: "Failed to load agent memory." };
		}
	},
});
