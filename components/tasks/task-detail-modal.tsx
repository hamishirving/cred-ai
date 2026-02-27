"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
	ArrowUpRight,
	Bell,
	Bot,
	Check,
	Clock,
	ExternalLink,
	Sparkles,
	Tag,
	UserCircle,
	X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface TaskSubject {
	type: string;
	id: string | null;
	name?: string;
	email?: string;
	facility?: string;
}

interface Task {
	id: string;
	organisationId: string;
	title: string;
	description: string | null;
	priority: "urgent" | "high" | "medium" | "low";
	category: string | null;
	status: "pending" | "in_progress" | "completed" | "dismissed" | "snoozed";
	source: "ai_agent" | "manual" | "system";
	agentId: string | null;
	insightId: string | null;
	executionId: string | null;
	aiReasoning: string | null;
	complianceElementSlugs?: string[] | null;
	subjectType: string | null;
	subjectId: string | null;
	assigneeId: string | null;
	assigneeRole: string | null;
	scheduledFor: string | null;
	dueAt: string | null;
	snoozedUntil: string | null;
	completedAt: string | null;
	completedBy: string | null;
	completionNotes: string | null;
	createdAt: string;
	updatedAt: string;
	subject?: TaskSubject | null;
}

interface TaskDetailModalProps {
	task: Task | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: (id: string, updates: Record<string, unknown>) => Promise<void>;
	candidateLabel?: string;
}

const priorityConfig = {
	urgent: { label: "Urgent", badgeVariant: "danger" as const },
	high: { label: "High", badgeVariant: "warning" as const },
	medium: { label: "Medium", badgeVariant: "warning" as const },
	low: { label: "Low", badgeVariant: "neutral" as const },
};

const statusConfig = {
	pending: { label: "Pending", icon: Clock, color: "text-[var(--warning)]" },
	in_progress: {
		label: "In Progress",
		icon: ArrowUpRight,
		color: "text-primary",
	},
	completed: {
		label: "Completed",
		icon: Check,
		color: "text-[var(--positive)]",
	},
	dismissed: {
		label: "Dismissed",
		icon: X,
		color: "text-muted-foreground",
	},
	snoozed: { label: "Snoozed", icon: Bell, color: "text-muted-foreground" },
};

const sourceLabels: Record<string, string> = {
	ai_agent: "AI Agent",
	manual: "Manual",
	system: "System",
};

