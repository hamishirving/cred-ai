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
import { Card, CardContent } from "@/components/ui/card";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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

function AIBadge() {
	return (
		<Badge
			variant="outline"
			className="text-xs gap-1 border-purple-500/50 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
		>
			<Sparkles className="h-3 w-3" />
			AI
		</Badge>
	);
}

function TaskRow({
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
	const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status === "pending";

	return (
		<TableRow className={cn(
			task.status === "completed" && "opacity-60",
			task.status === "dismissed" && "opacity-50",
		)}>
			{/* Priority indicator + Title */}
			<TableCell>
				<div className="flex items-center gap-3">
					<div className={cn("w-1 h-8 rounded-full shrink-0", priorityConfig[task.priority].color)} />
					<div className="min-w-0">
						<div className="font-medium truncate max-w-[300px]">{task.title}</div>
						{task.description && (
							<div className="text-xs text-muted-foreground truncate max-w-[300px]">
								{task.description.split("\n")[0]}
							</div>
						)}
					</div>
				</div>
			</TableCell>

			{/* Subject */}
			<TableCell>
				{task.subject?.name ? (
					<Link
						href={`/candidates/${task.subjectId}`}
						className="flex items-center gap-2 hover:underline"
					>
						<Avatar className="h-6 w-6">
							<AvatarFallback className={cn(getAvatarColor(task.subject.name), "text-[10px] text-white")}>
								{getInitials(task.subject.name)}
							</AvatarFallback>
						</Avatar>
						<span className="text-sm">{task.subject.name}</span>
					</Link>
				) : (
					<span className="text-muted-foreground text-sm">-</span>
				)}
			</TableCell>

			{/* Priority + Source */}
			<TableCell>
				<div className="flex items-center gap-2">
					<PriorityBadge priority={task.priority} />
					{task.source === "ai_agent" && <AIBadge />}
				</div>
			</TableCell>

			{/* Status */}
			<TableCell>
				<div className="flex items-center gap-1.5">
					<StatusIcon className={cn("h-4 w-4", statusConfig[task.status].color)} />
					<span className={cn("text-sm", statusConfig[task.status].color)}>
						{statusConfig[task.status].label}
					</span>
				</div>
			</TableCell>

			{/* Due date */}
			<TableCell>
				{task.dueAt ? (
					<span className={cn(
						"text-sm",
						isOverdue && "text-red-600 font-medium flex items-center gap-1"
					)}>
						{isOverdue && <AlertTriangle className="h-3 w-3" />}
						{format(new Date(task.dueAt), "MMM d")}
					</span>
				) : task.snoozedUntil && task.status === "snoozed" ? (
					<span className="text-sm text-purple-600 flex items-center gap-1">
						<Bell className="h-3 w-3" />
						{format(new Date(task.snoozedUntil), "MMM d")}
					</span>
				) : (
					<span className="text-muted-foreground text-sm">-</span>
				)}
			</TableCell>

			{/* Created */}
			<TableCell className="text-muted-foreground text-sm">
				{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
			</TableCell>

			{/* Actions */}
			<TableCell>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8">
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
			</TableCell>
		</TableRow>
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

	// Stats - computed from visible tasks (all status-based)
	const stats = useMemo(() => {
		return {
			pending: tasks.filter(t => t.status === "pending").length,
			inProgress: tasks.filter(t => t.status === "in_progress").length,
			snoozed: tasks.filter(t => t.status === "snoozed").length,
			completed: tasks.filter(t => t.status === "completed").length,
		};
	}, [tasks]);

	const isLoading = orgLoading || loading;

	return (
		<div className="flex flex-1 flex-col gap-4 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Tasks</h1>
					<p className="text-muted-foreground text-sm">
						Compliance actions and follow-ups requiring attention
					</p>
				</div>
			</div>

			{/* Stats */}
			<div className="grid gap-3 md:grid-cols-4">
				<Card className="border-l-4 border-l-yellow-500">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">Pending</p>
								<p className="text-xl font-bold">{stats.pending}</p>
							</div>
							<Clock className="h-6 w-6 text-yellow-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-blue-500">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">In Progress</p>
								<p className="text-xl font-bold">{stats.inProgress}</p>
							</div>
							<ArrowUpRight className="h-6 w-6 text-blue-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-purple-500">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">Snoozed</p>
								<p className="text-xl font-bold">{stats.snoozed}</p>
							</div>
							<Bell className="h-6 w-6 text-purple-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-green-500">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">Completed</p>
								<p className="text-xl font-bold">{stats.completed}</p>
							</div>
							<Check className="h-6 w-6 text-green-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<div className="flex items-center gap-3">
				<Filter className="h-4 w-4 text-muted-foreground" />
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-[130px] h-8">
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
					<SelectTrigger className="w-[130px] h-8">
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
					<SelectTrigger className="w-[130px] h-8">
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

			{/* Tasks table */}
			{!isLoading && !error && (
				<Card>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[350px]">Task</TableHead>
								<TableHead className="w-[180px]">Subject</TableHead>
								<TableHead className="w-[150px]">Priority</TableHead>
								<TableHead className="w-[120px]">Status</TableHead>
								<TableHead className="w-[100px]">Due</TableHead>
								<TableHead className="w-[120px]">Created</TableHead>
								<TableHead className="w-[50px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tasks.length > 0 ? (
								tasks.map((task) => (
									<TaskRow
										key={task.id}
										task={task}
										onComplete={handleComplete}
										onDismiss={handleDismiss}
										onSnooze={handleSnooze}
										onReopen={handleReopen}
									/>
								))
							) : (
								<TableRow>
									<TableCell colSpan={7} className="h-32 text-center">
										<div className="flex flex-col items-center justify-center">
											<Check className="h-10 w-10 text-muted-foreground mb-3" />
											<h3 className="font-medium">No tasks found</h3>
											<p className="text-muted-foreground text-sm">
												{statusFilter === "active"
													? "All caught up! No active tasks requiring attention."
													: "No tasks match your current filters."}
											</p>
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</Card>
			)}
		</div>
	);
}
