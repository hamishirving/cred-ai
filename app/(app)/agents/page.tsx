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
		<div className="flex flex-1 flex-col gap-10 p-8 bg-[#faf9f7] min-h-full">
			{/* Header */}
			<div>
				<h1 className="text-4xl font-semibold tracking-tight text-balance text-[#1c1a15]">Agents</h1>
				<p className="text-[#6b6760] text-sm mt-1">
					Autonomous AI agents for compliance automation
				</p>
			</div>

			<AgentLibrary agents={agents} />
		</div>
	);
}
