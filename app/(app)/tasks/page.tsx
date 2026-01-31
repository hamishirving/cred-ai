"use client";

import { useState, useEffect, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
	getSortedRowModel,
	type SortingState,
	getPaginationRowModel,
} from "@tanstack/react-table";
import {
	ArrowUpDown,
	Check,
	Clock,
	MoreHorizontal,
	ArrowUpRight,
	X,
	Bell,
	User,
	Sparkles,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
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
	urgent: { label: "Urgent", color: "bg-[#c93d4e]", textColor: "text-[#c93d4e]", bgColor: "bg-[#fdf0f1]" },
	high: { label: "High", color: "bg-[#c49332]", textColor: "text-[#a87c2a]", bgColor: "bg-[#faf5eb]" },
	medium: { label: "Medium", color: "bg-[#c49332]/60", textColor: "text-[#a87c2a]", bgColor: "bg-[#faf5eb]" },
	low: { label: "Low", color: "bg-[#a8a49c]", textColor: "text-[#6b6760]", bgColor: "bg-[#f0ede7]" },
};

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

const statusConfig = {
	pending: { label: "Pending", icon: Clock, color: "text-[#c49332]" },
	in_progress: { label: "In Progress", icon: ArrowUpRight, color: "text-[#4444cf]" },
	completed: { label: "Completed", icon: Check, color: "text-[#3a9960]" },
	dismissed: { label: "Dismissed", icon: X, color: "text-[#8a857d]" },
	snoozed: { label: "Snoozed", icon: Bell, color: "text-[#8a7e6b]" },
};

const statusOrder = { pending: 0, in_progress: 1, snoozed: 2, completed: 3, dismissed: 4 };

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

const avatarColors = [
	"bg-[#4444cf]",
	"bg-[#3a9960]",
	"bg-[#c49332]",
	"bg-[#c93d4e]",
	"bg-[#6b6760]",
	"bg-[#3636b8]",
];

function getAvatarColor(name: string): string {
	const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return avatarColors[hash % avatarColors.length];
}

function PriorityBadge({ priority }: { priority: Task["priority"] }) {
	const config = priorityConfig[priority];
	return (
		<Badge variant="outline" className={cn("text-xs font-medium", config.bgColor, config.textColor, "border-0")}>
			{config.label}
		</Badge>
	);
}

