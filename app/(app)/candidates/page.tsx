"use client";

import { useState, useMemo, Fragment, useEffect } from "react";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
	getSortedRowModel,
	type SortingState,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

// Avatar colors based on name hash
const avatarColors = [
	"bg-blue-500",
	"bg-purple-500",
	"bg-pink-500",
	"bg-green-500",
	"bg-orange-500",
	"bg-teal-500",
	"bg-indigo-500",
	"bg-cyan-500",
	"bg-rose-500",
	"bg-amber-500",
	"bg-emerald-500",
	"bg-sky-500",
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
	if (stageId === null) return candidates.length; // "all" tab
	return candidates.filter((c) => c.stageId === stageId).length;
}

function AlertBadge({ alertStatus }: { alertStatus: Candidate["alertStatus"] }) {
	if (alertStatus === "overdue") {
		return (
			<Badge variant="destructive" className="text-xs">
				Overdue
			</Badge>
		);
	}
	if (alertStatus === "action_required") {
		return (
			<Badge className="bg-blue-500 hover:bg-blue-600 text-xs">Review</Badge>
		);
	}
	return null;
}

// Column definitions
const columns: ColumnDef<Candidate>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && "indeterminate")
				}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label="Select row"
			/>
		),
		enableSorting: false,
	},
	{
		accessorKey: "name",
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="-ml-4"
			>
				Candidate
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => {
			const candidate = row.original;
			return (
				<div className="flex items-center gap-3">
					<Avatar className="h-9 w-9">
						<AvatarFallback className={getAvatarColor(candidate.name)}>
							<span className="text-white text-xs font-medium">
								{getInitials(candidate.name)}
							</span>
						</AvatarFallback>
					</Avatar>
					<div>
						<p className="font-medium">{candidate.name}</p>
						<p className="text-sm text-muted-foreground">{candidate.email}</p>
					</div>
				</div>
			);
		},
	},
	{
		accessorKey: "alertStatus",
		header: "Status",
		cell: ({ row }) => <AlertBadge alertStatus={row.original.alertStatus} />,
	},
	{
		accessorKey: "compliancePercentage",
		header: "Compliance",
		cell: ({ row }) => (
			<div className="text-muted-foreground">
				{row.original.compliancePercentage}%
			</div>
		),
	},
	{
		accessorKey: "enteredStageAt",
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="-mr-4 ml-auto"
			>
				In Stage
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => (
			<div className="text-right text-muted-foreground">
				{formatDistanceToNow(row.original.enteredStageAt, { addSuffix: false })}
			</div>
		),
	},
];

export default function CandidatesPage() {
	const { selectedOrg, loading: orgLoading } = useOrg();
	const [stages, setStages] = useState<PipelineStage[]>([]);
	const [candidates, setCandidates] = useState<Candidate[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// null = "all", otherwise stage ID
	const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState({});

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
				// Fetch pipeline and candidates in parallel
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
					// Convert date strings back to Date objects
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

	const table = useReactTable({
		data: filteredCandidates,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			rowSelection,
		},
	});

	const isLoading = orgLoading || loading;

	return (
		<div className="flex flex-1 flex-col gap-4 p-6">
			<div>
				<h1 className="text-2xl font-semibold">Candidates</h1>
				<p className="text-muted-foreground">
					Manage candidates through the compliance pipeline
				</p>
			</div>

			{/* Stage Tabs */}
			<div className="flex gap-1 border-b overflow-x-auto">
				{/* All candidates tab */}
				<button
					onClick={() => setSelectedStageId(null)}
					className={cn(
						"flex flex-col items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors min-w-[100px]",
						selectedStageId === null
							? "border-primary text-primary bg-muted/50"
							: "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30",
					)}
				>
					<span className="text-lg font-semibold">{candidates.length}</span>
					<span className="whitespace-nowrap">All candidates</span>
				</button>

				{/* Dynamic stage tabs */}
				{stages.map((stage) => {
					const count = getStageCount(stage.id, candidates);
					const isActive = selectedStageId === stage.id;
					return (
						<button
							key={stage.id}
							onClick={() => setSelectedStageId(stage.id)}
							className={cn(
								"flex flex-col items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors min-w-[100px]",
								isActive
									? "border-primary text-primary bg-muted/50"
									: "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30",
							)}
						>
							<span className="text-lg font-semibold">{count}</span>
							<span className="whitespace-nowrap">{stage.name}</span>
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

			{/* Loading state */}
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			)}

			{/* Data Table */}
			{!isLoading && !error && (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<TableHead
											key={header.id}
											className={header.id === "enteredStageAt" ? "text-right" : ""}
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
							{selectedStageId === null ? (
								// Grouped view
								orderedGroupEntries.length > 0 ? (
									orderedGroupEntries.map(([stageId, stageCandidates]) => {
										const stageInfo = stages.find((s) => s.id === stageId);
										const stageRows = table
											.getRowModel()
											.rows.filter((row) => (row.original.stageId ?? "unknown") === stageId);

										return (
											<Fragment key={stageId}>
												<TableRow className="bg-muted/30 hover:bg-muted/30">
													<TableCell colSpan={columns.length} className="py-2">
														<span className="font-medium text-muted-foreground">
															{stageInfo?.name ?? "Unknown"}{" "}
															<span className="text-muted-foreground/70">
																{stageCandidates.length}
															</span>
														</span>
													</TableCell>
												</TableRow>
												{stageRows.map((row) => (
													<TableRow
														key={row.id}
														data-state={row.getIsSelected() && "selected"}
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
												))}
											</Fragment>
										);
									})
								) : (
									<TableRow>
										<TableCell
											colSpan={columns.length}
											className="h-24 text-center text-muted-foreground"
										>
											No candidates found
										</TableCell>
									</TableRow>
								)
							) : table.getRowModel().rows?.length ? (
								// Flat view for specific stage
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
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
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center text-muted-foreground"
									>
										No candidates found
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Selection info */}
			{Object.keys(rowSelection).length > 0 && (
				<div className="text-sm text-muted-foreground">
					{Object.keys(rowSelection).length} of {filteredCandidates.length}{" "}
					candidate(s) selected
				</div>
			)}
		</div>
	);
}
