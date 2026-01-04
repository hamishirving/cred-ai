"use client";

import { useState, useEffect, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import {
	Check,
	Clock,
	Filter,
	Loader2,
	MoreHorizontal,
	AlertTriangle,
	ArrowUpRight,
	X,
	Bell,
	User,
	Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";

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
	aiReasoning: string | null;
	subjectType: string | null;
	subjectId: string | null;
	assigneeId: string | null;
	assigneeRole: string | null;
	dueAt: string | null;
	snoozedUntil: string | null;
	completedAt: string | null;
	createdAt: string;
	updatedAt: string;
	subject?: {
		type: string;
		id: string;
		name?: string;
		email?: string;
	} | null;
}

const priorityConfig = {
	urgent: { label: "Urgent", color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50" },
	high: { label: "High", color: "bg-orange-500", textColor: "text-orange-700", bgColor: "bg-orange-50" },
	medium: { label: "Medium", color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50" },
	low: { label: "Low", color: "bg-gray-400", textColor: "text-gray-600", bgColor: "bg-gray-50" },
};

const statusConfig = {
	pending: { label: "Pending", icon: Clock, color: "text-yellow-600" },
	in_progress: { label: "In Progress", icon: ArrowUpRight, color: "text-blue-600" },
	completed: { label: "Completed", icon: Check, color: "text-green-600" },
	dismissed: { label: "Dismissed", icon: X, color: "text-gray-500" },
	snoozed: { label: "Snoozed", icon: Bell, color: "text-purple-600" },
};

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

const avatarColors = [
	"bg-blue-500",
	"bg-purple-500",
	"bg-pink-500",
	"bg-green-500",
	"bg-orange-500",
	"bg-teal-500",
];

function getAvatarColor(name: string): string {
	const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return avatarColors[hash % avatarColors.length];
}

function PriorityBadge({ priority }: { priority: Task["priority"] }) {
	const config = priorityConfig[priority];
	return (
		<Badge className={cn("text-xs", config.bgColor, config.textColor, "border-0 hover:opacity-90")}>
			{config.label}
		</Badge>
	);
}

function TaskCard({
	task,
	onComplete,
	onDismiss,
	onSnooze,
	onReopen,
}: {
	task: Task;
	onComplete: (id: string) => void;
	onDismiss: (id: string) => void;
	onSnooze: (id: string, until: Date) => void;
	onReopen: (id: string) => void;
}) {
	const isActionable = task.status === "pending" || task.status === "in_progress" || task.status === "snoozed";
	const StatusIcon = statusConfig[task.status].icon;

	return (
		<Card className={cn(
			"transition-all hover:shadow-md",
			task.status === "completed" && "opacity-60",
			task.status === "dismissed" && "opacity-50",
		)}>
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-start gap-3 flex-1 min-w-0">
						{/* Priority indicator */}
						<div className={cn("w-1 h-12 rounded-full shrink-0", priorityConfig[task.priority].color)} />

						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<PriorityBadge priority={task.priority} />
								{task.source === "ai_agent" && (
									<Badge variant="outline" className="text-xs gap-1">
										<Sparkles className="h-3 w-3" />
										AI
									</Badge>
								)}
								<StatusIcon className={cn("h-4 w-4", statusConfig[task.status].color)} />
							</div>
							<CardTitle className="text-base line-clamp-1">{task.title}</CardTitle>
							{task.subject?.name && (
								<CardDescription className="mt-1 flex items-center gap-2">
									<Avatar className="h-5 w-5">
										<AvatarFallback className={cn(getAvatarColor(task.subject.name), "text-[10px] text-white")}>
											{getInitials(task.subject.name)}
										</AvatarFallback>
									</Avatar>
									<Link
										href={`/candidates/${task.subjectId}`}
										className="hover:underline"
									>
										{task.subject.name}
									</Link>
								</CardDescription>
							)}
						</div>
					</div>

					{/* Actions */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{isActionable && (
								<>
									<DropdownMenuItem onClick={() => onComplete(task.id)}>
										<Check className="mr-2 h-4 w-4" />
										Mark Complete
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => onSnooze(task.id, new Date(Date.now() + 24 * 60 * 60 * 1000))}>
										<Clock className="mr-2 h-4 w-4" />
										Snooze 1 Day
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => onSnooze(task.id, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))}>
										<Clock className="mr-2 h-4 w-4" />
										Snooze 1 Week
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => onDismiss(task.id)} className="text-muted-foreground">
										<X className="mr-2 h-4 w-4" />
										Dismiss
									</DropdownMenuItem>
								</>
							)}
							{(task.status === "completed" || task.status === "dismissed") && (
								<DropdownMenuItem onClick={() => onReopen(task.id)}>
									<ArrowUpRight className="mr-2 h-4 w-4" />
									Reopen
								</DropdownMenuItem>
							)}
							{task.subjectId && (
								<>
									{isActionable && <DropdownMenuSeparator />}
									<DropdownMenuItem asChild>
										<Link href={`/candidates/${task.subjectId}`}>
											<User className="mr-2 h-4 w-4" />
											View Candidate
										</Link>
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				{task.description && (
					<p className="text-sm text-muted-foreground line-clamp-2 mb-3">
						{task.description.split("\n")[0]}
					</p>
				)}
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<div className="flex items-center gap-3">
						{task.dueAt && (
							<span className={cn(
								"flex items-center gap-1",
								new Date(task.dueAt) < new Date() && task.status === "pending" && "text-red-600 font-medium"
							)}>
								{new Date(task.dueAt) < new Date() && task.status === "pending" && (
									<AlertTriangle className="h-3 w-3" />
								)}
								Due {format(new Date(task.dueAt), "MMM d")}
							</span>
						)}
						{task.snoozedUntil && task.status === "snoozed" && (
							<span className="flex items-center gap-1 text-purple-600">
								<Bell className="h-3 w-3" />
								Until {format(new Date(task.snoozedUntil), "MMM d")}
							</span>
						)}
					</div>
					<span>
						{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}

export default function TasksPage() {
	const { selectedOrg, loading: orgLoading } = useOrg();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filters
	const [statusFilter, setStatusFilter] = useState<string>("active");
	const [priorityFilter, setPriorityFilter] = useState<string>("all");
	const [sourceFilter, setSourceFilter] = useState<string>("all");

	// Fetch tasks
	useEffect(() => {
		if (!selectedOrg?.id) {
			setLoading(false);
			return;
		}

		async function fetchTasks() {
			setLoading(true);
			setError(null);
			try {
				const params = new URLSearchParams({ organisationId: selectedOrg!.id });

				// Handle status filter
				if (statusFilter === "active") {
					params.append("status", "pending");
					params.append("status", "in_progress");
					params.append("status", "snoozed");
				} else if (statusFilter !== "all") {
					params.append("status", statusFilter);
				}

				if (priorityFilter !== "all") {
					params.append("priority", priorityFilter);
				}

				if (sourceFilter !== "all") {
					params.append("source", sourceFilter);
				}

				const response = await fetch(`/api/tasks?${params.toString()}`);
				const data = await response.json();

				if (data.tasks) {
					setTasks(data.tasks);
				}
			} catch (err) {
				console.error("Failed to fetch tasks:", err);
				setError("Failed to load tasks");
			} finally {
				setLoading(false);
			}
		}
		fetchTasks();
	}, [selectedOrg?.id, statusFilter, priorityFilter, sourceFilter]);

	// Task actions
	const updateTask = async (id: string, updates: Record<string, unknown>) => {
		try {
			const response = await fetch(`/api/tasks/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});

			if (response.ok) {
				const data = await response.json();
				setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data.task } : t));
			}
		} catch (err) {
			console.error("Failed to update task:", err);
		}
	};

	const handleComplete = (id: string) => updateTask(id, { status: "completed" });
	const handleDismiss = (id: string) => updateTask(id, { status: "dismissed" });
	const handleSnooze = (id: string, until: Date) => updateTask(id, { status: "snoozed", snoozedUntil: until.toISOString() });
	const handleReopen = (id: string) => updateTask(id, { status: "pending" });

	// Stats
	const stats = useMemo(() => {
		return {
			urgent: tasks.filter(t => t.priority === "urgent" && t.status !== "completed" && t.status !== "dismissed").length,
			overdue: tasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date() && t.status === "pending").length,
			pending: tasks.filter(t => t.status === "pending").length,
			snoozed: tasks.filter(t => t.status === "snoozed").length,
		};
	}, [tasks]);

	const isLoading = orgLoading || loading;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Tasks</h1>
					<p className="text-muted-foreground">
						Compliance actions and follow-ups requiring attention
					</p>
				</div>
			</div>

			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card className="border-l-4 border-l-red-500">
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Urgent</p>
								<p className="text-2xl font-bold">{stats.urgent}</p>
							</div>
							<AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-orange-500">
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Overdue</p>
								<p className="text-2xl font-bold">{stats.overdue}</p>
							</div>
							<Clock className="h-8 w-8 text-orange-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-blue-500">
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Pending</p>
								<p className="text-2xl font-bold">{stats.pending}</p>
							</div>
							<ArrowUpRight className="h-8 w-8 text-blue-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-purple-500">
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Snoozed</p>
								<p className="text-2xl font-bold">{stats.snoozed}</p>
							</div>
							<Bell className="h-8 w-8 text-purple-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<div className="flex items-center gap-3">
				<Filter className="h-4 w-4 text-muted-foreground" />
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-[140px]">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="active">Active</SelectItem>
						<SelectItem value="all">All</SelectItem>
						<SelectItem value="pending">Pending</SelectItem>
						<SelectItem value="in_progress">In Progress</SelectItem>
						<SelectItem value="snoozed">Snoozed</SelectItem>
						<SelectItem value="completed">Completed</SelectItem>
						<SelectItem value="dismissed">Dismissed</SelectItem>
					</SelectContent>
				</Select>
				<Select value={priorityFilter} onValueChange={setPriorityFilter}>
					<SelectTrigger className="w-[140px]">
						<SelectValue placeholder="Priority" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Priorities</SelectItem>
						<SelectItem value="urgent">Urgent</SelectItem>
						<SelectItem value="high">High</SelectItem>
						<SelectItem value="medium">Medium</SelectItem>
						<SelectItem value="low">Low</SelectItem>
					</SelectContent>
				</Select>
				<Select value={sourceFilter} onValueChange={setSourceFilter}>
					<SelectTrigger className="w-[140px]">
						<SelectValue placeholder="Source" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Sources</SelectItem>
						<SelectItem value="ai_agent">AI Generated</SelectItem>
						<SelectItem value="manual">Manual</SelectItem>
						<SelectItem value="system">System</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Error state */}
			{error && (
				<div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
					{error}
				</div>
			)}

			{/* Loading state */}
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			)}

			{/* Tasks list */}
			{!isLoading && !error && (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{tasks.length > 0 ? (
						tasks.map((task) => (
							<TaskCard
								key={task.id}
								task={task}
								onComplete={handleComplete}
								onDismiss={handleDismiss}
								onSnooze={handleSnooze}
								onReopen={handleReopen}
							/>
						))
					) : (
						<div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
							<Check className="h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="font-medium">No tasks found</h3>
							<p className="text-muted-foreground text-sm">
								{statusFilter === "active"
									? "All caught up! No active tasks requiring attention."
									: "No tasks match your current filters."}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
