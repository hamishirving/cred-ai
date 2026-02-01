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
			<Badge variant="outline" className="text-xs font-medium bg-[#fdf0f1] text-[#c93d4e] border-0">
				Overdue
			</Badge>
		);
	}
	if (alertStatus === "action_required") {
		return (
			<Badge variant="outline" className="text-xs font-medium bg-[#eeedf8] text-[#4444cf] border-0">
				Review
			</Badge>
		);
	}
	return null;
}

function ComplianceIndicator({ percentage }: { percentage: number }) {
	const color =
		percentage >= 80 ? "text-[#3a9960]" :
		percentage >= 50 ? "text-[#c49332]" :
		"text-[#c93d4e]";

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
				<TableRow key={i} className="bg-white">
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
					className="-ml-2 h-8 px-2 text-xs font-medium text-[#6b6760] hover:text-[#3d3a32] hover:bg-[#f0ede7] cursor-pointer"
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
							<p className="text-xs text-[#8a857d]">{candidate.email}</p>
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
					className="-ml-2 h-8 px-2 text-xs font-medium text-[#6b6760] hover:text-[#3d3a32] hover:bg-[#f0ede7] cursor-pointer"
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
					className="-ml-2 h-8 px-2 text-xs font-medium text-[#6b6760] hover:text-[#3d3a32] hover:bg-[#f0ede7] cursor-pointer"
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
					className="-ml-2 h-8 px-2 text-xs font-medium text-[#6b6760] hover:text-[#3d3a32] hover:bg-[#f0ede7] cursor-pointer"
				>
					In Stage
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => (
				<span className="text-sm text-[#8a857d]">
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
		<div className="flex flex-1 flex-col gap-10 p-8 bg-[#faf9f7] min-h-full">
			{/* Header */}
			<div>
				<h1 className="text-4xl font-semibold tracking-tight text-balance text-[#1c1a15]">{terminology.candidates}</h1>
				<p className="text-[#6b6760] text-sm mt-1">
					Manage {terminology.candidates.toLowerCase()} through the compliance pipeline
				</p>
			</div>

			{/* Stage tabs - inline border-b-2 pattern matching tasks */}
			<div className="flex items-center gap-1 border-b border-[#eeeae4]">
				{tabs.map((tab) => {
					const isSelected = selectedStageId === tab.value;
					return (
						<button
							key={tab.value ?? "all"}
							onClick={() => setSelectedStageId(tab.value)}
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
											<TableRow className="bg-[#faf9f7] hover:bg-[#faf9f7]">
												<TableCell colSpan={columns.length} className="py-2">
													<span className="font-medium text-sm text-[#3d3a32]">
														{stageInfo?.name ?? "Unknown"}{" "}
														<span className="text-[#a8a49c]">
															{stageCandidates.length}
														</span>
													</span>
												</TableCell>
											</TableRow>
											{stageRows.map((row) => (
												<TableRow
													key={row.id}
													className="bg-white cursor-pointer hover:bg-[#f0ede7]/50 transition-colors"
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
								<TableRow className="bg-white">
									<TableCell colSpan={columns.length} className="h-32 text-center">
										<div className="flex flex-col items-center justify-center">
											<Users className="h-8 w-8 text-[#a8a49c] mb-3" aria-hidden="true" />
											<h3 className="text-xl font-semibold text-[#1c1a15]">No {terminology.candidates.toLowerCase()} found</h3>
											<p className="text-sm text-[#8a857d] max-w-[40ch] mt-1">
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
									className="bg-white cursor-pointer hover:bg-[#f0ede7]/50 transition-colors"
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
							<TableRow className="bg-white">
								<TableCell colSpan={columns.length} className="h-32 text-center">
									<div className="flex flex-col items-center justify-center">
										<Users className="h-8 w-8 text-[#a8a49c] mb-3" aria-hidden="true" />
										<h3 className="text-xl font-semibold text-[#1c1a15]">No {terminology.candidates.toLowerCase()} found</h3>
										<p className="text-sm text-[#8a857d] max-w-[40ch] mt-1">
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
					<div className="flex items-center justify-between border-t border-[#eeeae4] px-4 py-3">
						<p className="text-xs text-[#8a857d]">
							{filteredCandidates.length} {terminology.candidate.toLowerCase()}{filteredCandidates.length !== 1 ? "s" : ""} · page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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
