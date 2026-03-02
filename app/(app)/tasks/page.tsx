"use client";

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import {
	ArrowUpDown,
	ArrowUpRight,
	Bell,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	MoreHorizontal,
	Sparkles,
	User,
	X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TableLoader } from "@/components/elements/table-loader";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useOrg } from "@/lib/org-context";
import { cn } from "@/lib/utils";

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
	subject?: {
		type: string;
		id: string | null;
		name?: string;
		email?: string;
		facility?: string;
	} | null;
}

const priorityConfig = {
	urgent: {
		label: "Urgent",
		color: "bg-destructive",
		badgeVariant: "danger" as const,
	},
	high: {
		label: "High",
		color: "bg-chart-3",
		badgeVariant: "warning" as const,
	},
	medium: {
		label: "Medium",
		color: "bg-chart-3/70",
		badgeVariant: "warning" as const,
	},
	low: {
		label: "Low",
		color: "bg-muted-foreground/70",
		badgeVariant: "neutral" as const,
	},
};

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

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
	dismissed: { label: "Dismissed", icon: X, color: "text-muted-foreground" },
	snoozed: { label: "Snoozed", icon: Bell, color: "text-muted-foreground" },
};

const statusOrder = {
	pending: 0,
	in_progress: 1,
	snoozed: 2,
	completed: 3,
	dismissed: 4,
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
	"bg-primary",
	"bg-chart-2",
	"bg-chart-3",
	"bg-destructive",
	"bg-muted-foreground",
	"bg-chart-5",
];

function getAvatarColor(name: string): string {
	const hash = name
		.split("")
		.reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return avatarColors[hash % avatarColors.length];
}

function PriorityBadge({ priority }: { priority: Task["priority"] }) {
	const config = priorityConfig[priority];
	return (
		<Badge variant={config.badgeVariant} className="text-xs font-medium">
			{config.label}
		</Badge>
	);
}

function AIBadge() {
	return (
		<span className="inline-flex items-center" title="AI generated">
			<Sparkles className="h-3 w-3 text-primary/60" />
		</span>
	);
}

/* ---------- Status tab component ---------- */
const statusTabs = [
	{ value: "active", label: "Active" },
	{ value: "pending", label: "Pending" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "snoozed", label: "Snoozed" },
	{ value: "completed", label: "Completed" },
	{ value: "dismissed", label: "Dismissed" },
] as const;

