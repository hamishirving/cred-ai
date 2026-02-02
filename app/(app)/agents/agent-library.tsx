"use client";

import { useState, useEffect, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
	getSortedRowModel,
	getPaginationRowModel,
	type SortingState,
} from "@tanstack/react-table";
import {
	Bot,
	Clock,
	DollarSign,
	PoundSterling,
	Timer,
	Activity,
	Check,
	X,
	AlertTriangle,
	Loader2,
	Wrench,
	Zap,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { SerializedAgentDefinition } from "@/lib/ai/agents/types";
import { TableLoader } from "@/components/elements/table-loader";

// =============================================================================
// TYPES
// =============================================================================

interface AgentExecution {
	id: string;
	agentId: string;
	status: "running" | "completed" | "failed" | "escalated";
	durationMs: number | null;
	tokensUsed: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	} | null;
	startedAt: string;
	completedAt: string | null;
	createdAt: string;
}

// =============================================================================
// CONFIG
// =============================================================================

const statusConfig = {
	running: { label: "Running", icon: Loader2, color: "text-[#4444cf]", iconClass: "animate-spin" },
	completed: { label: "Completed", icon: Check, color: "text-[#3a9960]", iconClass: "" },
	failed: { label: "Failed", icon: X, color: "text-[#c93d4e]", iconClass: "" },
	escalated: { label: "Escalated", icon: AlertTriangle, color: "text-[#c49332]", iconClass: "" },
};

const statusOrder: Record<string, number> = {
	running: 0,
	escalated: 1,
	failed: 2,
	completed: 3,
};

const HOURS_PER_RUN = 1.5;
const HOURLY_RATE_GBP = 35;
const HOURLY_RATE_USD = 45;

function detectCurrency(orgName: string | undefined): { symbol: string; rate: number } {
	if (!orgName) return { symbol: "£", rate: HOURLY_RATE_GBP };
	const lower = orgName.toLowerCase();
	if (lower.includes("travel") || lower.includes("lakeside") || lower.includes("us") || lower.includes("texas") || lower.includes("america")) {
		return { symbol: "$", rate: HOURLY_RATE_USD };
	}
	return { symbol: "£", rate: HOURLY_RATE_GBP };
}

// =============================================================================
// COLUMN HEADER HELPER
// =============================================================================

function SortableHeader({ column, children }: { column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => false | "asc" | "desc" }; children: React.ReactNode }) {
	return (
		<Button
			variant="ghost"
			onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			className="-ml-2 h-8 px-2 text-xs font-medium text-[#6b6760] hover:text-[#3d3a32] hover:bg-[#f0ede7] cursor-pointer"
		>
			{children}
			<ArrowUpDown className="ml-2 h-3 w-3" />
		</Button>
	);
}

// =============================================================================
// AGENTS TABLE COLUMNS
// =============================================================================

const agentColumns: ColumnDef<SerializedAgentDefinition>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
		cell: ({ row }) => {
			const agent = row.original;
			return (
				<div className="min-w-0">
					<div className="font-medium text-sm text-[#1c1a15] truncate">
						{agent.name}
					</div>
					<div className="text-xs text-[#8a857d] truncate max-w-[200px]">
						{agent.description}
					</div>
				</div>
			);
		},
	},
	{
		accessorFn: (row) => row.trigger.type,
		id: "trigger",
		header: ({ column }) => <SortableHeader column={column}>Trigger</SortableHeader>,
		cell: ({ row }) => (
			<Badge variant="outline" className="text-xs gap-1">
				<Zap className="size-2.5" />
				{row.original.trigger.type}
			</Badge>
		),
	},
	{
		accessorFn: (row) => row.tools.length,
		id: "tools",
		header: ({ column }) => <SortableHeader column={column}>Tools</SortableHeader>,
		cell: ({ row }) => (
			<Badge variant="outline" className="text-xs gap-1">
				<Wrench className="size-2.5" />
				{row.original.tools.length}
			</Badge>
		),
	},
	{
		id: "chevron",
		enableSorting: false,
		cell: () => <ChevronRight className="h-4 w-4 text-[#a8a49c]" />,
	},
];

// =============================================================================
// RUNS TABLE COLUMNS
// =============================================================================

