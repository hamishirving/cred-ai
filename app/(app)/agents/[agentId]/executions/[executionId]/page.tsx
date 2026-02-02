/**
 * Execution Detail Page
 *
 * Three-zone layout: runs sidebar, metadata bar, steps content.
 * Handles both live runs (SSE) and past run viewing.
 */

import { notFound } from "next/navigation";
import { getAgentExecution, getAgentExecutionsByAgentId } from "@/lib/db/queries";
import { getAgentDefinition, serializeAgent } from "@/lib/ai/agents/registry";
import { ExecutionDetail } from "./execution-detail";

export default async function ExecutionDetailPage(props: {
	params: Promise<{ agentId: string; executionId: string }>;
}) {
	const { agentId, executionId } = await props.params;

	const [execution, agentDef, allExecutions] = await Promise.all([
		getAgentExecution({ id: executionId }),
		Promise.resolve(getAgentDefinition(agentId)),
		getAgentExecutionsByAgentId({ agentId, limit: 50 }),
	]);

	if (!execution || execution.agentId !== agentId || !agentDef) {
		notFound();
	}

	const executionsSummary = allExecutions.map((e) => ({
		id: e.id,
		status: e.status,
		durationMs: e.durationMs,
		createdAt: typeof e.createdAt === "string" ? e.createdAt : e.createdAt.toISOString(),
	}));

	return (
		<ExecutionDetail
			execution={JSON.parse(JSON.stringify(execution))}
			agent={serializeAgent(agentDef)}
			executions={executionsSummary}
		/>
	);
}