/* ---------- Column definitions ---------- */
function createColumns(
	onComplete: (id: string) => void,
	onDismiss: (id: string) => void,
	onSnooze: (id: string, until: Date) => void,
	onReopen: (id: string) => void,
	statusFilter: string,
	candidateLabel: string,
): ColumnDef<Task>[] {
	return [
		{
			accessorKey: "title",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					Task
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => {
				const task = row.original;
				return (
					<div className="flex items-center gap-3">
						<div
							className={cn(
								"w-1 h-8 rounded-full shrink-0",
								priorityConfig[task.priority].color,
							)}
						/>
						<div className="min-w-0">
							<div className="font-medium truncate max-w-[300px]">
								{task.title}
							</div>
							{task.description && (
								<div className="text-xs text-muted-foreground truncate max-w-[300px]">
									{task.description.split("\n")[0]}
								</div>
							)}
						</div>
					</div>
				);
			},
		},
		{
			id: "subject",
			accessorFn: (row) => row.subject?.name ?? "",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					{candidateLabel}
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => {
				const task = row.original;
				if (!task.subject?.name) {
					return <span className="text-muted-foreground text-sm">—</span>;
				}

				const href =
					task.subject.type === "placement"
						? `/placements/${task.subjectId}`
						: `/candidates/${task.subjectId}`;

				return (
					<Link href={href} className="group flex items-center gap-2">
						<Avatar className="h-6 w-6">
							<AvatarFallback
								className={cn(
									getAvatarColor(task.subject.name),
									"text-[10px] text-white",
								)}
							>
								{getInitials(task.subject.name)}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0">
							<div className="text-sm group-hover:text-primary transition-colors duration-150">
								{task.subject.name}
							</div>
							{task.subject.facility && (
								<div className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0 rounded-full w-fit">
									{task.subject.facility}
								</div>
							)}
						</div>
					</Link>
				);
			},
		},
		{
			accessorKey: "priority",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					Priority
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => {
				const task = row.original;
				return (
					<div className="flex items-center gap-2">
						<PriorityBadge priority={task.priority} />
						{task.source === "ai_agent" && <AIBadge />}
					</div>
				);
			},
			sortingFn: (rowA, rowB) => {
				return (
					priorityOrder[rowA.original.priority] -
					priorityOrder[rowB.original.priority]
				);
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					Status
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => {
				const task = row.original;
				const StatusIcon = statusConfig[task.status].icon;
				return (
					<div className="flex items-center gap-1.5">
						<StatusIcon
							className={cn("h-4 w-4", statusConfig[task.status].color)}
						/>
						<span className={cn("text-sm", statusConfig[task.status].color)}>
							{statusConfig[task.status].label}
						</span>
					</div>
				);
			},
			sortingFn: (rowA, rowB) => {
				return (
					statusOrder[rowA.original.status] - statusOrder[rowB.original.status]
				);
			},
		},
		{
			id: "dueAt",
			accessorFn: (row) => row.dueAt ?? "",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					Due
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => {
				const task = row.original;
				const isOverdue =
					task.dueAt &&
					new Date(task.dueAt) < new Date() &&
					task.status === "pending";

				if (task.dueAt) {
					return (
						<span
							className={cn(
								"text-sm tabular-nums",
								isOverdue ? "font-medium text-destructive" : "text-foreground",
							)}
						>
							{format(new Date(task.dueAt), "MMM d")}
						</span>
					);
				}
				if (task.snoozedUntil && task.status === "snoozed") {
					return (
						<span className="flex items-center gap-1 text-sm text-muted-foreground">
							<Bell className="h-3 w-3" />
							{format(new Date(task.snoozedUntil), "MMM d")}
						</span>
					);
				}
				return <span className="text-muted-foreground text-sm">—</span>;
			},
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					Created
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground text-sm">
					{formatDistanceToNow(new Date(row.original.createdAt), {
						addSuffix: true,
					})}
				</span>
			),
		},
		{
			id: "actions",
			enableSorting: false,
			cell: ({ row }) => {
				const task = row.original;
				const isActionable =
					task.status === "pending" ||
					task.status === "in_progress" ||
					task.status === "snoozed";

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								aria-label="Task actions"
							>
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
									<DropdownMenuItem
										onClick={() =>
											onSnooze(
												task.id,
												new Date(Date.now() + 24 * 60 * 60 * 1000),
											)
										}
									>
										<Clock className="mr-2 h-4 w-4" />
										Snooze 1 Day
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() =>
											onSnooze(
												task.id,
												new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
											)
										}
									>
										<Clock className="mr-2 h-4 w-4" />
										Snooze 1 Week
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => onDismiss(task.id)}
										className="text-muted-foreground"
									>
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
										<Link
											href={
												task.subjectType === "placement"
													? `/placements/${task.subjectId}`
													: `/candidates/${task.subjectId}`
											}
										>
											<User className="mr-2 h-4 w-4" />
											{task.subjectType === "placement"
												? "View Placement"
												: "View Candidate"}
										</Link>
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];
}