function AIBadge() {
	return (
		<span className="inline-flex items-center" title="AI generated">
			<Sparkles className="h-3 w-3 text-[#4444cf]/50" />
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

/* ---------- Skeleton loading rows ---------- */
function TaskTableSkeleton() {
	return (
		<>
			{Array.from({ length: 5 }).map((_, i) => (
				<TableRow key={i} className="bg-white">
					<TableCell>
						<div className="flex items-center gap-3">
							<Skeleton className="w-1 h-8 rounded-full" />
							<div className="space-y-1.5">
								<Skeleton className="h-4 w-[220px]" />
								<Skeleton className="h-3 w-[160px]" />
							</div>
						</div>
					</TableCell>
					<TableCell>
						<div className="flex items-center gap-2">
							<Skeleton className="h-6 w-6 rounded-full" />
							<Skeleton className="h-3 w-[80px]" />
						</div>
					</TableCell>
					<TableCell><Skeleton className="h-5 w-[60px] rounded-full" /></TableCell>
					<TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
					<TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
					<TableCell><Skeleton className="h-4 w-[70px]" /></TableCell>
					<TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
				</TableRow>
			))}
		</>
	);
}

/* ---------- Column definitions ---------- */
function createColumns(
	onComplete: (id: string) => void,
	onDismiss: (id: string) => void,
	onSnooze: (id: string, until: Date) => void,
	onReopen: (id: string) => void,
	statusFilter: string,
): ColumnDef<Task>[] {
	return [
		{
			accessorKey: "title",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 px-2 text-xs font-medium text-[#6b6760] hover:text-[#3d3a32] hover:bg-[#f0ede7] cursor-pointer"
				>
					Task
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => {
				const task = row.original;
				return (
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
					className="-ml-2 h-8 px-2 text-xs font-medium text-[#6b6760] hover:text-[#3d3a32] hover:bg-[#f0ede7] cursor-pointer"
				>
					Subject
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => {
				const task = row.original;
				if (!task.subject?.name) {
					return <span className="text-muted-foreground text-sm">—</span>;
				}
				return (
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
				);
			},
		},
		{
			accessorKey: "priority",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 px-2 text-xs font-medium text-[#6b6760] hover:text-[#3d3a32] hover:bg-[#f0ede7] cursor-pointer"
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
				return priorityOrder[rowA.original.priority] - priorityOrder[rowB.original.priority];
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 px-2 text-xs font-medium text-[#6b6760] hover:text-[#3d3a32] hover:bg-[#f0ede7] cursor-pointer"
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
						<StatusIcon className={cn("h-4 w-4", statusConfig[task.status].color)} />
						<span className={cn("text-sm", statusConfig[task.status].color)}>
							{statusConfig[task.status].label}
						</span>
					</div>
				);
			},
			sortingFn: (rowA, rowB) => {
				return statusOrder[rowA.original.status] - statusOrder[rowB.original.status];
			},
		},
		{
			id: "dueAt",
			accessorFn: (row) => row.dueAt ?? "",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 px-2 text-xs font-medium text-[#6b6760] hover:text-[#3d3a32] hover:bg-[#f0ede7] cursor-pointer"
				>
					Due
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => {
				const task = row.original;
				const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status === "pending";

				if (task.dueAt) {
					return (
						<span className={cn(
							"text-sm tabular-nums",
							isOverdue ? "text-[#c93d4e] font-medium" : "text-foreground"
						)}>
							{format(new Date(task.dueAt), "MMM d")}
						</span>
					);
				}
				if (task.snoozedUntil && task.status === "snoozed") {
					return (
						<span className="text-sm text-[#8a7e6b] flex items-center gap-1">
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
					className="-ml-2 h-8 px-2 text-xs font-medium text-[#6b6760] hover:text-[#3d3a32] hover:bg-[#f0ede7] cursor-pointer"
				>
					Created
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground text-sm">
					{formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
				</span>
			),
		},
		{
			id: "actions",
			enableSorting: false,
			cell: ({ row }) => {
				const task = row.original;
				const isActionable = task.status === "pending" || task.status === "in_progress" || task.status === "snoozed";

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Task actions">
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

	// Filters
	const [statusFilter, setStatusFilter] = useState<string>("active");
	const [priorityFilter, setPriorityFilter] = useState<string>("all");
	const [sourceFilter, setSourceFilter] = useState<string>("all");

	const hasActiveFilters = statusFilter !== "active" || priorityFilter !== "all" || sourceFilter !== "all";

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
			result = result.filter(t => t.status === "pending" || t.status === "in_progress" || t.status === "snoozed");
		} else if (statusFilter !== "all") {
			result = result.filter(t => t.status === statusFilter);
		}

		if (priorityFilter !== "all") {
			result = result.filter(t => t.priority === priorityFilter);
		}

		if (sourceFilter !== "all") {
			result = result.filter(t => t.source === sourceFilter);
		}

		return result;
	}, [allTasks, statusFilter, priorityFilter, sourceFilter]);

	// Counts from full dataset (unaffected by filters)
	const counts = useMemo(() => {
		const status: Record<string, number> = { pending: 0, in_progress: 0, snoozed: 0, completed: 0, dismissed: 0 };
		const priority: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
		const source: Record<string, number> = { ai_agent: 0, manual: 0, system: 0 };

		for (const t of allTasks) {
			status[t.status] = (status[t.status] ?? 0) + 1;
			priority[t.priority] = (priority[t.priority] ?? 0) + 1;
			source[t.source] = (source[t.source] ?? 0) + 1;
		}

		const active = (status.pending ?? 0) + (status.in_progress ?? 0) + (status.snoozed ?? 0);

		return { status, priority, source, active, total: allTasks.length };
	}, [allTasks]);

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
				setAllTasks(prev => prev.map(t => t.id === id ? { ...t, ...data.task } : t));
			}
		} catch (err) {
			console.error("Failed to update task:", err);
		}
	};

	const handleComplete = (id: string) => updateTask(id, { status: "completed" });
	const handleDismiss = (id: string) => updateTask(id, { status: "dismissed" });
	const handleSnooze = (id: string, until: Date) => updateTask(id, { status: "snoozed", snoozedUntil: until.toISOString() });
	const handleReopen = (id: string) => updateTask(id, { status: "pending" });

	const columns = useMemo(
		() => createColumns(handleComplete, handleDismiss, handleSnooze, handleReopen, statusFilter),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[statusFilter],
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
			pagination: { pageSize: 20 },
		},
	});

	const isLoading = orgLoading || loading;

	const resetFilters = () => {
		setStatusFilter("active");
		setPriorityFilter("all");
		setSourceFilter("all");
	};

	return (
		<div className="flex flex-1 flex-col gap-10 p-8 bg-[#faf9f7] min-h-full">
			{/* Header */}
			<div>
				<h1 className="text-4xl font-semibold tracking-tight text-balance text-[#1c1a15]">Tasks</h1>
				<p className="text-[#6b6760] text-sm mt-1">
					Compliance actions and follow-ups requiring attention
				</p>
			</div>

			{/* Filters */}
			<div className="flex items-center justify-between gap-4">
				{/* Status tabs */}
				<div className="flex items-center gap-1 border-b border-[#eeeae4]">
					{statusTabs.map((tab) => {
						const isSelected = statusFilter === tab.value;
						const count = tab.value === "active" ? counts.active : counts.status[tab.value] ?? 0;
						return (
							<button
								key={tab.value}
								onClick={() => setStatusFilter(tab.value)}
								className={cn(
									"px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer whitespace-nowrap outline-none",
									isSelected
										? "border-[#4444cf] text-[#4444cf]"
										: "border-transparent text-[#8a857d] hover:text-[#3d3a32] hover:border-[#ccc8c0]"
								)}
							>
								{tab.label}
								<span className={cn(
									"ml-1.5 tabular-nums text-xs",
									isSelected ? "text-[#4444cf]/60" : "text-[#a8a49c]"
								)}>
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
							className="text-xs text-[#8a857d] hover:text-[#3d3a32] underline underline-offset-2 transition-colors duration-150 cursor-pointer mr-1"
						>
							Reset
						</button>
					)}
					<Select value={priorityFilter} onValueChange={setPriorityFilter}>
						<SelectTrigger className="h-8 w-[130px] text-xs cursor-pointer border-[#e0dcd4] bg-white text-[#3d3a32] focus:ring-[#ccc8c0]">
							<SelectValue placeholder="Priority" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All priorities</SelectItem>
							<SelectItem value="urgent">Urgent ({counts.priority.urgent})</SelectItem>
							<SelectItem value="high">High ({counts.priority.high})</SelectItem>
							<SelectItem value="medium">Medium ({counts.priority.medium})</SelectItem>
							<SelectItem value="low">Low ({counts.priority.low})</SelectItem>
						</SelectContent>
					</Select>
					<Select value={sourceFilter} onValueChange={setSourceFilter}>
						<SelectTrigger className="h-8 w-[120px] text-xs cursor-pointer border-[#e0dcd4] bg-white text-[#3d3a32] focus:ring-[#ccc8c0]">
							<SelectValue placeholder="Source" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All sources</SelectItem>
							<SelectItem value="ai_agent">AI ({counts.source.ai_agent})</SelectItem>
							<SelectItem value="manual">Manual ({counts.source.manual})</SelectItem>
							<SelectItem value="system">System ({counts.source.system})</SelectItem>
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
			<Card className="shadow-none! bg-white">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="bg-[#faf9f7] hover:bg-[#faf9f7]">
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className={cn(
											"text-xs font-medium text-[#6b6760]",
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
											: flexRender(header.column.columnDef.header, header.getContext())}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TaskTableSkeleton />
						) : table.getRowModel().rows.length > 0 ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className={cn(
										"bg-white",
										row.original.status === "completed" && "opacity-60",
										row.original.status === "dismissed" && "opacity-50",
									)}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow className="bg-white">
								<TableCell colSpan={columns.length} className="h-32 text-center">
									<div className="flex flex-col items-center justify-center">
										<Check className="h-8 w-8 text-[#a8a49c] mb-3" aria-hidden="true" />
										<h3 className="text-xl font-semibold text-[#1c1a15]">No tasks found</h3>
										<p className="text-sm text-[#8a857d] max-w-[40ch] mt-1">
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

				{/* Pagination */}
				{!isLoading && table.getPageCount() > 1 && (
					<div className="flex items-center justify-between border-t border-[#eeeae4] px-4 py-3">
						<p className="text-xs text-[#8a857d]">
							{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} · page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
						</p>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
								className="h-7 px-2 text-xs text-[#6b6760]"
							>
								<ChevronLeft className="h-3.5 w-3.5 mr-1" />
								Previous
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
								className="h-7 px-2 text-xs text-[#6b6760]"
							>
								Next
								<ChevronRight className="h-3.5 w-3.5 ml-1" />
							</Button>
						</div>
					</div>
				)}
			</Card>
		</div>
	);
}
