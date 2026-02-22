"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import faIcon from "@/app/FA-icon.png";
import { toast } from "@/components/toast";
import {
	ArrowUpRight,
	Check,
	Clock,
	MoreHorizontal,
	RefreshCw,
	Sparkles,
	X,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

interface PlacementTask {
	id: string;
	title: string;
	description: string | null;
	priority: "urgent" | "high" | "medium" | "low";
	category: string | null;
	status: "pending" | "in_progress" | "completed" | "dismissed" | "snoozed";
	source: string;
	agentId: string | null;
	executionId: string | null;
	scheduledFor: string | null;
	complianceElementSlugs: string[];
	dueAt: string | null;
	snoozedUntil: string | null;
	createdAt: string;
}

interface PlacementContext {
	roleSlug: string;
	jurisdiction: string;
	facilityType: string;
	isLapseDeal?: boolean;
}

interface PlacementInfo {
	id: string;
	candidateName: string;
	facilityName: string;
	dealType: string | null;
}

interface NextActionsSectionProps {
	tasks: PlacementTask[];
	placement: PlacementInfo;
	context: PlacementContext;
}

// ============================================
// Config
// ============================================

const priorityConfig = {
	urgent: { color: "bg-destructive", badgeVariant: "danger" as const },
	high: { color: "bg-chart-3", badgeVariant: "warning" as const },
	medium: { color: "bg-chart-3/70", badgeVariant: "warning" as const },
	low: { color: "bg-muted-foreground/70", badgeVariant: "neutral" as const },
};

const categoryLabels: Record<string, string> = {
	general: "General",
	chase_candidate: "Chase",
	review_document: "Review",
	follow_up: "Follow-up",
	expiry: "Expiry",
	escalation: "Escalation",
};

/** Categories that can be delegated to the AI companion */
const DELEGABLE_CATEGORIES = new Set(["chase_candidate", "follow_up", "expiry"]);

// ============================================
// Component
// ============================================

export function NextActionsSection({ tasks: initialTasks, placement, context }: NextActionsSectionProps) {
	const router = useRouter();
	const [tasks, setTasks] = useState(initialTasks);
	const [submittingScreening, setSubmittingScreening] = useState(false);
	const [screeningInProgress, setScreeningInProgress] = useState(false);
	const [delegating, setDelegating] = useState(false);

	// Only show pending + in_progress tasks
	const activeTasks = tasks.filter(
		(t) => t.status === "pending" || t.status === "in_progress",
	);

	if (activeTasks.length === 0) return null;

	// Detect the FA screening task (category: general, title starts with "Initiate FA")
	const isFaTask = (task: PlacementTask) =>
		task.category === "general" && task.title.startsWith("Initiate FA screening");

	// Tasks that can be delegated to the AI companion
	const delegableTasks = activeTasks.filter(
		(t) => DELEGABLE_CATEGORIES.has(t.category || "") && !t.agentId,
	);

	async function updateTask(id: string, updates: Record<string, unknown>) {
		// Optimistic update
		setTasks((prev) =>
			prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
		);

		try {
			const response = await fetch(`/api/tasks/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				// Revert on failure
				setTasks(initialTasks);
				toast({ type: "error", description: "Failed to update task" });
			}
		} catch {
			setTasks(initialTasks);
			toast({ type: "error", description: "Failed to update task" });
		}
	}

	async function handleInitiateScreening(taskId: string) {
		setSubmittingScreening(true);
		setScreeningInProgress(false);

		try {
			const response = await fetch("/api/agents/background-screening/execute", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					candidateSearch: placement.candidateName,
					targetState: context.jurisdiction,
					facilityName: placement.facilityName,
					dealType: placement.dealType || "standard",
				}),
			});

			if (!response.ok || !response.body) {
				toast({ type: "error", description: "Failed to initiate screening" });
				return;
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let gotExecutionId = false;

			const processStream = async () => {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (line.startsWith("data: ")) {
							try {
								const eventData = JSON.parse(line.slice(6));
								if (eventData.executionId) {
									gotExecutionId = true;
									setScreeningInProgress(true);
									// Mark task as in_progress
									updateTask(taskId, { status: "in_progress" });
									const execId = eventData.executionId;
									toast({
										type: "success",
										description: "FA screening initiated",
										action: {
											label: "View \u2192",
											onClick: () => router.push(`/agents/background-screening/executions/${execId}`),
										},
									});
									reader.cancel();
									return;
								}
							} catch {
								// Skip malformed events
							}
						}
					}
				}
			};

			await processStream();

			if (!gotExecutionId) {
				toast({ type: "error", description: "Screening failed to start" });
			}
		} catch (err) {
			console.error("Failed to initiate screening:", err);
			toast({ type: "error", description: "Failed to initiate screening" });
		} finally {
			setSubmittingScreening(false);
		}
	}

	async function handleDelegateToAgent() {
		if (delegableTasks.length === 0) return;
		setDelegating(true);

		// Optimistic: mark all delegable tasks as in_progress with agentId
		const taskIds = delegableTasks.map((t) => t.id);
		setTasks((prev) =>
			prev.map((t) =>
				taskIds.includes(t.id)
					? { ...t, status: "in_progress" as const, agentId: "onboarding-companion" }
					: t,
			),
		);

		try {
			const response = await fetch("/api/agents/onboarding-companion/execute", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					candidateName: placement.candidateName,
				}),
			});

			if (!response.ok || !response.body) {
				setTasks(initialTasks);
				toast({ type: "error", description: "Failed to delegate to AI companion" });
				return;
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let executionId: string | null = null;

			// Read SSE stream — first for executionId, then for completion
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (!line.startsWith("data: ")) continue;
					try {
						const eventData = JSON.parse(line.slice(6));

						// Phase 1: Got executionId — mark tasks in_progress
						if (eventData.executionId && !executionId) {
							executionId = eventData.executionId;
							const inProgressUpdates = {
								status: "in_progress" as const,
								agentId: "onboarding-companion",
								executionId,
							};
							for (const taskId of taskIds) {
								fetch(`/api/tasks/${taskId}`, {
									method: "PATCH",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify(inProgressUpdates),
								});
							}
							setTasks((prev) =>
								prev.map((t) =>
									taskIds.includes(t.id)
										? { ...t, ...inProgressUpdates }
										: t,
								),
							);
							toast({
								type: "success",
								description: `Delegated ${taskIds.length} item${taskIds.length !== 1 ? "s" : ""} to AI Companion`,
								action: {
									label: "View \u2192",
									onClick: () => router.push(`/agents/onboarding-companion/executions/${executionId}`),
								},
							});
						}

						// Phase 2: Agent finished — mark tasks completed or revert
						if (eventData.status && executionId) {
							if (eventData.status === "completed") {
								const completedUpdates = { status: "completed" as const };
								for (const taskId of taskIds) {
									fetch(`/api/tasks/${taskId}`, {
										method: "PATCH",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify(completedUpdates),
									});
								}
								setTasks((prev) =>
									prev.map((t) =>
										taskIds.includes(t.id)
											? { ...t, status: "completed" as const }
											: t,
									),
								);
								toast({
									type: "success",
									description: `AI Companion finished — ${taskIds.length} task${taskIds.length !== 1 ? "s" : ""} completed`,
								});
							} else if (eventData.status === "failed") {
								const revertUpdates = { status: "pending" as const, agentId: null, executionId: null };
								for (const taskId of taskIds) {
									fetch(`/api/tasks/${taskId}`, {
										method: "PATCH",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify(revertUpdates),
									});
								}
								setTasks((prev) =>
									prev.map((t) =>
										taskIds.includes(t.id)
											? { ...t, ...revertUpdates }
											: t,
									),
								);
								toast({ type: "error", description: "AI Companion failed — tasks reverted" });
							}
							reader.cancel();
							return;
						}
					} catch {
						// Skip malformed events
					}
				}
			}

			if (!executionId) {
				setTasks(initialTasks);
				toast({ type: "error", description: "Delegation failed to start" });
			}
		} catch (err) {
			console.error("Failed to delegate to agent:", err);
			setTasks(initialTasks);
			toast({ type: "error", description: "Failed to delegate to AI companion" });
		} finally {
			setDelegating(false);
		}
	}

	return (
		<Card className="shadow-none! bg-card overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-border">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold">Next Actions</h2>
					<span className="text-[10px] font-medium tabular-nums bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
						{activeTasks.length}
					</span>
				</div>

				{/* Delegate button */}
				{delegableTasks.length > 0 && (
					<Button
						size="sm"
						variant="outline"
						onClick={handleDelegateToAgent}
						disabled={delegating}
						className="text-xs gap-1.5"
					>
						{delegating ? (
							<>
								<RefreshCw className="size-3 animate-spin" />
								Delegating…
							</>
						) : (
							<>
								<Sparkles className="size-3" />
								Delegate {delegableTasks.length} to AI
							</>
						)}
					</Button>
				)}
			</div>

			{/* Task list */}
			<div className="divide-y divide-border">
				{activeTasks.map((task) => {
					const isFA = isFaTask(task);
					const isDelegated = !!task.agentId && task.agentId === "onboarding-companion";

					return (
						<div
							key={task.id}
							className="flex items-center gap-3 px-4 py-2.5"
						>
							{/* Priority dot */}
							<div
								className={cn(
									"w-1.5 h-1.5 rounded-full shrink-0",
									priorityConfig[task.priority].color,
								)}
							/>

							{/* Title + meta */}
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<span className="text-sm truncate">{task.title}</span>
									{isFA && (
										<Image src={faIcon} alt="First Advantage" className="size-4 shrink-0" />
									)}
									{isDelegated && (
										<span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
											<Sparkles className="size-2.5" />
											AI
										</span>
									)}
								</div>
								<div className="flex items-center gap-2 mt-0.5">
									{task.category && (
										<span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0 rounded-full">
											{categoryLabels[task.category] || task.category}
										</span>
									)}
									{task.dueAt && (
										<span
											className={cn(
												"text-[10px] tabular-nums",
												new Date(task.dueAt) < new Date()
													? "text-destructive font-medium"
													: "text-muted-foreground",
											)}
										>
											Due {format(new Date(task.dueAt), "MMM d")}
										</span>
									)}
									{isDelegated && task.executionId && (
										<button
											type="button"
											onClick={() => router.push(`/agents/onboarding-companion/executions/${task.executionId}`)}
											className="text-[10px] text-primary hover:underline"
										>
											View execution
										</button>
									)}
								</div>
							</div>

							{/* Priority badge */}
							<Badge
								variant={priorityConfig[task.priority].badgeVariant}
								className="text-[10px] font-medium shrink-0"
							>
								{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
							</Badge>

							{/* FA screening button or action menu */}
							{isFA ? (
								<Button
									size="sm"
									onClick={() => handleInitiateScreening(task.id)}
									disabled={submittingScreening || screeningInProgress}
									className="shrink-0"
								>
									{submittingScreening ? (
										<>
											<RefreshCw className="size-3 mr-1.5 animate-spin" />
											Starting…
										</>
									) : screeningInProgress ? (
										<>
											<RefreshCw className="size-3 mr-1.5 animate-spin" />
											In progress
										</>
									) : (
										<>
											Initiate FA Screening
											<ArrowUpRight className="size-3 ml-1.5" />
										</>
									)}
								</Button>
							) : (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 shrink-0"
											aria-label="Task actions"
										>
											<MoreHorizontal className="size-3.5" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={() => updateTask(task.id, { status: "completed" })}
										>
											<Check className="mr-2 h-4 w-4" />
											Complete
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() =>
												updateTask(task.id, {
													status: "snoozed",
													snoozedUntil: new Date(
														Date.now() + 24 * 60 * 60 * 1000,
													).toISOString(),
												})
											}
										>
											<Clock className="mr-2 h-4 w-4" />
											Snooze 1 Day
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={() => updateTask(task.id, { status: "dismissed" })}
											className="text-muted-foreground"
										>
											<X className="mr-2 h-4 w-4" />
											Dismiss
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>
					);
				})}
			</div>
		</Card>
	);
}
