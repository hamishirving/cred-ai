/**
 * Agent Overview Page
 *
 * Split layout: agent details left, runs table right.
 * Test button opens input dialog, creates execution, navigates to execution page.
 */

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getAgentDefinition, serializeAgent } from "@/lib/ai/agents/registry";
import { getSampleCandidate } from "@/lib/db/queries";
import { AgentPage } from "./agent-page";

export default async function AgentDetailPage(props: {
	params: Promise<{ agentId: string }>;
}) {
	const params = await props.params;
	const agent = getAgentDefinition(params.agentId);

	if (!agent) {
		notFound();
	}

	// Get sample candidate for pre-populating test inputs
	const cookieStore = await cookies();
	const organisationId = cookieStore.get("selectedOrgId")?.value;
	const sampleCandidate = organisationId
		? await getSampleCandidate({ organisationId })
		: null;

	return (
		<AgentPage
			agent={serializeAgent(agent)}
			sampleCandidate={sampleCandidate}
		/>
	);
}
