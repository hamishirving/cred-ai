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
		<div className="flex flex-1 flex-col gap-4 p-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-semibold">Agents</h1>
				<p className="text-muted-foreground text-sm">
					Autonomous AI agents for compliance automation
				</p>
			</div>

			<AgentLibrary agents={agents} />
		</div>
	);
}