function createRunColumns(agentNameMap: Record<string, string>): ColumnDef<AgentExecution>[] {
	return [
		{
			accessorFn: (row) => agentNameMap[row.agentId] || row.agentId,
			id: "agent",
			header: ({ column }) => <SortableHeader column={column}>Agent</SortableHeader>,
			cell: ({ row }) => (
				<span className="text-sm font-medium text-[#1c1a15] truncate block max-w-[160px]">
					{agentNameMap[row.original.agentId] || row.original.agentId}
				</span>
			),
		},
		{
			accessorKey: "status",
			header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
			cell: ({ row }) => {
				const config = statusConfig[row.original.status];
				const StatusIcon = config.icon;
				return (
					<div className="flex items-center gap-1.5">
						<StatusIcon className={cn("h-4 w-4", config.color, config.iconClass)} />
						<span className={cn("text-sm", config.color)}>{config.label}</span>
					</div>
				);
			},
			sortingFn: (rowA, rowB) =>
				(statusOrder[rowA.original.status] ?? 99) - (statusOrder[rowB.original.status] ?? 99),
		},
		{
			accessorKey: "durationMs",
			header: ({ column }) => <SortableHeader column={column}>Duration</SortableHeader>,
			cell: ({ row }) => (
				<span className="text-sm text-[#8a857d] tabular-nums">
					{row.original.durationMs
						? `${(row.original.durationMs / 1000).toFixed(1)}s`
						: "—"}
				</span>
			),
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => <SortableHeader column={column}>When</SortableHeader>,
			cell: ({ row }) => (
				<span className="text-sm text-[#8a857d] whitespace-nowrap">
					{formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
				</span>
			),
		},
		{
			id: "chevron",
			enableSorting: false,
			cell: () => <ChevronRight className="h-4 w-4 text-[#a8a49c]" />,
		},
	];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AgentLibrary({ agents }: { agents: SerializedAgentDefinition[] }) {
	const { selectedOrg } = useOrg();
	const [executions, setExecutions] = useState<AgentExecution[]>([]);
	const [loadingExecs, setLoadingExecs] = useState(true);
	const [agentSorting, setAgentSorting] = useState<SortingState>([]);
	const [runSorting, setRunSorting] = useState<SortingState>([]);

	useEffect(() => {
		async function fetchExecutions() {
			setLoadingExecs(true);
			try {
				const allExecs: AgentExecution[] = [];
				for (const agent of agents) {
					try {
						const res = await fetch(`/api/agents/${agent.id}/executions`);
						if (res.ok) {
							const data = await res.json();
							if (data.executions) {
								allExecs.push(...data.executions);
							}
						}
					} catch {
						// Skip individual agent fetch failures
					}
				}
				allExecs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
				setExecutions(allExecs);
			} catch {
				// Silently fail
			} finally {
				setLoadingExecs(false);
			}
		}
		fetchExecutions();
	}, [agents]);

	const currency = detectCurrency(selectedOrg?.name);

	const stats = useMemo(() => {
		const completedRuns = executions.filter((e) => e.status === "completed").length;
		const totalRuns = executions.length;
		const hoursSaved = Math.round(completedRuns * HOURS_PER_RUN * 10) / 10;
		const moneySaved = Math.round(hoursSaved * currency.rate);
		return { totalAgents: agents.length, totalRuns, hoursSaved, moneySaved };
	}, [executions, agents.length, currency.rate]);

	const agentNameMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const a of agents) map[a.id] = a.name;
		return map;
	}, [agents]);

	const runColumns = useMemo(() => createRunColumns(agentNameMap), [agentNameMap]);

	const agentTable = useReactTable({
		data: agents,
		columns: agentColumns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setAgentSorting,
		state: { sorting: agentSorting },
	});

	const runTable = useReactTable({
		data: executions,
		columns: runColumns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setRunSorting,
		state: { sorting: runSorting },
		initialState: {
			pagination: { pageSize: 10 },
		},
	});

	const runPageIndex = runTable.getState().pagination.pageIndex;
	const runPageCount = runTable.getPageCount();
	const runTotalRows = executions.length;
	const runStartRow = runPageIndex * 10 + 1;
	const runEndRow = Math.min((runPageIndex + 1) * 10, runTotalRows);

	return (
		<div className="flex flex-col gap-6">
			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card className="shadow-none! bg-white border-l-4 border-l-[#4444cf]">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-[#8a857d]">Active Agents</p>
								<p className="text-xl font-semibold text-[#1c1a15]">{stats.totalAgents}</p>
							</div>
							<Bot className="h-6 w-6 text-[#a8a49c]" />
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-none! bg-white border-l-4 border-l-[#8a7e6b]">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-[#8a857d]">Total Runs</p>
								<p className="text-xl font-semibold text-[#1c1a15]">{stats.totalRuns}</p>
							</div>
							<Activity className="h-6 w-6 text-[#a8a49c]" />
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-none! bg-white border-l-4 border-l-[#c49332]">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-[#8a857d]">Hours Saved</p>
								<p className="text-xl font-semibold text-[#1c1a15]">{stats.hoursSaved}</p>
							</div>
							<Timer className="h-6 w-6 text-[#a8a49c]" />
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-none! bg-white border-l-4 border-l-[#3a9960]">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-[#8a857d]">Money Saved</p>
								<p className="text-xl font-semibold text-[#1c1a15]">
									{currency.symbol}{stats.moneySaved.toLocaleString()}
								</p>
							</div>
							{currency.symbol === "$" ? (
								<DollarSign className="h-6 w-6 text-[#a8a49c]" />
							) : (
								<PoundSterling className="h-6 w-6 text-[#a8a49c]" />
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Split layout: Agents table + Runs table */}
			<div className="grid gap-4 lg:grid-cols-2">
				{/* Agents table */}
				<div>
					<div className="flex items-center justify-between mb-2 px-1">
						<h2 className="text-base font-semibold tracking-tight text-[#1c1a15] flex items-center gap-2">
							<Bot className="h-4 w-4 text-[#6b6760]" />
							Agents
						</h2>
						<Badge variant="secondary" className="text-xs tabular-nums">
							{agents.length}
						</Badge>
					</div>
					<Card className="shadow-none! bg-white">
						<Table>
							<TableHeader>
								{agentTable.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id} className="bg-[#faf9f7] hover:bg-[#faf9f7]">
										{headerGroup.headers.map((header) => (
											<TableHead
												key={header.id}
												className={cn(
													"text-xs font-medium text-[#6b6760]",
													header.id === "trigger" && "w-[90px]",
													header.id === "tools" && "w-[80px]",
													header.id === "chevron" && "w-[40px]",
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
								{agentTable.getRowModel().rows.length > 0 ? (
									agentTable.getRowModel().rows.map((row) => (
										<TableRow
											key={row.id}
											className="bg-white cursor-pointer hover:bg-[#f7f5f0]"
											onClick={() => window.location.href = `/agents/${row.original.id}`}
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
										<TableCell colSpan={agentColumns.length} className="h-24 text-center">
											<div className="flex flex-col items-center">
												<Bot className="h-8 w-8 text-[#a8a49c] mb-2" />
												<p className="text-sm text-[#8a857d]">No agents registered</p>
											</div>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
							</Table>
					</Card>
				</div>

				{/* Recent runs table */}
				<div>
					<div className="flex items-center justify-between mb-2 px-1">
						<h2 className="text-base font-semibold tracking-tight text-[#1c1a15] flex items-center gap-2">
							<Activity className="h-4 w-4 text-[#6b6760]" />
							Recent Runs
						</h2>
						<Badge variant="secondary" className="text-xs tabular-nums">
							{executions.length}
						</Badge>
					</div>
					<Card className="shadow-none! bg-white">
						{loadingExecs ? (
							<TableLoader cols={5} rows={10} />
						) : (
							<Table>
								<TableHeader>
									{runTable.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id} className="bg-[#faf9f7] hover:bg-[#faf9f7]">
											{headerGroup.headers.map((header) => (
												<TableHead
													key={header.id}
													className={cn(
														"text-xs font-medium text-[#6b6760]",
														header.id === "agent" && "w-[35%]",
														header.id === "status" && "w-[20%]",
														header.id === "durationMs" && "w-[18%]",
														header.id === "createdAt" && "w-[22%]",
														header.id === "chevron" && "w-[40px]",
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
									{runTable.getRowModel().rows.length > 0 ? (
										runTable.getRowModel().rows.map((row) => (
											<TableRow
												key={row.id}
												className="bg-white cursor-pointer hover:bg-[#f7f5f0]"
												onClick={() => window.location.href = `/agents/${row.original.agentId}/executions/${row.original.id}`}
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
											<TableCell colSpan={runColumns.length} className="h-24 text-center">
												<div className="flex flex-col items-center">
													<Clock className="h-8 w-8 text-[#a8a49c] mb-2" />
													<p className="text-sm text-[#8a857d]">No runs yet</p>
													<p className="text-xs text-[#8a857d]">Run an agent to see results here</p>
												</div>
											</TableCell>
										</TableRow>
									)}
								</TableBody>
								</Table>
						)}
						{runPageCount > 1 && (
							<div className="flex items-center justify-between px-4 py-2 border-t border-[#e5e2db] text-xs text-[#8a857d]">
								<span>
									{runStartRow}–{runEndRow} of {runTotalRows}
								</span>
								<div className="flex items-center gap-1">
									<Button
										variant="ghost"
										size="sm"
										className="h-7 w-7 p-0"
										disabled={!runTable.getCanPreviousPage()}
										onClick={() => runTable.previousPage()}
									>
										<ChevronLeft className="size-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className="h-7 w-7 p-0"
										disabled={!runTable.getCanNextPage()}
										onClick={() => runTable.nextPage()}
									>
										<ChevronRight className="size-3.5" />
									</Button>
								</div>
							</div>
						)}
					</Card>
				</div>
			</div>
		</div>
	);
}
