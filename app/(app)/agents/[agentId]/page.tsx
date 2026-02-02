/**
 * Agent Overview Page
 *
 * Split layout: agent details left, runs table right.
 * Test button opens input dialog, creates execution, navigates to execution page.
 */

import { notFound } from "next/navigation";
import { getAgentDefinition, serializeAgent } from "@/lib/ai/agents/registry";
import { AgentPage } from "./agent-page";

export default async function AgentDetailPage(props: {
	params: Promise<{ agentId: string }>;
}) {
	const params = await props.params;
	const agent = getAgentDefinition(params.agentId);

	if (!agent) {
		notFound();
	}

	return <AgentPage agent={serializeAgent(agent)} />;
}
