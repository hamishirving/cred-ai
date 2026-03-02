"use client";

import { motion } from "framer-motion";
import { ArrowUp, BarChart3, FileCheck, TrendingUp, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { AgentActivityReport } from "@/components/reports/agent-activity-report";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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

// =============================================================================
// TYPES
// =============================================================================

interface PipelineStage {
	name: string;
	total: number;
	change: number;
	segments: { name: string; value: number; color: string }[];
}

interface CohortRow {
	cohort: string;
	size: number;
	days: (number | null)[];
}

// =============================================================================
// MOCK DATA
// =============================================================================

const pipelineStages: PipelineStage[] = [
	{
		name: "Applied",
		total: 245,
		change: 12,
		segments: [
			{ name: "This week", value: 45, color: "var(--primary)" },
			{
				name: "Last week",
				value: 200,
				color: "color-mix(in srgb, var(--primary) 65%, white)",
			},
		],
	},
	{
		name: "Documents",
		total: 180,
		change: 8,
		segments: [
			{ name: "Complete", value: 120, color: "var(--positive)" },
			{
				name: "In Progress",
				value: 60,
				color: "color-mix(in srgb, var(--positive) 65%, white)",
			},
		],
	},
	{
		name: "References",
		total: 142,
		change: 5,
		segments: [
			{ name: "Verified", value: 85, color: "var(--chart-2)" },
			{
				name: "Pending",
				value: 40,
				color: "color-mix(in srgb, var(--chart-2) 72%, white)",
			},
			{
				name: "Requested",
				value: 17,
				color: "color-mix(in srgb, var(--chart-2) 50%, white)",
			},
		],
	},
	{
		name: "DBS Check",
		total: 98,
		change: 3,
		segments: [
			{ name: "Cleared", value: 65, color: "var(--chart-5)" },
			{
				name: "Processing",
				value: 33,
				color: "color-mix(in srgb, var(--chart-5) 65%, white)",
			},
		],
	},
	{
		name: "Training",
		total: 76,
		change: 4,
		segments: [
			{ name: "Complete", value: 50, color: "var(--chart-4)" },
			{
				name: "In Progress",
				value: 26,
				color: "color-mix(in srgb, var(--chart-4) 65%, white)",
			},
		],
	},
	{
		name: "Ready",
		total: 45,
		change: 6,
		segments: [{ name: "Active", value: 45, color: "var(--warning)" }],
	},
];

const cohortData: CohortRow[] = [
	{
		cohort: "Mean",
		size: 45,
		days: [0, 18, 35, 52, 68, 82, 90, 95, 98, 99, 99.5],
	},
	{
		cohort: "Oct 13 to Oct 19",
		size: 31,
		days: [0, 22, 42, 58, 72, 85, 92, 96, 98, 99, 100],
	},
	{
		cohort: "Oct 20 to Oct 26",
		size: 44,
		days: [0, 15, 32, 48, 65, 80, 88, 94, 97, 99, 100],
	},
	{
		cohort: "Oct 27 to Nov 2",
		size: 51,
		days: [0, 20, 38, 55, 70, 82, 90, 95, 98, 99, null],
	},
	{
		cohort: "Nov 3 to Nov 9",
		size: 60,
		days: [0, 12, 28, 45, 62, 78, 88, 94, 97, null, null],
	},
	{
		cohort: "Nov 10 to Nov 16",
		size: 54,
		days: [0, 18, 35, 52, 68, 82, 91, 96, null, null, null],
	},
	{
		cohort: "Nov 17 to Nov 23",
		size: 60,
		days: [0, 15, 30, 48, 65, 80, 89, null, null, null, null],
	},
	{
		cohort: "Nov 24 to Nov 30",
		size: 41,
		days: [0, 22, 40, 56, 72, 85, null, null, null, null, null],
	},
	{
		cohort: "Dec 1 to Dec 7",
		size: 53,
		days: [0, 10, 25, 42, 60, null, null, null, null, null, null],
	},
	{
		cohort: "Dec 8 to Dec 14",
		size: 29,
		days: [0, 15, 32, 50, null, null, null, null, null, null, null],
	},
	{
		cohort: "Dec 15 to Dec 21",
		size: 20,
		days: [0, 12, 28, null, null, null, null, null, null, null, null],
	},
	{
		cohort: "Dec 22 to Dec 28",
		size: 54,
		days: [0, 8, null, null, null, null, null, null, null, null, null],
	},
];

const dayColumns = [
	"Day 0",
	"Day 1",
	"Day 2",
	"Day 3",
	"Day 4",
	"Day 5",
	"Day 6",
	"Day 7",
	"Day 8",
	"Day 9",
	"Day 10",
];

const pipelineSkeletonIds = [
	"stage-1",
	"stage-2",
	"stage-3",
	"stage-4",
	"stage-5",
	"stage-6",
];

const cohortSkeletonIds = [
	"cohort-1",
	"cohort-2",
	"cohort-3",
	"cohort-4",
	"cohort-5",
	"cohort-6",
];

// =============================================================================
// REPORT TABS
// =============================================================================

const reportTabs = [
	{ value: "overview", label: "Overview" },
	{ value: "pipeline", label: "Pipeline" },
	{ value: "cohorts", label: "Cohorts" },
	{ value: "agents", label: "Agent Activity" },
] as const;

type ReportTab = (typeof reportTabs)[number]["value"];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getCellColor(
	value: number | null,
	isMean: boolean,
	isDay0: boolean,
): string {
	if (value === null) return "transparent";
	if (isDay0) {
		return isMean
			? "color-mix(in srgb, var(--chart-5) 22%, transparent)"
			: "color-mix(in srgb, var(--primary) 22%, transparent)";
	}

	if (isMean) {
		if (value >= 90) return "var(--chart-5)";
		if (value >= 70) return "color-mix(in srgb, var(--chart-5) 82%, white)";
		if (value >= 50) return "color-mix(in srgb, var(--chart-5) 68%, white)";
		if (value >= 30) return "color-mix(in srgb, var(--chart-5) 56%, white)";
		return "color-mix(in srgb, var(--chart-5) 45%, white)";
	}

	if (value >= 90) return "var(--primary)";
	if (value >= 70) return "color-mix(in srgb, var(--primary) 82%, white)";
	if (value >= 50) return "color-mix(in srgb, var(--primary) 68%, white)";
	if (value >= 30) return "color-mix(in srgb, var(--primary) 56%, white)";
	return "color-mix(in srgb, var(--primary) 45%, white)";
}

function getTextColor(value: number | null, isDay0: boolean): string {
	if (value === null) return "var(--muted-foreground)";
	if (isDay0) return "var(--muted-foreground)";
	return "var(--primary-foreground)";
}

// =============================================================================
// SKELETON COMPONENTS
// =============================================================================

function _PipelineSkeleton() {
	return (
		<Card className="shadow-none! bg-card">
			<CardHeader className="pb-2">
				<Skeleton className="h-5 w-[140px]" />
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-6 gap-4 mb-6">
					{pipelineSkeletonIds.map((id) => (
						<div key={id} className="space-y-2">
							<Skeleton className="h-3 w-[60px]" />
							<Skeleton className="h-6 w-[40px]" />
							<Skeleton className="h-3 w-[30px]" />
						</div>
					))}
				</div>
				<div className="grid grid-cols-6 gap-4 h-[280px]">
					{pipelineSkeletonIds.map((id, i) => (
						<div key={id} className="flex flex-col justify-end items-center">
							<Skeleton
								className="w-full rounded-t-lg"
								style={{ height: `${60 + i * 5}%` }}
							/>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function _CohortTableSkeleton() {
	return (
		<>
			{cohortSkeletonIds.map((id) => (
				<TableRow key={id} className="bg-card">
					<TableCell>
						<Skeleton className="h-4 w-[120px]" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-[30px]" />
					</TableCell>
					{dayColumns.map((day) => (
						<TableCell key={`${id}-${day}`} className="px-1">
							<Skeleton className="h-7 w-full rounded" />
						</TableCell>
					))}
				</TableRow>
			))}
		</>
	);
}

// =============================================================================
// COMPONENTS
// =============================================================================

function StatsOverview({ stages }: { stages: PipelineStage[] }) {
	const totalCandidates = stages[0].total;
	const readyCount = stages[stages.length - 1].total;
	const conversionRate = Math.round((readyCount / totalCandidates) * 100);

	return (
		<div className="grid gap-4 md:grid-cols-3">
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
			>
				<Card className="shadow-none! bg-card">
					<CardContent className="p-4">
						<div className="flex items-start justify-between">
							<div>
								<p className="mt-1 text-sm text-muted-foreground">
									Total Candidates
								</p>
								<p className="mt-1 text-2xl font-semibold text-foreground">
									{totalCandidates}
								</p>
								<p className="mt-1 flex items-center gap-0.5 text-xs text-[var(--positive)]">
									<TrendingUp className="h-3 w-3" />
									12% from last month
								</p>
							</div>
							<Users className="h-5 w-5 text-muted-foreground/80" />
						</div>
					</CardContent>
				</Card>
			</motion.div>
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: 0.05 }}
			>
				<Card className="shadow-none! bg-card">
					<CardContent className="p-4">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Ready to Start</p>
								<p className="mt-1 text-2xl font-semibold text-foreground">
									{readyCount}
								</p>
								<p className="mt-1 flex items-center gap-0.5 text-xs text-[var(--positive)]">
									<TrendingUp className="h-3 w-3" />
									6% from last month
								</p>
							</div>
							<FileCheck className="h-5 w-5 text-muted-foreground/80" />
						</div>
					</CardContent>
				</Card>
			</motion.div>
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: 0.1 }}
			>
				<Card className="shadow-none! bg-card">
					<CardContent className="p-4">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Conversion Rate</p>
								<p className="mt-1 text-2xl font-semibold text-foreground">
									{conversionRate}%
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Applied to ready
								</p>
							</div>
							<BarChart3 className="h-5 w-5 text-muted-foreground/80" />
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}

function PipelineChart({ stages }: { stages: PipelineStage[] }) {
	const maxTotal = Math.max(...stages.map((s) => s.total));

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: 0.15 }}
		>
			<Card className="shadow-none! bg-card">
				<CardHeader className="pb-2">
					<CardTitle className="text-base font-semibold tracking-tight text-foreground">
						Pipeline Overview
					</CardTitle>
				</CardHeader>
				<CardContent>
					{/* Metric cards row */}
					<div className="grid grid-cols-6 gap-4 mb-6">
						{stages.map((stage) => (
							<div key={stage.name} className="space-y-1">
								<p className="text-xs text-muted-foreground">{stage.name}</p>
								<p className="text-xl font-semibold text-foreground">
									{stage.total}
								</p>
								<p className="flex items-center gap-0.5 text-xs text-[var(--positive)]">
									{stage.change}% <ArrowUp className="h-3 w-3" />
								</p>
							</div>
						))}
					</div>

					{/* Stacked vertical bars */}
					<div className="grid grid-cols-6 gap-4 h-[280px]">
						{stages.map((stage, stageIdx) => {
							const heightPercent = (stage.total / maxTotal) * 100;
							return (
								<div
									key={stage.name}
									className="flex flex-col justify-end items-center"
								>
									<motion.div
										initial={{ height: 0 }}
										animate={{ height: `${heightPercent}%` }}
										transition={{ duration: 0.6, delay: stageIdx * 0.08 }}
										className="w-full rounded-t-lg overflow-hidden flex flex-col-reverse"
									>
										{stage.segments.map((segment) => {
											const segmentPercent =
												(segment.value / stage.total) * 100;
											return (
												<div
													key={`${stage.name}-${segment.name}`}
													className="w-full relative group cursor-pointer transition-opacity hover:opacity-90"
													style={{
														height: `${segmentPercent}%`,
														backgroundColor: segment.color,
														minHeight: "24px",
													}}
												>
													<span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white/90">
														{Math.round(segmentPercent)}%
													</span>
													{/* Tooltip on hover */}
													<div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-card px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100">
														<p className="font-medium text-foreground">
															{segment.name}
														</p>
														<p className="text-muted-foreground">
															{segment.value} candidates
														</p>
													</div>
												</div>
											);
										})}
									</motion.div>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}

function CohortTable({ data }: { data: CohortRow[] }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: 0.2 }}
		>
			<Card className="shadow-none! bg-card">
				<CardHeader className="pb-2">
					<CardTitle className="text-base font-semibold tracking-tight text-foreground">
						Cohort Analysis: Time to Compliance
					</CardTitle>
					<CardDescription className="text-muted-foreground">
						Percentage of candidates who have achieved compliance at each day
						since starting. Higher is better.
					</CardDescription>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="bg-[var(--table-head-surface)] hover:bg-[var(--hover-surface)]">
								<TableHead className="min-w-[140px] text-xs font-medium text-muted-foreground">
									Cohort
								</TableHead>
								<TableHead className="w-16 text-center text-xs font-medium text-muted-foreground">
									Size
								</TableHead>
								{dayColumns.map((day) => (
									<TableHead
										key={day}
										className="min-w-[70px] px-1 text-center text-xs font-medium text-muted-foreground"
									>
										{day}
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.map((row) => {
								const isMean = row.cohort === "Mean";
								return (
									<TableRow
										key={row.cohort}
										className={cn("bg-card", isMean && "font-medium")}
									>
										<TableCell className="py-2 pr-4">
											{isMean ? (
												<span className="flex items-center gap-1">
													<Badge variant="info" className="px-1.5 text-[10px]">
														Mean
													</Badge>
												</span>
											) : (
												<span className="text-sm text-foreground">
													{row.cohort}
												</span>
											)}
										</TableCell>
										<TableCell className="px-2 py-2 text-center text-sm tabular-nums text-muted-foreground">
											{row.size}
										</TableCell>
										{row.days.map((value, dayIdx) => {
											const isDay0 = dayIdx === 0;
											return (
												<TableCell
													key={`${row.cohort}-${dayColumns[dayIdx]}`}
													className="py-1.5 px-1"
												>
													<div
														className={cn(
															"rounded px-2 py-1.5 text-center text-xs font-medium transition-colors",
															value === null &&
																"border border-dashed border-border",
														)}
														style={{
															backgroundColor: getCellColor(
																value,
																isMean,
																isDay0,
															),
															color: getTextColor(value, isDay0),
														}}
													>
														{value !== null ? `${value.toFixed(1)}%` : "—"}
													</div>
												</TableCell>
											);
										})}
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</motion.div>
	);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ReportsPage() {
	const [activeTab, setActiveTab] = useState<ReportTab>("overview");

	const content = useMemo(() => {
		switch (activeTab) {
			case "overview":
				return (
					<div className="space-y-6">
						<StatsOverview stages={pipelineStages} />
						<PipelineChart stages={pipelineStages} />
						<CohortTable data={cohortData} />
					</div>
				);
			case "pipeline":
				return (
					<div className="space-y-6">
						<StatsOverview stages={pipelineStages} />
						<PipelineChart stages={pipelineStages} />
					</div>
				);
			case "cohorts":
				return <CohortTable data={cohortData} />;
			case "agents":
				return <AgentActivityReport />;
			default:
				return null;
		}
	}, [activeTab]);

	return (
		<div className="flex min-h-full flex-1 flex-col gap-10 bg-background p-8">
			{/* Header */}
			<div>
				<h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">
					Reports
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Analytics and compliance reporting
				</p>
			</div>

			{/* Tabs */}
			<div className="flex items-center gap-1 border-b border-border">
				{reportTabs.map((tab) => {
					const isSelected = activeTab === tab.value;
					return (
						<button
							type="button"
							key={tab.value}
							onClick={() => setActiveTab(tab.value)}
							className={cn(
								"px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer whitespace-nowrap outline-none",
								isSelected
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
							)}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Content */}
			{content}
		</div>
	);
}
