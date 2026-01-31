/**
 * Agent Executions History Page
 *
 * Shows past executions for an agent with status, duration, and token usage.
 */

import { notFound } from "next/navigation";
import { getAgentDefinition } from "@/lib/ai/agents/registry";
import { getAgentExecutionsByAgentId } from "@/lib/db/queries";
import { ExecutionHistory } from "./execution-history";

export default async function AgentExecutionsPage(props: {
	params: Promise<{ agentId: string }>;
}) {
	const params = await props.params;
	const agent = getAgentDefinition(params.agentId);

	if (!agent) {
		notFound();
	}

	const executions = await getAgentExecutionsByAgentId({
		agentId: agent.id,
		limit: 50,
	});

	return (
		<div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
			<ExecutionHistory agent={agent} executions={executions} />
		</div>
	);
}