export default function TasksPage() {
	const { selectedOrg, loading: orgLoading } = useOrg();
	const [allTasks, setAllTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sorting, setSorting] = useState<SortingState>([]);

	// Task detail modal
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);
	const [modalOpen, setModalOpen] = useState(false);

	// Filters
	const [statusFilter, setStatusFilter] = useState<string>("active");
	const [priorityFilter, setPriorityFilter] = useState<string>("all");
	const [sourceFilter, setSourceFilter] = useState<string>("all");

	const hasActiveFilters =
		statusFilter !== "active" ||
		priorityFilter !== "all" ||
		sourceFilter !== "all";

	// Fetch all tasks once, filter client-side
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
				const response = await fetch(`/api/tasks?${params.toString()}`);
				const data = await response.json();

				if (data.tasks) {
					setAllTasks(data.tasks);
				}
			} catch (err) {
				console.error("Failed to fetch tasks:", err);
				setError("Failed to load tasks");
			} finally {
				setLoading(false);
			}
		}
		fetchTasks();
	}, [selectedOrg?.id]);

	// Client-side filtering
	const filteredTasks = useMemo(() => {
		let result = allTasks;

		if (statusFilter === "active") {
			result = result.filter(
				(t) =>
					t.status === "pending" ||
					t.status === "in_progress" ||
					t.status === "snoozed",
			);
		} else if (statusFilter !== "all") {
			result = result.filter((t) => t.status === statusFilter);
		}

		if (priorityFilter !== "all") {
			result = result.filter((t) => t.priority === priorityFilter);
		}

		if (sourceFilter !== "all") {
			result = result.filter((t) => t.source === sourceFilter);
		}

		return result;
	}, [allTasks, statusFilter, priorityFilter, sourceFilter]);

	// Counts from full dataset (unaffected by filters)
	const counts = useMemo(() => {
		const status: Record<string, number> = {
			pending: 0,
			in_progress: 0,
			snoozed: 0,
			completed: 0,
			dismissed: 0,
		};
		const priority: Record<string, number> = {
			urgent: 0,
			high: 0,
			medium: 0,
			low: 0,
		};
		const source: Record<string, number> = {
			ai_agent: 0,
			manual: 0,
			system: 0,
		};

		for (const t of allTasks) {
			status[t.status] = (status[t.status] ?? 0) + 1;
			priority[t.priority] = (priority[t.priority] ?? 0) + 1;
			source[t.source] = (source[t.source] ?? 0) + 1;
		}

		const active =
			(status.pending ?? 0) + (status.in_progress ?? 0) + (status.snoozed ?? 0);

		return { status, priority, source, active, total: allTasks.length };
	}, [allTasks]);

	// Task actions
	const updateTask = useCallback(
		async (id: string, updates: Record<string, unknown>) => {
			try {
				const response = await fetch(`/api/tasks/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(updates),
				});

				if (response.ok) {
					const data = await response.json();
					const merged = (prev: Task) => ({ ...prev, ...data.task });
					setAllTasks((prev) => prev.map((t) => (t.id === id ? merged(t) : t)));
					setSelectedTask((prev) => (prev?.id === id ? merged(prev) : prev));
				}
			} catch (err) {
				console.error("Failed to update task:", err);
			}
		},
		[],
	);

	const handleComplete = (id: string) =>
		updateTask(id, { status: "completed" });
	const handleDismiss = (id: string) => updateTask(id, { status: "dismissed" });
	const handleSnooze = (id: string, until: Date) =>
		updateTask(id, { status: "snoozed", snoozedUntil: until.toISOString() });
	const handleReopen = (id: string) => updateTask(id, { status: "pending" });

	const openTaskDetail = useCallback(async (task: Task) => {
		// Use list data immediately, then enrich with full detail
		setSelectedTask(task);
		setModalOpen(true);
		try {
			const response = await fetch(`/api/tasks/${task.id}`);
			if (response.ok) {
				const data = await response.json();
				setSelectedTask((prev) =>
					prev?.id === task.id ? { ...prev, ...data.task } : prev,
				);
			}
		} catch {
			// List data is good enough if detail fetch fails
		}
	}, []);

	const handleRowClick = useCallback(
		(e: React.MouseEvent, task: Task) => {
			// Don't open sheet if clicking on interactive elements
			const target = e.target as HTMLElement;
			if (
				target.closest(
					"a, button, [role=menuitem], [data-radix-collection-item]",
				)
			)
				return;
			openTaskDetail(task);
		},
		[openTaskDetail],
	);

	const candidateLabel =
		selectedOrg?.settings?.terminology?.candidate || "Candidate";

	const columns = useMemo(
		() =>
			createColumns(
				handleComplete,
				handleDismiss,
				handleSnooze,
				handleReopen,
				statusFilter,
				candidateLabel,
			),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[statusFilter, candidateLabel],
	);

	const table = useReactTable({
		data: filteredTasks,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		state: { sorting },
		initialState: {
			pagination: { pageSize: 10 },
		},
	});

	const isLoading = orgLoading || loading;

	const resetFilters = () => {
		setStatusFilter("active");
		setPriorityFilter("all");
		setSourceFilter("all");
	};

	return (
		<div className="flex min-h-full flex-1 flex-col gap-10 bg-background p-8">
			{/* Header */}
			<div>
				<h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">
					Tasks
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Compliance actions and follow-ups requiring attention
				</p>
			</div>

			{/* Filters */}
			<div className="flex items-center justify-between gap-4">
				{/* Status tabs */}
				<div className="flex items-center gap-1 border-b border-border">
					{statusTabs.map((tab) => {
						const isSelected = statusFilter === tab.value;
						const count =
							tab.value === "active"
								? counts.active
								: (counts.status[tab.value] ?? 0);
						return (
							<button
								key={tab.value}
								onClick={() => setStatusFilter(tab.value)}
								className={cn(
									"px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer whitespace-nowrap outline-none",
									isSelected
										? "border-primary text-primary"
										: "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
								)}
							>
								{tab.label}
								<span
									className={cn(
										"ml-1.5 tabular-nums text-xs",
										isSelected ? "text-primary/70" : "text-muted-foreground/80",
									)}
								>
									{count}
								</span>
							</button>
						);
					})}
				</div>

				{/* Secondary filters */}
				<div className="flex items-center gap-2 shrink-0">
					{hasActiveFilters && (
						<button
							onClick={resetFilters}
							className="mr-1 cursor-pointer text-xs text-muted-foreground underline underline-offset-2 transition-colors duration-150 hover:text-foreground"
						>
							Reset
						</button>
					)}
					<Select value={priorityFilter} onValueChange={setPriorityFilter}>
						<SelectTrigger className="h-8 w-[130px] cursor-pointer border-input bg-card text-xs text-foreground focus:ring-ring/30">
							<SelectValue placeholder="Priority" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All priorities</SelectItem>
							<SelectItem value="urgent">
								Urgent ({counts.priority.urgent})
							</SelectItem>
							<SelectItem value="high">
								High ({counts.priority.high})
							</SelectItem>
							<SelectItem value="medium">
								Medium ({counts.priority.medium})
							</SelectItem>
							<SelectItem value="low">Low ({counts.priority.low})</SelectItem>
						</SelectContent>
					</Select>
					<Select value={sourceFilter} onValueChange={setSourceFilter}>
						<SelectTrigger className="h-8 w-[120px] cursor-pointer border-input bg-card text-xs text-foreground focus:ring-ring/30">
							<SelectValue placeholder="Source" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All sources</SelectItem>
							<SelectItem value="ai_agent">
								AI ({counts.source.ai_agent})
							</SelectItem>
							<SelectItem value="manual">
								Manual ({counts.source.manual})
							</SelectItem>
							<SelectItem value="system">
								System ({counts.source.system})
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Error state */}
			{error && (
				<div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
					{error}
				</div>
			)}

			{/* Tasks table */}
			<Card className="shadow-none! bg-card">
				{isLoading ? (
					<TableLoader cols={7} rows={10} />
				) : (
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow
									key={headerGroup.id}
									className="bg-muted hover:bg-muted"
								>
									{headerGroup.headers.map((header) => (
										<TableHead
											key={header.id}
											className={cn(
												"text-xs font-medium text-muted-foreground",
												header.id === "title" && "w-[350px]",
												header.id === "subject" && "w-[180px]",
												header.id === "priority" && "w-[150px]",
												header.id === "status" && "w-[120px]",
												header.id === "dueAt" && "w-[100px]",
												header.id === "createdAt" && "w-[120px]",
												header.id === "actions" && "w-[50px]",
											)}
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows.length > 0 ? (
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										className={cn(
											"bg-card cursor-pointer",
											row.original.status === "completed" && "opacity-60",
											row.original.status === "dismissed" && "opacity-50",
										)}
										onClick={(e) => handleRowClick(e, row.original)}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow className="bg-card">
									<TableCell
										colSpan={columns.length}
										className="h-32 text-center"
									>
										<div className="flex flex-col items-center justify-center">
											<Check
												className="mb-3 h-8 w-8 text-muted-foreground/80"
												aria-hidden="true"
											/>
											<h3 className="text-xl font-semibold text-foreground">
												No tasks found
											</h3>
											<p className="mt-1 max-w-[40ch] text-sm text-muted-foreground">
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
				)}

				{/* Pagination */}
				{!isLoading && table.getPageCount() > 1 && (
					<div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
						<span>
							{table.getState().pagination.pageIndex * 10 + 1}–
							{Math.min(
								(table.getState().pagination.pageIndex + 1) * 10,
								filteredTasks.length,
							)}{" "}
							of {filteredTasks.length}
						</span>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								className="h-7 w-7 p-0"
								disabled={!table.getCanPreviousPage()}
								onClick={() => table.previousPage()}
							>
								<ChevronLeft className="size-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="h-7 w-7 p-0"
								disabled={!table.getCanNextPage()}
								onClick={() => table.nextPage()}
							>
								<ChevronRight className="size-3.5" />
							</Button>
						</div>
					</div>
				)}
			</Card>

			<TaskDetailModal
				task={selectedTask}
				open={modalOpen}
				onOpenChange={setModalOpen}
				onUpdate={updateTask}
				candidateLabel={candidateLabel}
			/>
		</div>
	);
}
