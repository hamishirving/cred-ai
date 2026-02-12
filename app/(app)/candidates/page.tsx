"use client";

import { useState, useMemo, Fragment, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
	getSortedRowModel,
	type SortingState,
	getPaginationRowModel,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpDown, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useTerminology } from "@/lib/hooks/use-terminology";

// Types from API
interface PipelineStage {
	id: string;
	name: string;
	stageOrder: number;
	isTerminal: boolean;
}

interface Candidate {
	id: string;
	name: string;
	email: string;
	stageId: string | null;
	stageName: string | null;
	alertStatus: "on_track" | "overdue" | "action_required";
	enteredStageAt: Date;
	compliancePercentage: number;
}

// Avatar colours matching dashboard/tasks hex system
const avatarColors = [
	"bg-primary",
	"bg-chart-2",
	"bg-chart-3",
	"bg-destructive",
	"bg-muted-foreground",
	"bg-chart-5",
];

function getAvatarColor(name: string): string {
	const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return avatarColors[hash % avatarColors.length];
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function getStageCount(stageId: string | null, candidates: Candidate[]): number {
	if (stageId === null) return candidates.length;
	return candidates.filter((c) => c.stageId === stageId).length;
}

function AlertBadge({ alertStatus }: { alertStatus: Candidate["alertStatus"] }) {
	if (alertStatus === "overdue") {
		return (
			<Badge variant="danger" className="text-xs font-medium">
				Overdue
			</Badge>
		);
	}
	if (alertStatus === "action_required") {
		return (
			<Badge variant="info" className="text-xs font-medium">
				Review
			</Badge>
		);
	}
	return null;
}

function ComplianceIndicator({ percentage }: { percentage: number }) {
	const color =
		percentage >= 80 ? "text-[var(--positive)]" :
		percentage >= 50 ? "text-[var(--warning)]" :
		"text-destructive";

	return (
		<span className={cn("text-sm tabular-nums font-medium", color)}>
			{percentage}%
		</span>
	);
}

/* ---------- Skeleton loading rows ---------- */
function CandidateTableSkeleton() {
	return (
		<>
			{Array.from({ length: 8 }).map((_, i) => (
				<TableRow key={i} className="bg-card">
					<TableCell>
						<div className="flex items-center gap-3">
							<Skeleton className="h-8 w-8 rounded-full" />
							<div className="space-y-1.5">
								<Skeleton className="h-4 w-[160px]" />
								<Skeleton className="h-3 w-[200px]" />
							</div>
						</div>
					</TableCell>
					<TableCell><Skeleton className="h-5 w-[60px] rounded-full" /></TableCell>
					<TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
					<TableCell><Skeleton className="h-4 w-[70px]" /></TableCell>
				</TableRow>
			))}
		</>
	);
}

// Column definitions factory
function createColumns(candidateLabel: string): ColumnDef<Candidate>[] {
	return [
		{
			accessorKey: "name",
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
				const candidate = row.original;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="h-8 w-8">
							<AvatarFallback className={cn(getAvatarColor(candidate.name), "text-[10px] text-white")}>
								{getInitials(candidate.name)}
							</AvatarFallback>
						</Avatar>
						<div>
							<p className="font-medium text-sm">{candidate.name}</p>
							<p className="text-xs text-muted-foreground">{candidate.email}</p>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "alertStatus",
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
			cell: ({ row }) => <AlertBadge alertStatus={row.original.alertStatus} />,
		},
		{
			accessorKey: "compliancePercentage",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					Compliance
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => <ComplianceIndicator percentage={row.original.compliancePercentage} />,
		},
		{
			accessorKey: "enteredStageAt",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					In Stage
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{formatDistanceToNow(row.original.enteredStageAt, { addSuffix: false })}
				</span>
			),
		},
	];
}

