"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import faIcon from "@/app/FA-icon.png";
import { toast } from "@/components/toast";
import {
	AlertTriangle,
	ArrowUpRight,
	Check,
	CheckCircle2,
	Circle,
	Clock,
	MoreHorizontal,
	RefreshCw,
	Search,
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
import { recommendDHSProducts, DHS_ELEMENT_SLUGS } from "@/lib/api/first-advantage/dhs-catalogue";
import { DHSOrderDialog } from "@/components/placement/dhs-order-dialog";

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

interface ScreeningItem {
	slug: string;
	name: string;
	status: "met" | "expiring" | "expired" | "pending" | "requires_review" | "missing";
	expiresAt: string | null;
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

interface CandidateAddress {
	line1?: string;
	city?: string;
	state?: string;
	postcode?: string;
}

interface NextActionsSectionProps {
	tasks: PlacementTask[];
	screeningItems: ScreeningItem[];
	placement: PlacementInfo;
	context: PlacementContext;
	candidateAddress?: CandidateAddress | null;
	onRefresh?: () => Promise<void>;
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

/** Compliance element slugs associated with FA screening */
const SCREENING_SLUGS = new Set([
	"drug-screen",
	"tb-test",
	"physical-examination",
	"federal-background-check",
	"oig-exclusion-check",
	"sam-exclusion-check",
	"florida-level2-background",
]);

/** Categories that can be delegated to the AI companion */
const DELEGABLE_CATEGORIES = new Set(["chase_candidate", "follow_up", "expiry"]);

// ============================================
// Task classification
// ============================================

/** Detect FA screening tasks */
const isFaTask = (task: PlacementTask) =>
	task.category === "general" && task.title.startsWith("Initiate FA screening");

/** Detect screening-related escalation tasks */
const isScreeningEscalation = (task: PlacementTask) =>
	task.category === "escalation" &&
	task.complianceElementSlugs.some((slug) => SCREENING_SLUGS.has(slug));

/** Chase & Follow-up categories (includes expiry now) */
const isChaseTask = (task: PlacementTask) =>
	task.category === "chase_candidate" ||
	task.category === "follow_up" ||
	task.category === "expiry" ||
	task.category === "review_document" ||
	(task.category === "escalation" && !isScreeningEscalation(task));

// ============================================
// Screening item row
// ============================================

function ScreeningStatusIcon({ status, ordered }: { status: ScreeningItem["status"]; ordered?: boolean }) {
	if (ordered) {
		return <RefreshCw className="size-3.5 text-primary shrink-0" />;
	}
	switch (status) {
		case "met":
			return <CheckCircle2 className="size-3.5 text-[var(--positive)] shrink-0" />;
		case "pending":
		case "requires_review":
		case "missing":
			return <Circle className="size-3.5 text-[var(--warning)] shrink-0" />;
		case "expired":
			return <AlertTriangle className="size-3.5 text-destructive shrink-0" />;
		case "expiring":
			return <AlertTriangle className="size-3.5 text-[var(--warning)] shrink-0" />;
	}
}

const SCREENING_STATUS_LABELS: Record<string, string> = {
	met: "Complete",
	pending: "Pending",
	requires_review: "Review",
	missing: "Missing",
	expired: "Expired",
	expiring: "Expiring",
};

const SCREENING_STATUS_VARIANT: Record<string, "success" | "danger" | "warning" | "neutral"> = {
	met: "success",
	missing: "warning",
	expired: "danger",
	pending: "warning",
	requires_review: "warning",
	expiring: "warning",
};

function ScreeningItemRow({ item, ordered }: { item: ScreeningItem; ordered?: boolean }) {
	const showOrdered = ordered && item.status !== "met" && item.status !== "expired";

	return (
		<div className="flex items-center gap-3 px-4 py-2.5">
			<ScreeningStatusIcon status={item.status} ordered={showOrdered} />
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="text-sm truncate">{item.name}</span>
					<Image src={faIcon} alt="First Advantage" className="size-4 shrink-0" />
				</div>
				{item.expiresAt && (
					<p className="text-[10px] text-muted-foreground mt-0.5">
						{item.status === "expired" ? "Expired" : "Expires"}{" "}
						{format(new Date(item.expiresAt), "dd MMM yyyy")}
					</p>
				)}
			</div>
			{showOrdered ? (
				<Badge variant="info" className="text-[10px] font-medium shrink-0">
					Ordered
				</Badge>
			) : (
				<Badge
					variant={SCREENING_STATUS_VARIANT[item.status] || "neutral"}
					className="text-[10px] font-medium shrink-0"
				>
					{SCREENING_STATUS_LABELS[item.status] || item.status}
				</Badge>
			)}
		</div>
	);
}

// ============================================
// Component
// ============================================

export function NextActionsSection({
	tasks: initialTasks,
	screeningItems,
	placement,
	context,
	candidateAddress,
	onRefresh,
}: NextActionsSectionProps) {
	const router = useRouter();
	const [tasks, setTasks] = useState(initialTasks);
	const [submittingScreening, setSubmittingScreening] = useState(false);
	const [checkingStatus, setCheckingStatus] = useState(false);
	const [delegating, setDelegating] = useState(false);
	const [dhsDialogOpen, setDhsDialogOpen] = useState(false);

	// Only show pending + in_progress tasks
	const activeTasks = tasks.filter(
		(t) => t.status === "pending" || t.status === "in_progress",
	);

	// Find the FA task (drives screening header button state, not rendered as row)
	const faTask = activeTasks.find(isFaTask);

	// Screening escalation tasks render below screening items
	const screeningEscalations = activeTasks.filter(isScreeningEscalation);

	// Chase & Follow-up tasks (merged chase + follow-up + expiry)
	const chaseTasks = activeTasks.filter(
		(t) => !isFaTask(t) && isChaseTask(t),
	);

	// Outstanding screening items (not met)
	const outstandingScreening = screeningItems.filter((i) => i.status !== "met");

	// Show screening section when there are outstanding items or escalation tasks
	const hasScreeningContent = outstandingScreening.length > 0 || screeningEscalations.length > 0;

	// Tasks that can be delegated to the AI companion
	const delegableTasks = chaseTasks.filter(
		(t) => DELEGABLE_CATEGORIES.has(t.category || "") && !t.agentId,
	);

	// Total count for header badge
	const totalActionCount = outstandingScreening.length + screeningEscalations.length + chaseTasks.length;

	// D&OHS: check if any D&OHS-related items are outstanding
	const missingDHSSlugs = screeningItems
		.filter((i) => i.status !== "met" && DHS_ELEMENT_SLUGS.has(i.slug))
		.map((i) => i.slug);
	const hasDHSItems = missingDHSSlugs.length > 0;
	const preSelectedDHSCodes = recommendDHSProducts(missingDHSSlugs);

	// Hide the entire card when there's nothing to show
	if (!hasScreeningContent && chaseTasks.length === 0 && !faTask) return null;

	async function updateTask(id: string, updates: Record<string, unknown>) {
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
				setTasks(initialTasks);
				toast({ type: "error", description: "Failed to update task" });
			}
		} catch {
			setTasks(initialTasks);
			toast({ type: "error", description: "Failed to update task" });
		}
	}

	/** Shared SSE stream reader — fires onStart when executionId arrives, resolves when agent completes */
	async function streamAgentExecution(
		response: Response,
		onStart: (executionId: string) => void,
	): Promise<"completed" | "failed" | null> {
		if (!response.body) return null;

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		let executionId: string | null = null;

		try {
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

						if (eventData.executionId && !executionId) {
							executionId = eventData.executionId as string;
							onStart(executionId);
						}

						if (eventData.status && (eventData.status === "completed" || eventData.status === "failed")) {
							return eventData.status;
						}
					} catch {
						// Skip malformed events
					}
				}
			}
		} finally {
			reader.cancel();
		}

		return executionId ? "completed" : null;
	}

	async function handleInitiateScreening() {
		if (!faTask) return;
		setSubmittingScreening(true);

		try {
			const response = await fetch("/api/agents/background-screening/execute", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					candidateSearch: placement.candidateName,
					targetState: context.jurisdiction,
					facilityName: placement.facilityName,
					dealType: placement.dealType || "standard",
					placementId: placement.id,
				}),
			});

			if (!response.ok || !response.body) {
				toast({ type: "error", description: "Failed to initiate screening" });
				return;
			}

			const result = await streamAgentExecution(response, (execId) => {
				updateTask(faTask.id, { status: "in_progress" });
				toast({
					type: "success",
					description: "FA screening initiated",
					action: {
						label: "View \u2192",
						onClick: () => router.push(`/agents/background-screening/executions/${execId}`),
					},
				});
			});

			if (!result) {
				toast({ type: "error", description: "Screening failed to start" });
			} else {
				await onRefresh?.();
			}
		} catch (err) {
			console.error("Failed to initiate screening:", err);
			toast({ type: "error", description: "Failed to initiate screening" });
		} finally {
			setSubmittingScreening(false);
		}
	}

	async function handleCheckScreeningStatus() {
		setCheckingStatus(true);

		try {
			const response = await fetch("/api/agents/screening-status-monitor/execute", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					candidateSearch: placement.candidateName,
				}),
			});

			if (!response.ok || !response.body) {
				toast({ type: "error", description: "Failed to check screening status" });
				return;
			}

			const result = await streamAgentExecution(response, (execId) => {
				toast({
					type: "success",
					description: "Checking screening status\u2026",
					action: {
						label: "View \u2192",
						onClick: () => router.push(`/agents/screening-status-monitor/executions/${execId}`),
					},
				});
			});

			if (!result) {
				toast({ type: "error", description: "Status check failed to start" });
			} else {
				await onRefresh?.();
			}
		} catch (err) {
			console.error("Failed to check screening status:", err);
			toast({ type: "error", description: "Failed to check screening status" });
		} finally {
			setCheckingStatus(false);
		}
	}

	async function handleDelegateToAgent() {
		if (delegableTasks.length === 0) return;
		setDelegating(true);

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
								await onRefresh?.();
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
								await onRefresh?.();
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

	// ============================================
	// Task row renderer (for chase/escalation tasks)
	// ============================================

	function renderTaskRow(task: PlacementTask) {
		const isEscalation = task.category === "escalation";
		const isDelegated = !!task.agentId && task.agentId === "onboarding-companion";

		return (
			<div
				key={task.id}
				className="flex items-center gap-3 px-4 py-2.5"
			>
				{/* Priority indicator: AlertTriangle for escalations, dot for others */}
				{isEscalation ? (
					<AlertTriangle className="size-3.5 text-chart-3 shrink-0" />
				) : (
					<div
						className={cn(
							"w-1.5 h-1.5 rounded-full shrink-0",
							priorityConfig[task.priority].color,
						)}
					/>
				)}

				{/* Title + meta */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="text-sm truncate">{task.title}</span>
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
								className="text-[10px] text-primary hover:text-primary/70 underline underline-offset-2 cursor-pointer transition-colors duration-150"
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

				{/* Action menu */}
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
			</div>
		);
	}

	// ============================================
	// Screening section header button
	// ============================================

	function renderScreeningButtons() {
		return (
			<div className="flex items-center gap-1.5">
				{hasDHSItems && (
					<Button
						size="sm"
						variant="outline"
						onClick={() => setDhsDialogOpen(true)}
						className="text-xs gap-1.5 h-6"
					>
						Order D&OHS
						<Image src={faIcon} alt="FA" className="size-3.5" />
					</Button>
				)}
				{faTask && faTask.status === "in_progress" && (
					<Button
						size="sm"
						variant="outline"
						onClick={handleCheckScreeningStatus}
						disabled={checkingStatus}
						className="text-xs gap-1.5 h-6"
					>
						{checkingStatus ? (
							<>
								<RefreshCw className="size-3 animate-spin" />
								Checking…
							</>
						) : (
							<>
								<Search className="size-3" />
								Check Status
							</>
						)}
					</Button>
				)}
				{faTask && faTask.status !== "in_progress" && (
					<Button
						size="sm"
						onClick={handleInitiateScreening}
						disabled={submittingScreening}
						className="text-xs gap-1.5 h-6"
					>
						{submittingScreening ? (
							<>
								<RefreshCw className="size-3 animate-spin" />
								Starting…
							</>
						) : (
							<>
								Initiate FA Screening
								<ArrowUpRight className="size-3" />
							</>
						)}
					</Button>
				)}
			</div>
		);
	}

	return (
		<Card className="shadow-none! bg-card overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-border">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold">Next Actions</h2>
					{totalActionCount > 0 && (
						<span className="text-[10px] font-medium tabular-nums bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
							{totalActionCount}
						</span>
					)}
				</div>
			</div>

			<div className="divide-y divide-border">
				{/* Screening section */}
				{hasScreeningContent && (
					<div>
						<div className="flex items-center justify-between px-4 py-2 bg-muted/30">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Screening
							</span>
							{renderScreeningButtons()}
						</div>
						<div className="divide-y divide-border/50">
							{outstandingScreening.map((item) => (
								<ScreeningItemRow key={item.slug} item={item} ordered={faTask?.status === "in_progress"} />
							))}
							{screeningEscalations.map(renderTaskRow)}
						</div>
					</div>
				)}

				{/* Chase & Follow-up section */}
				{chaseTasks.length > 0 && (
					<div>
						<div className="flex items-center justify-between px-4 py-2 bg-muted/30">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Chase & Follow-up
							</span>
							{delegableTasks.length > 0 && (
								<Button
									size="sm"
									variant="outline"
									onClick={handleDelegateToAgent}
									disabled={delegating}
									className="text-xs gap-1.5 h-6"
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
						<div className="divide-y divide-border/50">
							{chaseTasks.map(renderTaskRow)}
						</div>
					</div>
				)}
			</div>

			<DHSOrderDialog
				open={dhsDialogOpen}
				onOpenChange={setDhsDialogOpen}
				placementId={placement.id}
				candidateName={placement.candidateName}
				candidateAddress={candidateAddress ?? null}
				preSelectedCodes={preSelectedDHSCodes}
				onOrderComplete={async () => {
					await onRefresh?.();
				}}
			/>
		</Card>
	);
}
