"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import useSWRInfinite from "swr/infinite";
import { Button } from "@/components/ui/button";
import {
	ExecutionContent,
	type SerializedExecution,
} from "@/components/agents/execution-content";
import type { SerializedAgentDefinition } from "@/lib/ai/agents/types";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/utils";

interface ExecutionSummary {
	id: string;
	status: string;
	durationMs: number | null;
	createdAt: string;
}

interface ExecutionPage {
	executions: ExecutionSummary[];
	hasMore: boolean;
}

interface ExecutionDetailProps {
	execution: SerializedExecution;
	agent: SerializedAgentDefinition;
}

const statusDotClass: Record<string, string> = {
	completed: "bg-[var(--positive)]",
	failed: "bg-destructive",
	running: "bg-primary",
};

const PAGE_SIZE = 10;

function getExecutionsPaginationKey(agentId: string) {
	return (pageIndex: number, previousPageData: ExecutionPage | null) => {
		if (previousPageData && !previousPageData.hasMore) return null;
		if (pageIndex === 0) {
			return `/api/agents/${agentId}/executions?limit=${PAGE_SIZE}`;
		}
		const lastExecution = previousPageData?.executions.at(-1);
		if (!lastExecution) return null;
		return `/api/agents/${agentId}/executions?ending_before=${lastExecution.id}&limit=${PAGE_SIZE}`;
	};
}

export function ExecutionDetail({
	execution,
	agent,
}: ExecutionDetailProps) {
	const router = useRouter();
	const [activeId, setActiveId] = useState(execution.id);

	const {
		data: pages,
		setSize,
		isValidating,
		isLoading,
	} = useSWRInfinite<ExecutionPage>(
		getExecutionsPaginationKey(agent.id),
		fetcher,
		{ fallbackData: [] },
	);

	const allExecutions = pages?.flatMap((page) => page.executions) ?? [];
	const hasReachedEnd = pages?.some((page) => !page.hasMore) ?? false;

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
					{isLoading ? (
						<div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
							<Loader2 className="size-3 animate-spin" />
							Loading runs...
						</div>
					) : (
						<>
							{allExecutions.map((run) => {
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

							{/* Infinite scroll trigger */}
							<motion.div
								onViewportEnter={() => {
									if (!isValidating && !hasReachedEnd) {
										setSize((size) => size + 1);
									}
								}}
							/>

							{isValidating && !isLoading && (
								<div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
									<Loader2 className="size-3 animate-spin" />
									Loading more...
								</div>
							)}
						</>
					)}
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