export default function CandidatesPage() {
	const router = useRouter();
	const { selectedOrg, loading: orgLoading } = useOrg();
	const terminology = useTerminology();
	const [stages, setStages] = useState<PipelineStage[]>([]);
	const [candidates, setCandidates] = useState<Candidate[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// null = "all", otherwise stage ID
	const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
	const [sorting, setSorting] = useState<SortingState>([]);

	// Fetch pipeline stages and candidates when org changes
	useEffect(() => {
		if (!selectedOrg?.id) {
			setLoading(false);
			return;
		}

		const orgId = selectedOrg.id;

		async function fetchData() {
			setLoading(true);
			setError(null);
			try {
				const [pipelineRes, candidatesRes] = await Promise.all([
					fetch(`/api/pipeline?organisationId=${orgId}`),
					fetch(`/api/candidates?organisationId=${orgId}`),
				]);

				const pipelineData = await pipelineRes.json();
				const candidatesData = await candidatesRes.json();

				if (pipelineData.pipeline?.stages) {
					setStages(pipelineData.pipeline.stages);
				} else {
					setStages([]);
				}

				if (candidatesData.candidates) {
					const candidates = candidatesData.candidates.map(
						(c: { enteredStageAt: string } & Omit<Candidate, "enteredStageAt">) => ({
							...c,
							enteredStageAt: new Date(c.enteredStageAt),
						}),
					);
					setCandidates(candidates);
				}
			} catch (err) {
				console.error("Failed to fetch data:", err);
				setError("Failed to load candidates");
			} finally {
				setLoading(false);
			}
		}
		fetchData();
	}, [selectedOrg?.id]);

	const filteredCandidates = useMemo(() => {
		if (selectedStageId === null) return candidates;
		return candidates.filter((c) => c.stageId === selectedStageId);
	}, [selectedStageId, candidates]);

	// Group candidates by stage for "All" view
	const groupedByStage = useMemo(() => {
		const groups: Record<string, Candidate[]> = {};
		for (const candidate of filteredCandidates) {
			const stageId = candidate.stageId ?? "unknown";
			if (!groups[stageId]) {
				groups[stageId] = [];
			}
			groups[stageId].push(candidate);
		}
		return groups;
	}, [filteredCandidates]);

	// Order grouped stages by stageOrder
	const orderedGroupEntries = useMemo(() => {
		const entries = Object.entries(groupedByStage);
		return entries.sort((a, b) => {
			const stageA = stages.find((s) => s.id === a[0]);
			const stageB = stages.find((s) => s.id === b[0]);
			return (stageA?.stageOrder ?? 999) - (stageB?.stageOrder ?? 999);
		});
	}, [groupedByStage, stages]);

	// Build tab list: "All" + dynamic stages
	const tabs = useMemo(() => {
		const allTab = { value: null as string | null, label: `All ${terminology.candidates.toLowerCase()}`, count: candidates.length };
		const stageTabs = stages.map((stage) => ({
			value: stage.id as string | null,
			label: stage.name,
			count: getStageCount(stage.id, candidates),
		}));
		return [allTab, ...stageTabs];
	}, [stages, candidates, terminology.candidates]);

	const columns = useMemo(
		() => createColumns(terminology.candidate),
		[terminology.candidate],
	);

	const table = useReactTable({
		data: filteredCandidates,
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

	return (
		<div className="flex min-h-full flex-1 flex-col gap-10 bg-background p-8">
			{/* Header */}
			<div>
				<h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">{terminology.candidates}</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Manage {terminology.candidates.toLowerCase()} through the compliance pipeline
				</p>
			</div>

			{/* Stage tabs - inline border-b-2 pattern matching tasks */}
			<div className="flex items-center gap-1 border-b border-border">
				{tabs.map((tab) => {
					const isSelected = selectedStageId === tab.value;
					return (
						<button
							key={tab.value ?? "all"}
							onClick={() => setSelectedStageId(tab.value)}
							className={cn(
								"px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer whitespace-nowrap outline-none",
								isSelected
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
							)}
						>
							{tab.label}
							<span className={cn(
								"ml-1.5 tabular-nums text-xs",
								isSelected ? "text-primary/70" : "text-muted-foreground/80"
							)}>
								{tab.count}
							</span>
						</button>
					);
				})}
			</div>

			{/* Error state */}
			{error && (
				<div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
					{error}
				</div>
			)}

			{/* Data Table */}
			<Card className="shadow-none! bg-card">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="bg-muted hover:bg-muted">
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className={cn(
											"text-xs font-medium text-muted-foreground",
											header.id === "name" && "w-[300px]",
											header.id === "alertStatus" && "w-[120px]",
											header.id === "compliancePercentage" && "w-[120px]",
											header.id === "enteredStageAt" && "w-[120px]",
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
							<CandidateTableSkeleton />
						) : selectedStageId === null ? (
							// Grouped view for "All"
							orderedGroupEntries.length > 0 ? (
								orderedGroupEntries.map(([stageId, stageCandidates]) => {
									const stageInfo = stages.find((s) => s.id === stageId);
									const stageRows = table
										.getRowModel()
										.rows.filter((row) => (row.original.stageId ?? "unknown") === stageId);

									return (
										<Fragment key={stageId}>
											<TableRow className="bg-[var(--table-head-surface)] hover:bg-[var(--hover-surface)]">
												<TableCell colSpan={columns.length} className="py-2">
													<span className="text-sm font-medium text-foreground">
														{stageInfo?.name ?? "Unknown"}{" "}
														<span className="text-muted-foreground/80">
															{stageCandidates.length}
														</span>
													</span>
												</TableCell>
											</TableRow>
											{stageRows.map((row) => (
												<TableRow
													key={row.id}
													className="bg-card cursor-pointer transition-colors hover:bg-muted/60"
													onClick={() => router.push(`/candidates/${row.original.id}`)}
												>
													{row.getVisibleCells().map((cell) => (
														<TableCell key={cell.id}>
															{flexRender(cell.column.columnDef.cell, cell.getContext())}
														</TableCell>
													))}
												</TableRow>
											))}
										</Fragment>
									);
								})
							) : (
								<TableRow className="bg-card">
									<TableCell colSpan={columns.length} className="h-32 text-center">
										<div className="flex flex-col items-center justify-center">
											<Users className="mb-3 h-8 w-8 text-muted-foreground/80" aria-hidden="true" />
											<h3 className="text-xl font-semibold text-foreground">No {terminology.candidates.toLowerCase()} found</h3>
											<p className="mt-1 max-w-[40ch] text-sm text-muted-foreground">
												No {terminology.candidates.toLowerCase()} have been added yet.
											</p>
										</div>
									</TableCell>
								</TableRow>
							)
						) : table.getRowModel().rows?.length ? (
							// Flat view for specific stage
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className="bg-card cursor-pointer transition-colors hover:bg-muted/60"
									onClick={() => router.push(`/candidates/${row.original.id}`)}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow className="bg-card">
								<TableCell colSpan={columns.length} className="h-32 text-center">
									<div className="flex flex-col items-center justify-center">
										<Users className="mb-3 h-8 w-8 text-muted-foreground/80" aria-hidden="true" />
										<h3 className="text-xl font-semibold text-foreground">No {terminology.candidates.toLowerCase()} found</h3>
										<p className="mt-1 max-w-[40ch] text-sm text-muted-foreground">
											No {terminology.candidates.toLowerCase()} in this stage.
										</p>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>

				{/* Pagination */}
				{!isLoading && table.getPageCount() > 1 && (
					<div className="flex items-center justify-between border-t border-border px-4 py-3">
						<p className="text-xs text-muted-foreground">
							{filteredCandidates.length} {terminology.candidate.toLowerCase()}{filteredCandidates.length !== 1 ? "s" : ""} · page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
						</p>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
								className="h-7 px-2 text-xs text-muted-foreground"
							>
								<ChevronLeft className="h-3.5 w-3.5 mr-1" />
								Previous
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
								className="h-7 px-2 text-xs text-muted-foreground"
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
