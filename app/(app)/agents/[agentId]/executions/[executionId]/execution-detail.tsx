"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
	ArrowLeft,
	AlertCircle,
	Square,
	Loader2,
	RotateCcw,
	Clock,
	Zap,
	Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExecutionTimeline } from "@/components/agents/execution-timeline";
import {
	ExecutionSummary,
	StatusBadge,
} from "@/components/agents/execution-summary";
import { useAgentExecution } from "@/hooks/use-agent-execution";
import type { AgentStep } from "@/lib/ai/agents/types";
import type { SerializedAgentDefinition } from "@/lib/ai/agents/types";

interface SerializedExecution {
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

function formatDate(date: string | Date): string {
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(date));
}

const statusDotColour: Record<string, string> = {
	completed: "#3a9960",
	failed: "#c93d4e",
	running: "#4444cf",
};

export function ExecutionDetail({
	execution: initialExecution,
	agent,
	executions,
}: ExecutionDetailProps) {
	const router = useRouter();
	const [execution, setExecution] = useState(initialExecution);
	const [stopping, setStopping] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);

	const isRunning = execution.status === "running";
	const isFailed = execution.status === "failed";
	const isCompleted = execution.status === "completed";

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

	useEffect(() => {
		if (isRunning && !isLiveConnected) {
			connectToExecution(agent.id, execution.id);
		}
	}, [isRunning, isLiveConnected, agent.id, execution.id, connectToExecution]);

	useEffect(() => {
		if (!isLiveConnected) return;

		if (liveSteps.length > 0) {
			setExecution((prev) => ({ ...prev, steps: liveSteps }));
		}
		if (liveStatus === "completed" || liveStatus === "failed") {
			setExecution((prev) => ({
				...prev,
				status: liveStatus,
				...(liveResult && {
					durationMs: liveResult.durationMs,
					tokensUsed: liveResult.usage,
					output: {
						summary: liveResult.summary,
						...(liveError && { error: liveError }),
					},
				}),
			}));
		}
	}, [liveStatus, liveSteps, liveResult, liveError, isLiveConnected]);

	useEffect(() => {
		if (isLiveConnected) {
			bottomRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [liveSteps, browserActions, isLiveConnected]);

	const steps = execution.steps || [];
	const errorMessage = execution.output?.error || liveError;

	const handleStop = useCallback(async () => {
		setStopping(true);
		try {
			const res = await fetch(
				`/api/agents/${agent.id}/executions/${execution.id}`,
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
			setExecution((prev) => ({
				...prev,
				status: "failed",
				output: { error: "Execution stopped by user" },
			}));
		} finally {
			setStopping(false);
		}
	}, [agent.id, execution.id]);

	const handleRerun = useCallback(() => {
		router.push(`/agents/${agent.id}`);
	}, [router, agent.id]);

	const currentStatus = isLiveConnected ? liveStatus : execution.status;

	return (
		<div className="flex h-dvh">
			{/* Left sidebar — runs list */}
			<div className="w-60 shrink-0 border-r border-[#e5e2db] bg-white flex flex-col">
				<div className="p-3 border-b border-[#e5e2db]">
					<Button variant="ghost" size="sm" className="h-7 -ml-2 text-xs" asChild>
						<Link href={`/agents/${agent.id}`}>
							<ArrowLeft className="size-3 mr-1" />
							{agent.name}
						</Link>
					</Button>
				</div>
				<div className="flex-1 overflow-y-auto">
					{executions.map((run) => {
						const isActive = run.id === execution.id;
						const dotColour = statusDotColour[run.status] || "#8a857d";
						return (
							<button
								key={run.id}
								type="button"
								onClick={() => {
									if (!isActive) {
										router.push(`/agents/${agent.id}/executions/${run.id}`);
									}
								}}
								className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
									isActive
										? "bg-[#f0ede7]"
										: "hover:bg-[#f7f5f0]"
								}`}
							>
								<span
									className="size-2 rounded-full shrink-0"
									style={{ backgroundColor: dotColour }}
								/>
								<div className="min-w-0 flex-1">
									<span className="text-xs text-[#1c1a15] block truncate">
										{formatDistanceToNow(new Date(run.createdAt), {
											addSuffix: true,
										})}
									</span>
									{run.durationMs != null && (
										<span className="text-xs text-[#8a857d]">
											{(run.durationMs / 1000).toFixed(1)}s
										</span>
									)}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Right area — metadata bar + steps */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Top metadata bar */}
				<div className="border-b border-[#e5e2db] bg-white px-4 py-3 flex items-center gap-4 text-xs">
					<StatusBadge status={currentStatus} />

					{/* Input values inline */}
					{execution.input && Object.keys(execution.input).length > 0 && (
						<div className="flex items-center gap-2 min-w-0">
							{Object.entries(execution.input).map(([key, value]) => (
								<span key={key} className="truncate max-w-48">
									<span className="text-[#8a857d]">{key}: </span>
									{typeof value === "string" && value.startsWith("http") ? (
										<a
											href={value}
											target="_blank"
											rel="noopener noreferrer"
											className="text-[#4444cf] hover:underline"
										>
											{value.length > 40 ? `${value.slice(0, 40)}...` : value}
										</a>
									) : (
										String(value)
									)}
								</span>
							))}
						</div>
					)}

					{/* Timing */}
					<div className="flex items-center gap-1.5 text-[#8a857d] shrink-0">
						<Clock className="size-3" />
						<span>{formatDate(execution.startedAt)}</span>
						{execution.durationMs != null && (
							<span>· {(execution.durationMs / 1000).toFixed(1)}s</span>
						)}
					</div>

					{/* Usage */}
					{execution.tokensUsed && (
						<div className="flex items-center gap-1.5 text-[#8a857d] shrink-0">
							<Zap className="size-3" />
							<span>{execution.tokensUsed.totalTokens.toLocaleString()} tokens</span>
						</div>
					)}
					{execution.model && (
						<div className="flex items-center gap-1.5 text-[#8a857d] shrink-0">
							<Cpu className="size-3" />
							<span>{execution.model}</span>
						</div>
					)}

					{/* Stop / Re-run — right-aligned */}
					<div className="ml-auto shrink-0">
						{currentStatus === "running" ? (
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
							<Button
								variant="outline"
								size="sm"
								className="h-7"
								onClick={handleRerun}
							>
								<RotateCcw className="size-3 mr-1" />
								Re-run
							</Button>
						)}
					</div>
				</div>

				{/* Main content — steps */}
				<div className="flex-1 overflow-y-auto bg-[#faf9f7] px-6 py-4">
					<div className="max-w-[600px] mx-auto">
					<h2 className="text-sm font-semibold text-[#1c1a15] mb-3">Steps</h2>
					<div className="flex flex-col gap-3">
						<ExecutionTimeline
							steps={steps}
							status={currentStatus === "running" ? "running" : currentStatus === "failed" ? "failed" : "completed"}
							liveViewUrl={liveViewUrl}
							browserActions={browserActions}
						/>

						{/* Error banner */}
						{(isFailed || currentStatus === "failed") && (
							<div className="flex items-start gap-3 rounded-lg border border-[#c93d4e]/20 bg-[#fdf0f1] p-3">
								<AlertCircle className="h-5 w-5 text-[#c93d4e] shrink-0 mt-0.5" />
								<div>
									<p className="font-semibold text-sm text-[#1c1a15]">
										Agent execution failed
									</p>
									<p className="text-xs text-[#c93d4e] mt-1">
										{errorMessage || execution.output?.summary || "An unknown error occurred"}
									</p>
								</div>
							</div>
						)}

						{/* Summary */}
						{(isCompleted || currentStatus === "completed") &&
							execution.durationMs &&
							execution.tokensUsed && (
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
		</div>
	);
}
