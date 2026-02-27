"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	ExecutionContent,
	type SerializedExecution,
} from "@/components/agents/execution-content";
import type { SerializedAgentDefinition } from "@/lib/ai/agents/types";
import { cn } from "@/lib/utils";

interface SerializedExecutionSummary {
	id: string;
	status: string;
	durationMs: number | null;
	createdAt: string;
}

interface ExecutionDetailProps {
	execution: SerializedExecution;
	agent: SerializedAgentDefinition;
	executions: SerializedExecutionSummary[];
}

const statusDotClass: Record<string, string> = {
	completed: "bg-[var(--positive)]",
	failed: "bg-destructive",
	running: "bg-primary",
};

export function ExecutionDetail({
	execution,
	agent,
	executions,
}: ExecutionDetailProps) {
	const router = useRouter();
	const [activeId, setActiveId] = useState(execution.id);

	return (
		<div className="flex h-dvh">
			{/* Left sidebar — runs list */}
			<div className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
				<div className="border-b border-border p-3">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 -ml-2 text-xs"
						asChild
					>
						<Link href={`/agents/${agent.id}`}>
							<ArrowLeft className="size-3 mr-1" />
							{agent.name}
						</Link>
					</Button>
				</div>
				<div className="flex-1 overflow-y-auto min-h-0">
					{executions.map((run) => {
						const isActive = run.id === activeId;
						const dotClass =
							statusDotClass[run.status] || "bg-muted-foreground";
						return (
							<button
								key={run.id}
								type="button"
								onClick={() => {
									if (!isActive) {
										setActiveId(run.id);
										router.push(`/agents/${agent.id}/executions/${run.id}`);
									}
								}}
								className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
									isActive ? "bg-muted" : "hover:bg-muted/70"
								}`}
							>
								<span
									className={cn("size-2 rounded-full shrink-0", dotClass)}
								/>
								<div className="min-w-0 flex-1">
									<span className="block truncate text-xs text-foreground">
										{formatDistanceToNow(new Date(run.createdAt), {
											addSuffix: true,
										})}
									</span>
									{run.durationMs != null && (
										<span className="text-xs text-muted-foreground">
											{(run.durationMs / 1000).toFixed(1)}s
										</span>
									)}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Right area — shared execution content */}
			<ExecutionContent
				agentId={agent.id}
				agentName={agent.name}
				executionId={execution.id}
				initialExecution={execution}
			/>
		</div>
	);
}
