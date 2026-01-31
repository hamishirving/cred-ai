"use client";

import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Wrench, Shield, Zap, Pencil } from "lucide-react";
import type { SerializedAgentDefinition } from "@/lib/ai/agents/types";

interface AgentCardProps {
	agent: SerializedAgentDefinition;
}

export function AgentCard({ agent }: AgentCardProps) {
	return (
		<Card className="flex flex-col">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="text-sm font-medium">
						{agent.name}
					</CardTitle>
					<Badge variant="secondary" className="text-xs shrink-0">
						v{agent.version}
					</Badge>
				</div>
				<CardDescription className="text-xs line-clamp-2">
					{agent.description}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2 pt-0 mt-auto">
				{/* Metadata badges */}
				<div className="flex flex-wrap gap-1">
					<Badge variant="outline" className="text-xs gap-1">
						<Zap className="size-2.5" />
						{agent.trigger.type}
					</Badge>
					<Badge variant="outline" className="text-xs gap-1">
						<Shield className="size-2.5" />
						{agent.oversight.mode}
					</Badge>
					<Badge variant="outline" className="text-xs gap-1">
						<Wrench className="size-2.5" />
						{agent.tools.length}
					</Badge>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-between pt-1">
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="sm" className="text-xs" asChild>
							<Link href={`/agents/${agent.id}/executions`}>
								History
							</Link>
						</Button>
						<Button variant="ghost" size="sm" className="text-xs" asChild>
							<Link href={`/agents/${agent.id}/edit`}>
								<Pencil className="size-3 mr-1" />
								Edit
							</Link>
						</Button>
					</div>
					<Button size="sm" asChild>
						<Link href={`/agents/${agent.id}`}>
							<Play className="size-3 mr-1" />
							Run
						</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
