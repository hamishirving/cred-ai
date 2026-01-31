/**
 * Agent Registry
 *
 * Central registry of all agent definitions.
 * Agents are static config objects defined in code.
 */

import type { AgentDefinition, SerializedAgentDefinition } from "./types";
import { blsVerificationAgent } from "./definitions/bls-verification";

/** All registered agents */
const agents: Record<string, AgentDefinition> = {
	[blsVerificationAgent.id]: blsVerificationAgent,
};

/**
 * Get an agent definition by ID.
 */
export function getAgentDefinition(
	agentId: string,
): AgentDefinition | undefined {
	return agents[agentId];
}

/**
 * Get all registered agent definitions.
 */
export function getAllAgentDefinitions(): AgentDefinition[] {
	return Object.values(agents);
}

/**
 * Convert an AgentDefinition to a plain serialisable object
 * suitable for passing from server to client components.
 */
export function serializeAgent(
	agent: AgentDefinition,
): SerializedAgentDefinition {
	const schemaShape = agent.inputSchema.shape;
	const inputFields = Object.entries(schemaShape).map(([key, zodField]) => {
		const field = zodField as { description?: string; _def?: { typeName?: string } };
		return {
			key,
			label: key
				.replace(/([A-Z])/g, " $1")
				.replace(/^./, (s) => s.toUpperCase())
				.trim(),
			description: field.description || "",
			required: !field._def?.typeName?.includes("Optional"),
		};
	});

	return {
		id: agent.id,
		name: agent.name,
		description: agent.description,
		version: agent.version,
		systemPrompt: agent.systemPrompt,
		tools: agent.tools,
		inputFields,
		constraints: agent.constraints,
		trigger: agent.trigger,
		oversight: agent.oversight,
	};
}

/**
 * Get all agents as serialisable objects.
 */
export function getAllSerializedAgents(): SerializedAgentDefinition[] {
	return getAllAgentDefinitions().map(serializeAgent);
}