const assigneeRoleOptions = [
	{ value: "admin", label: "Admin" },
	{ value: "recruiter", label: "Recruiter" },
	{ value: "compliance_officer", label: "Compliance Officer" },
	{ value: "manager", label: "Manager" },
];

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function TaskDetailModal({
	task,
	open,
	onOpenChange,
	onUpdate,
	candidateLabel = "Candidate",
}: TaskDetailModalProps) {
	const [editingTitle, setEditingTitle] = useState(false);
	const [titleValue, setTitleValue] = useState("");
	const [descriptionValue, setDescriptionValue] = useState("");
	const [saving, setSaving] = useState(false);
	const titleInputRef = useRef<HTMLInputElement>(null);
	const descriptionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	// Sync local state when task changes
	useEffect(() => {
		if (task) {
			setTitleValue(task.title);
			setDescriptionValue(task.description || "");
			setEditingTitle(false);
		}
	}, [task]);

	// Focus title input when editing starts
	useEffect(() => {
		if (editingTitle && titleInputRef.current) {
			titleInputRef.current.focus();
			titleInputRef.current.select();
		}
	}, [editingTitle]);

	const saveTitle = useCallback(async () => {
		if (!task || titleValue.trim() === task.title) {
			setEditingTitle(false);
			return;
		}
		setSaving(true);
		await onUpdate(task.id, { title: titleValue.trim() });
		setSaving(false);
		setEditingTitle(false);
	}, [task, titleValue, onUpdate]);

	const handleDescriptionChange = useCallback(
		(value: string) => {
			setDescriptionValue(value);
			if (descriptionTimeoutRef.current) {
				clearTimeout(descriptionTimeoutRef.current);
			}
			descriptionTimeoutRef.current = setTimeout(async () => {
				if (task && value !== (task.description || "")) {
					await onUpdate(task.id, { description: value });
				}
			}, 800);
		},
		[task, onUpdate],
	);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (descriptionTimeoutRef.current) {
				clearTimeout(descriptionTimeoutRef.current);
			}
		};
	}, []);

	const handleFieldUpdate = useCallback(
		async (field: string, value: unknown) => {
			if (!task) return;
			setSaving(true);
			await onUpdate(task.id, { [field]: value });
			setSaving(false);
		},
		[task, onUpdate],
	);

	if (!task) return null;

	const isActionable =
		task.status === "pending" ||
		task.status === "in_progress" ||
		task.status === "snoozed";
	const isDone = task.status === "completed" || task.status === "dismissed";
	const StatusIcon = statusConfig[task.status].icon;
	const isOverdue =
		task.dueAt && new Date(task.dueAt) < new Date() && isActionable;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0">
				{/* Header */}
				<div className="p-6 pb-4 space-y-3">
					<DialogHeader className="space-y-1">
						<div className="flex items-start gap-2 pr-8">
							{editingTitle ? (
								<Input
									ref={titleInputRef}
									value={titleValue}
									onChange={(e) => setTitleValue(e.target.value)}
									onBlur={saveTitle}
									onKeyDown={(e) => {
										if (e.key === "Enter") saveTitle();
										if (e.key === "Escape") {
											setTitleValue(task.title);
											setEditingTitle(false);
										}
									}}
									className="text-lg font-semibold h-auto py-1 px-2 -ml-2"
								/>
							) : (
								<DialogTitle
									className="text-lg cursor-pointer hover:text-primary transition-colors duration-150 leading-tight"
									onClick={() => setEditingTitle(true)}
								>
									{task.title}
								</DialogTitle>
							)}
						</div>
						<DialogDescription className="flex items-center gap-2">
							<StatusIcon
								className={cn("h-3.5 w-3.5", statusConfig[task.status].color)}
							/>
							<span className={statusConfig[task.status].color}>
								{statusConfig[task.status].label}
							</span>
							<span className="text-muted-foreground/50">&middot;</span>
							<Badge
								variant={priorityConfig[task.priority].badgeVariant}
								className="text-xs"
							>
								{priorityConfig[task.priority].label}
							</Badge>
							{task.source === "ai_agent" && (
								<>
									<span className="text-muted-foreground/50">&middot;</span>
									<Sparkles className="h-3 w-3 text-primary/60" />
									<span className="text-xs text-muted-foreground">AI</span>
								</>
							)}
						</DialogDescription>
					</DialogHeader>

					{/* Action bar */}
					<div className="flex items-center gap-2">
						{isActionable && (
							<>
								<Button
									variant="outline"
									size="sm"
									className="h-8 text-xs text-[var(--positive)]"
									onClick={() => handleFieldUpdate("status", "completed")}
								>
									<Check className="h-3.5 w-3.5 mr-1.5" />
									Complete
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 text-xs text-muted-foreground"
									onClick={() => handleFieldUpdate("status", "snoozed")}
								>
									<Bell className="h-3.5 w-3.5 mr-1.5" />
									Snooze
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 text-xs text-muted-foreground"
									onClick={() => handleFieldUpdate("status", "dismissed")}
								>
									<X className="h-3.5 w-3.5 mr-1.5" />
									Dismiss
								</Button>
							</>
						)}
						{isDone && (
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs"
								onClick={() => handleFieldUpdate("status", "pending")}
							>
								<ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
								Reopen
							</Button>
						)}
					</div>
				</div>

				<Separator />

				{/* Body */}
				<div className="p-6 space-y-6">
					{/* Subject */}
					{task.subject?.name && (
						<div className="space-y-2">
							<Label className="text-xs text-muted-foreground">
								{task.subjectType === "placement"
									? "Placement"
									: candidateLabel}
							</Label>
							<Link
								href={
									task.subjectType === "placement"
										? `/placements/${task.subjectId}`
										: `/candidates/${task.subjectId}`
								}
								className="flex items-center gap-3 rounded-md border border-border p-3 transition-colors duration-150 hover:bg-muted/60"
							>
								<Avatar className="h-8 w-8">
									<AvatarFallback className="bg-primary text-[11px] text-white">
										{getInitials(task.subject.name)}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium text-foreground">
										{task.subject.name}
									</p>
									{task.subject.email && (
										<p className="text-xs text-muted-foreground">
											{task.subject.email}
										</p>
									)}
									{task.subject.facility && (
										<p className="text-xs text-muted-foreground">
											{task.subject.facility}
										</p>
									)}
								</div>
								<ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
							</Link>
						</div>
					)}

					{/* Description */}
					<div className="space-y-2">
						<Label className="text-xs text-muted-foreground">Description</Label>
						<Textarea
							value={descriptionValue}
							onChange={(e) => handleDescriptionChange(e.target.value)}
							placeholder="Add a description…"
							className="min-h-[80px] resize-none text-sm"
						/>
					</div>

					{/* Editable fields grid */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Priority</Label>
							<Select
								value={task.priority}
								onValueChange={(value) => handleFieldUpdate("priority", value)}
							>
								<SelectTrigger className="h-9 text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="urgent">Urgent</SelectItem>
									<SelectItem value="high">High</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="low">Low</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Category</Label>
							<Select
								value={task.category || "general"}
								onValueChange={(value) => handleFieldUpdate("category", value)}
							>
								<SelectTrigger className="h-9 text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="chase_candidate">
										Chase candidate
									</SelectItem>
									<SelectItem value="review_document">
										Review document
									</SelectItem>
									<SelectItem value="follow_up">Follow up</SelectItem>
									<SelectItem value="escalation">Escalation</SelectItem>
									<SelectItem value="expiry">Expiry</SelectItem>
									<SelectItem value="general">General</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Due date</Label>
							<Input
								type="date"
								value={
									task.dueAt ? format(new Date(task.dueAt), "yyyy-MM-dd") : ""
								}
								onChange={(e) =>
									handleFieldUpdate(
										"dueAt",
										e.target.value
											? new Date(e.target.value).toISOString()
											: null,
									)
								}
								className={cn(
									"h-9 text-sm",
									isOverdue && "border-destructive text-destructive",
								)}
							/>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
								<UserCircle className="h-3 w-3" />
								Assigned to
							</Label>
							<Select
								value={task.assigneeRole || "unassigned"}
								onValueChange={(value) =>
									handleFieldUpdate(
										"assigneeRole",
										value === "unassigned" ? null : value,
									)
								}
							>
								<SelectTrigger className="h-9 text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="unassigned">Unassigned</SelectItem>
									{assigneeRoleOptions.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* AI reasoning */}
					{task.source === "ai_agent" && task.aiReasoning && (
						<>
							<Separator />
							<div className="space-y-2">
								<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
									<Sparkles className="h-3 w-3 text-primary/60" />
									AI Reasoning
								</Label>
								<div className="rounded-md border border-border bg-muted/40 p-3">
									<p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
										{task.aiReasoning}
									</p>
								</div>
							</div>
						</>
					)}

					{/* Compliance elements */}
					{task.complianceElementSlugs &&
						task.complianceElementSlugs.length > 0 && (
							<>
								<Separator />
								<div className="space-y-2">
									<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
										<Tag className="h-3 w-3" />
										Compliance elements
									</Label>
									<div className="flex flex-wrap gap-1.5">
										{task.complianceElementSlugs.map((slug) => (
											<Badge
												key={slug}
												variant="outline"
												className="text-xs text-muted-foreground"
											>
												{slug.replace(/-/g, " ")}
											</Badge>
										))}
									</div>
								</div>
							</>
						)}

					{/* Delegate to AI */}
					<Separator />
					<div className="space-y-3">
						<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
							<Bot className="h-3 w-3" />
							AI Delegation
						</Label>
						{task.executionId ? (
							<div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
								<div className="flex items-center gap-2">
									<div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
									<p className="text-sm font-medium text-foreground">
										Delegated to AI
									</p>
								</div>
								{task.agentId && (
									<p className="text-xs text-muted-foreground">
										Agent: {task.agentId}
									</p>
								)}
								{task.scheduledFor && (
									<p className="text-xs text-muted-foreground">
										Scheduled:{" "}
										{format(new Date(task.scheduledFor), "d MMM yyyy, HH:mm")}
									</p>
								)}
							</div>
						) : (
							<div className="rounded-md border border-dashed border-border p-4 text-center space-y-3">
								<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/8">
									<Bot className="h-5 w-5 text-primary" />
								</div>
								<div>
									<p className="text-sm font-medium text-foreground">
										Delegate this task to an AI agent
									</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										An agent will handle this task autonomously
									</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									className="text-xs"
									disabled
								>
									<Bot className="h-3.5 w-3.5 mr-1.5" />
									Delegate to AI
								</Button>
								<p className="text-[11px] text-muted-foreground/60">
									Coming soon
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="border-t border-border px-6 py-4">
					<div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
						<span>
							Created{" "}
							{formatDistanceToNow(new Date(task.createdAt), {
								addSuffix: true,
							})}
						</span>
						{task.source !== "manual" && (
							<span>Source: {sourceLabels[task.source] || task.source}</span>
						)}
						{task.completedAt && (
							<span>
								{task.status === "dismissed" ? "Dismissed" : "Completed"}{" "}
								{formatDistanceToNow(new Date(task.completedAt), {
									addSuffix: true,
								})}
							</span>
						)}
						{task.snoozedUntil && task.status === "snoozed" && (
							<span>
								Snoozed until {format(new Date(task.snoozedUntil), "d MMM")}
							</span>
						)}
						{saving && <span className="text-primary">Saving…</span>}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
