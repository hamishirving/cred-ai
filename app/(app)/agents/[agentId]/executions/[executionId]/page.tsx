/**
 * Execution Detail Page
 *
 * Three-zone layout: runs sidebar, metadata bar, steps content.
 * Handles both live runs (SSE) and past run viewing.
 */

import { notFound } from "next/navigation";
import { getAgentExecution } from "@/lib/db/queries";
import { getAgentDefinition, serializeAgent } from "@/lib/ai/agents/registry";
import { ExecutionDetail } from "./execution-detail";

export default async function ExecutionDetailPage(props: {
	params: Promise<{ agentId: string; executionId: string }>;
}) {
	const { agentId, executionId } = await props.params;

	const [execution, agentDef] = await Promise.all([
		getAgentExecution({ id: executionId }),
		Promise.resolve(getAgentDefinition(agentId)),
	]);

	if (!execution || execution.agentId !== agentId || !agentDef) {
		notFound();
	}

	return (
		<ExecutionDetail
			execution={JSON.parse(JSON.stringify(execution))}
			agent={serializeAgent(agentDef)}
		/>
	);
}
