/**
 * Edit Agent Page
 *
 * Syncs agent definition from code to DB on each load, then renders the editor.
 * Code definitions are the source of truth for prompt, tools and constraints.
 */

import { notFound } from "next/navigation";
import { getAgentByCode, createAgentDefinition, updateAgentDefinition } from "@/lib/db/queries";
import { getAgentDefinition, serializeAgent } from "@/lib/ai/agents/registry";
import { getToolMetadata } from "@/lib/ai/agents/tool-resolver";
import { AgentEditor } from "./agent-editor";

export default async function EditAgentPage(props: {
	params: Promise<{ agentId: string }>;
}) {
	const params = await props.params;

	const codeDef = getAgentDefinition(params.agentId);
	if (!codeDef) {
		notFound();
	}

	const serialized = serializeAgent(codeDef);
	let agent = await getAgentByCode({ code: params.agentId });

	if (agent) {
		// Sync code definition to DB
		agent = await updateAgentDefinition({
			id: agent.id,
			name: codeDef.name,
			description: codeDef.description,
			version: codeDef.version,
			systemPrompt: codeDef.systemPrompt,
			tools: codeDef.tools,
			inputFields: serialized.inputFields,
			constraints: codeDef.constraints,
			trigger: {
				type: codeDef.trigger.type,
				description: codeDef.trigger.description,
			},
			oversight: codeDef.oversight,
		}) ?? agent;
	} else {
		// First time — create DB row from code
		agent = await createAgentDefinition({
			code: codeDef.id,
			name: codeDef.name,
			description: codeDef.description,
			version: codeDef.version,
			systemPrompt: codeDef.systemPrompt,
			tools: codeDef.tools,
			inputFields: serialized.inputFields,
			constraints: codeDef.constraints,
			trigger: {
				type: codeDef.trigger.type,
				description: codeDef.trigger.description,
			},
			oversight: codeDef.oversight,
		});
	}

	const availableTools = getToolMetadata();

	return <AgentEditor agent={agent} availableTools={availableTools} />;
}
