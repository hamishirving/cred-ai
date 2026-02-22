"use client";

import { useState, useMemo, useEffect } from "react";
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
import { format } from "date-fns";
import { ArrowUpDown, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
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
interface PlacementRow {
	id: string;
	candidateName: string;
	candidateEmail: string;
	roleName: string;
	facilityName: string;
	jurisdiction: string | null;
	startDate: string | null;
	status: string;
	compliancePercentage: number;
	isCompliant: boolean;
	dealType: string | null;
}

// Avatar colours matching candidates page
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

const STATUS_TABS = [
	{ value: null as string | null, label: "All" },
	{ value: "onboarding", label: "Onboarding" },
	{ value: "compliance", label: "Compliance" },
	{ value: "ready", label: "Ready" },
	{ value: "active", label: "Active" },
	{ value: "completed", label: "Completed" },
];

const STATUS_BADGE_VARIANT: Record<string, "neutral" | "info" | "warning" | "success" | "danger"> = {
	pending: "neutral",
	onboarding: "info",
	compliance: "warning",
	ready: "success",
	active: "success",
	completed: "neutral",
	cancelled: "danger",
};

function StatusBadge({ status }: { status: string }) {
	const variant = STATUS_BADGE_VARIANT[status] || "neutral";
	return (
		<Badge variant={variant} className="text-xs font-medium capitalize">
			{status}
		</Badge>
	);
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

function PlacementTableSkeleton() {
	return (
		<>
			{Array.from({ length: 8 }).map((_, i) => (
				<TableRow key={i} className="bg-card">
					<TableCell>
						<div className="flex items-center gap-3">
							<Skeleton className="h-8 w-8 rounded-full" />
							<div className="space-y-1.5">
								<Skeleton className="h-4 w-[140px]" />
								<Skeleton className="h-3 w-[180px]" />
							</div>
						</div>
					</TableCell>
					<TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
					<TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
					<TableCell><Skeleton className="h-4 w-[70px]" /></TableCell>
					<TableCell><Skeleton className="h-5 w-[70px] rounded-full" /></TableCell>
					<TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
				</TableRow>
			))}
		</>
	);
}

function createColumns(): ColumnDef<PlacementRow>[] {
	return [
		{
			accessorKey: "candidateName",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					Candidate
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => {
				const p = row.original;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="h-8 w-8">
							<AvatarFallback className={cn(getAvatarColor(p.candidateName), "text-[10px] text-white")}>
								{getInitials(p.candidateName)}
							</AvatarFallback>
						</Avatar>
						<div>
							<p className="font-medium text-sm">{p.candidateName}</p>
							<p className="text-xs text-muted-foreground">{p.candidateEmail}</p>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "roleName",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					Role
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => (
				<span className="text-sm">{row.original.roleName}</span>
			),
		},
		{
			accessorKey: "facilityName",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					Facility
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => (
				<div>
					<p className="text-sm">{row.original.facilityName}</p>
					{row.original.jurisdiction && (
						<p className="text-xs text-muted-foreground capitalize">{row.original.jurisdiction}</p>
					)}
				</div>
			),
		},
		{
			accessorKey: "startDate",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-2 h-8 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					Start Date
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground tabular-nums">
					{row.original.startDate
						? format(new Date(row.original.startDate), "dd MMM yyyy")
						: "TBC"}
				</span>
			),
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
			cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
	];
}

export default function PlacementsPage() {
	const router = useRouter();
	const { selectedOrg, loading: orgLoading } = useOrg();
	const terminology = useTerminology();
	const [placements, setPlacements] = useState<PlacementRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
	const [sorting, setSorting] = useState<SortingState>([]);

	useEffect(() => {
		if (!selectedOrg?.id) {
			setLoading(false);
			return;
		}

		async function fetchData() {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(`/api/placements?organisationId=${selectedOrg!.id}`);
				const data = await res.json();
				if (data.placements) {
					setPlacements(data.placements);
				}
			} catch (err) {
				console.error("Failed to fetch placements:", err);
				setError("Failed to load placements");
			} finally {
				setLoading(false);
			}
		}
		fetchData();
	}, [selectedOrg?.id]);

	const filteredPlacements = useMemo(() => {
		if (selectedStatus === null) return placements;
		return placements.filter((p) => p.status === selectedStatus);
	}, [selectedStatus, placements]);

	const tabs = useMemo(() => {
		return STATUS_TABS.map((tab) => ({
			...tab,
			count: tab.value === null
				? placements.length
				: placements.filter((p) => p.status === tab.value).length,
		}));
	}, [placements]);

	const columns = useMemo(() => createColumns(), []);

	const table = useReactTable({
		data: filteredPlacements,
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

	const placementLabel = terminology.placement?.toLowerCase() || "placement";
	const placementsLabel = terminology.placements || "Placements";
	const isLoading = orgLoading || loading;

	return (
		<div className="flex min-h-full flex-1 flex-col gap-10 bg-background p-8">
			{/* Header */}
			<div>
				<h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">
					{placementsLabel}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Track {placementLabel}s and their compliance status
				</p>
			</div>

			{/* Status tabs */}
			<div className="flex items-center gap-1 border-b border-border">
				{tabs.map((tab) => {
					const isSelected = selectedStatus === tab.value;
					return (
						<button
							key={tab.value ?? "all"}
							type="button"
							onClick={() => setSelectedStatus(tab.value)}
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
											header.id === "candidateName" && "w-[260px]",
											header.id === "roleName" && "w-[160px]",
											header.id === "facilityName" && "w-[200px]",
											header.id === "startDate" && "w-[120px]",
											header.id === "status" && "w-[120px]",
											header.id === "compliancePercentage" && "w-[110px]",
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
							<PlacementTableSkeleton />
						) : table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className="bg-card cursor-pointer transition-colors hover:bg-muted/60"
									onClick={() => router.push(`/placements/${row.original.id}`)}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} className="py-2">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow className="bg-card">
								<TableCell colSpan={columns.length} className="h-32 text-center">
									<div className="flex flex-col items-center justify-center">
										<Briefcase className="mb-3 h-8 w-8 text-muted-foreground/80" aria-hidden="true" />
										<h3 className="text-xl font-semibold text-foreground">
											No {placementLabel}s found
										</h3>
										<p className="mt-1 max-w-[40ch] text-sm text-muted-foreground">
											{selectedStatus
												? `No ${placementLabel}s with "${selectedStatus}" status.`
												: `No ${placementLabel}s have been created yet.`}
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
						<p className="text-xs text-muted-foreground tabular-nums">
							{filteredPlacements.length} {placementLabel}{filteredPlacements.length !== 1 ? "s" : ""} · page{" "}
							{table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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
