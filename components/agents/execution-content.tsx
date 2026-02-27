"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AlertCircle, Loader2, RotateCcw, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExecutionTimeline } from "@/components/agents/execution-timeline";
import {
	ExecutionSummary,
	StatusBadge,
} from "@/components/agents/execution-summary";
import { useAgentExecution } from "@/hooks/use-agent-execution";
import type { AgentStep } from "@/lib/ai/agents/types";

export interface SerializedExecution {
	id: string;
	agentId: string;
	status: string;
	input: Record<string, unknown> | null;
	steps: AgentStep[] | null;
	output: { summary?: string; error?: string } | null;
	tokensUsed: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	} | null;
	model: string | null;
	durationMs: number | null;
	startedAt: string;
	completedAt: string | null;
	createdAt: string;
}

interface ExecutionContentProps {
	agentId: string;
	agentName: string;
	executionId: string;
	/** Pre-loaded execution data (full page passes this, modal omits it) */
	initialExecution?: SerializedExecution;
	/** Renders a close button when provided (modal only) */
	onClose?: () => void;
	/** Hides re-run button (modal only) */
	hideRerun?: boolean;
}

function formatDate(date: string | Date): string {
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(date));
}

export function ExecutionContent({
	agentId,
	agentName,
	executionId,
	initialExecution,
	onClose,
	hideRerun,
}: ExecutionContentProps) {
	const [execution, setExecution] = useState(initialExecution ?? null);
	const [stopping, setStopping] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);

	const {
		status: liveStatus,
		steps: liveSteps,
		result: liveResult,
		error: liveError,
		liveViewUrl,
		browserActions,
		connectToExecution,
	} = useAgentExecution();

	const isLiveConnected = liveStatus !== "idle";

	// Connect to the execution for live updates
	useEffect(() => {
		const shouldConnect = initialExecution
			? initialExecution.status === "running" && !isLiveConnected
			: !isLiveConnected;

		if (shouldConnect) {
			connectToExecution(agentId, executionId);
		}
	}, [
		agentId,
		executionId,
		initialExecution,
		isLiveConnected,
		connectToExecution,
	]);

	// Merge live data into execution state
	useEffect(() => {
		if (!isLiveConnected) return;

		if (liveSteps.length > 0) {
			setExecution((prev) =>
				prev
					? { ...prev, steps: liveSteps }
					: {
							id: executionId,
							agentId,
							status: "running",
							input: null,
							steps: liveSteps,
							output: null,
							tokensUsed: null,
							model: null,
							durationMs: null,
							startedAt: new Date().toISOString(),
							completedAt: null,
							createdAt: new Date().toISOString(),
						},
			);
		}
		if (liveStatus === "completed" || liveStatus === "failed") {
			setExecution((prev) => {
				const base = prev ?? {
					id: executionId,
					agentId,
					status: liveStatus,
					input: null,
					steps: liveSteps,
					output: null,
					tokensUsed: null,
					model: null,
					durationMs: null,
					startedAt: new Date().toISOString(),
					completedAt: null,
					createdAt: new Date().toISOString(),
				};
				return {
					...base,
					status: liveStatus,
					...(liveResult && {
						durationMs: liveResult.durationMs,
						tokensUsed: liveResult.usage,
						output: {
							summary: liveResult.summary,
							...(liveError && { error: liveError }),
						},
					}),
				};
			});
		}
	}, [
		liveStatus,
		liveSteps,
		liveResult,
		liveError,
		isLiveConnected,
		executionId,
		agentId,
	]);

	// Auto-scroll to bottom on new steps
	useEffect(() => {
		if (isLiveConnected) {
			bottomRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [liveSteps, browserActions, isLiveConnected]);

	const steps = execution?.steps || [];
	const errorMessage = execution?.output?.error || liveError;
	const currentStatus = isLiveConnected
		? liveStatus
		: execution?.status || "running";
	const isRunning = currentStatus === "running";
	const isFailed = currentStatus === "failed";
	const isCompleted = currentStatus === "completed";

	const handleStop = useCallback(async () => {
		setStopping(true);
		try {
			const res = await fetch(
				`/api/agents/${agentId}/executions/${executionId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status: "failed" }),
				},
			);
			if (res.ok) {
				const data = await res.json();
				if (data.execution) {
					setExecution(data.execution);
				}
			}
		} catch {
			setExecution((prev) =>
				prev
					? {
							...prev,
							status: "failed",
							output: { error: "Execution stopped by user" },
						}
					: null,
			);
		} finally {
			setStopping(false);
		}
	}, [agentId, executionId]);

	return (
		<div className="flex-1 flex flex-col min-h-0 min-w-0">
			{/* Header bar */}
			<div className="shrink-0 border-b border-border bg-card px-4 py-2.5">
				<div className="flex items-center gap-3 text-xs">
					<StatusBadge status={currentStatus} />

					{execution?.startedAt && (
						<span className="text-muted-foreground">
							{formatDate(execution.startedAt)}
						</span>
					)}

					{execution?.durationMs != null && (
						<span className="text-muted-foreground">
							{(execution.durationMs / 1000).toFixed(1)}s
						</span>
					)}

					{execution?.tokensUsed && (
						<span className="text-muted-foreground">
							{execution.tokensUsed.totalTokens.toLocaleString()} tokens
						</span>
					)}

					{execution?.model && (
						<span className="text-muted-foreground">{execution.model}</span>
					)}

					<div className="ml-auto flex items-center gap-2 shrink-0">
						{isRunning ? (
							<Button
								variant="destructive"
								size="sm"
								className="h-7"
								onClick={handleStop}
								disabled={stopping}
							>
								{stopping ? (
									<Loader2 className="size-3 mr-1 animate-spin" />
								) : (
									<Square className="size-3 mr-1 fill-current" />
								)}
								Stop
							</Button>
						) : (
							!hideRerun && (
								<Button
									variant="outline"
									size="sm"
									className="h-7"
									onClick={() => {
										window.location.href = `/agents/${agentId}`;
									}}
								>
									<RotateCcw className="size-3 mr-1" />
									Re-run
								</Button>
							)
						)}
						{onClose && (
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7"
								onClick={onClose}
							>
								<X className="size-3.5" />
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Steps — scrollable area */}
			<div className="flex-1 overflow-y-auto min-h-0 bg-background px-6 py-4">
				<div className="max-w-[600px] mx-auto pb-12">
					<h2 className="mb-3 text-base font-semibold tracking-tight text-foreground">
						{agentName}
					</h2>
					<div className="flex flex-col gap-3">
						<ExecutionTimeline
							steps={steps}
							status={isRunning ? "running" : isFailed ? "failed" : "completed"}
							liveViewUrl={liveViewUrl}
							browserActions={browserActions}
						/>

						{isFailed && (
							<div className="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/10 p-3">
								<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
								<div>
									<p className="text-sm font-semibold text-foreground">
										Agent execution failed
									</p>
									<p className="mt-1 text-xs text-destructive">
										{errorMessage ||
											execution?.output?.summary ||
											"An unknown error occurred"}
									</p>
								</div>
							</div>
						)}

						{isCompleted && execution?.durationMs && execution?.tokensUsed && (
							<ExecutionSummary
								result={{
									status: "completed",
									summary: execution.output?.summary || "",
									steps,
									usage: execution.tokensUsed,
									durationMs: execution.durationMs,
									executionId: execution.id,
								}}
							/>
						)}

						<div ref={bottomRef} />
					</div>
				</div>
			</div>
		</div>
	);
}
