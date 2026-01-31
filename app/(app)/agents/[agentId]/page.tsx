/**
 * Agent Detail Page
 *
 * Shows agent definition + input form generated from inputSchema.
 */

import { notFound } from "next/navigation";
import { getAgentDefinition, serializeAgent } from "@/lib/ai/agents/registry";
import { AgentDetail } from "./agent-detail";

export default async function AgentDetailPage(props: {
	params: Promise<{ agentId: string }>;
}) {
	const params = await props.params;
	const agent = getAgentDefinition(params.agentId);

	if (!agent) {
		notFound();
	}

	return (
		<div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
			<AgentDetail agent={serializeAgent(agent)} />
		</div>
	);
}
