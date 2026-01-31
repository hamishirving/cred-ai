/**
 * Edit Agent Page
 *
 * Loads agent from DB and renders the split-panel editor.
 * If agent doesn't exist in DB yet, seeds it from the code registry.
 */

import { notFound } from "next/navigation";
import { getAgentByCode, createAgentDefinition } from "@/lib/db/queries";
import { getAgentDefinition, serializeAgent } from "@/lib/ai/agents/registry";
import { AgentEditor } from "./agent-editor";

export default async function EditAgentPage(props: {
	params: Promise<{ agentId: string }>;
}) {
	const params = await props.params;

	// Try to load from DB first
	let agent = await getAgentByCode({ code: params.agentId });

	// If not in DB, seed from code registry
	if (!agent) {
		const codeDef = getAgentDefinition(params.agentId);
		if (!codeDef) {
			notFound();
		}

		const serialized = serializeAgent(codeDef);
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

	return <AgentEditor agent={agent} />;
}
