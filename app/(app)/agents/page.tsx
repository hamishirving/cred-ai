/**
 * Agents Landing Page
 *
 * Displays agent stats, agent list table, and recent runs table.
 */

import { getAllSerializedAgents } from "@/lib/ai/agents/registry";
import { AgentLibrary } from "./agent-library";

export default function AgentsPage() {
	const agents = getAllSerializedAgents();

	return (
		<div className="flex min-h-full flex-1 flex-col gap-10 bg-background p-8">
			{/* Header */}
			<div>
				<h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">Agents</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Autonomous AI agents for compliance automation
				</p>
			</div>

			<AgentLibrary agents={agents} />
		</div>
	);
}
