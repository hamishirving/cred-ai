"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUp, BarChart3, TrendingUp, Users, FileCheck } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
			{ name: "This week", value: 45, color: "#4444cf" },
			{ name: "Last week", value: 200, color: "#7a7ad9" },
		],
	},
	{
		name: "Documents",
		total: 180,
		change: 8,
		segments: [
			{ name: "Complete", value: 120, color: "#3a9960" },
			{ name: "In Progress", value: 60, color: "#6db88a" },
		],
	},
	{
		name: "References",
		total: 142,
		change: 5,
		segments: [
			{ name: "Verified", value: 85, color: "#2a8a7a" },
			{ name: "Pending", value: 40, color: "#5aab9e" },
			{ name: "Requested", value: 17, color: "#8ac4bb" },
		],
	},
	{
		name: "DBS Check",
		total: 98,
		change: 3,
		segments: [
			{ name: "Cleared", value: 65, color: "#6b4fc7" },
			{ name: "Processing", value: 33, color: "#9a86d9" },
		],
	},
	{
		name: "Training",
		total: 76,
		change: 4,
		segments: [
			{ name: "Complete", value: 50, color: "#c44d8b" },
			{ name: "In Progress", value: 26, color: "#d480ab" },
		],
	},
	{
		name: "Ready",
		total: 45,
		change: 6,
		segments: [{ name: "Active", value: 45, color: "#c49332" }],
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

// =============================================================================
// REPORT TABS
// =============================================================================

const reportTabs = [
	{ value: "overview", label: "Overview" },
	{ value: "pipeline", label: "Pipeline" },
	{ value: "cohorts", label: "Cohorts" },
] as const;

type ReportTab = (typeof reportTabs)[number]["value"];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getCellColor(value: number | null, isMean: boolean, isDay0: boolean): string {
	if (value === null) return "transparent";
	if (isDay0) return isMean ? "#e8e0f0" : "#dfe6f0";

	if (isMean) {
		if (value >= 90) return "#6b4fc7";
		if (value >= 70) return "#7d65cf";
		if (value >= 50) return "#8f7bd7";
		if (value >= 30) return "#a191df";
		return "#b3a7e7";
	}

	if (value >= 90) return "#4444cf";
	if (value >= 70) return "#5c5cd5";
	if (value >= 50) return "#7474db";
	if (value >= 30) return "#8c8ce1";
	return "#a4a4e7";
}

function getTextColor(value: number | null, isDay0: boolean): string {
	if (value === null) return "#a8a49c";
	if (isDay0) return "#8a857d";
	return "white";
}

// =============================================================================
// SKELETON COMPONENTS
// =============================================================================

function PipelineSkeleton() {
	return (
		<Card className="shadow-none! bg-white">
			<CardHeader className="pb-2">
				<Skeleton className="h-5 w-[140px]" />
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-6 gap-4 mb-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="space-y-2">
							<Skeleton className="h-3 w-[60px]" />
							<Skeleton className="h-6 w-[40px]" />
							<Skeleton className="h-3 w-[30px]" />
						</div>
					))}
				</div>
				<div className="grid grid-cols-6 gap-4 h-[280px]">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="flex flex-col justify-end items-center">
							<Skeleton className="w-full rounded-t-lg" style={{ height: `${60 + i * 5}%` }} />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function CohortTableSkeleton() {
	return (
		<>
			{Array.from({ length: 6 }).map((_, i) => (
				<TableRow key={i} className="bg-white">
					<TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
					<TableCell><Skeleton className="h-4 w-[30px]" /></TableCell>
					{Array.from({ length: 11 }).map((_, j) => (
						<TableCell key={j} className="px-1">
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
				<Card className="shadow-none! bg-white">
					<CardContent className="p-4">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-sm text-[#8a857d]">Total Candidates</p>
								<p className="text-2xl font-semibold text-[#1c1a15] mt-1">{totalCandidates}</p>
								<p className="text-xs text-[#3a9960] flex items-center gap-0.5 mt-1">
									<TrendingUp className="h-3 w-3" />
									12% from last month
								</p>
							</div>
							<Users className="h-5 w-5 text-[#a8a49c]" />
						</div>
					</CardContent>
				</Card>
			</motion.div>
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: 0.05 }}
			>
				<Card className="shadow-none! bg-white">
					<CardContent className="p-4">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-sm text-[#8a857d]">Ready to Start</p>
								<p className="text-2xl font-semibold text-[#1c1a15] mt-1">{readyCount}</p>
								<p className="text-xs text-[#3a9960] flex items-center gap-0.5 mt-1">
									<TrendingUp className="h-3 w-3" />
									6% from last month
								</p>
							</div>
							<FileCheck className="h-5 w-5 text-[#a8a49c]" />
						</div>
					</CardContent>
				</Card>
			</motion.div>
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: 0.1 }}
			>
				<Card className="shadow-none! bg-white">
					<CardContent className="p-4">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-sm text-[#8a857d]">Conversion Rate</p>
								<p className="text-2xl font-semibold text-[#1c1a15] mt-1">{conversionRate}%</p>
								<p className="text-xs text-[#8a857d] mt-1">Applied to ready</p>
							</div>
							<BarChart3 className="h-5 w-5 text-[#a8a49c]" />
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
			<Card className="shadow-none! bg-white">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-semibold text-[#1c1a15]">Pipeline Overview</CardTitle>
				</CardHeader>
				<CardContent>
					{/* Metric cards row */}
					<div className="grid grid-cols-6 gap-4 mb-6">
						{stages.map((stage) => (
							<div key={stage.name} className="space-y-1">
								<p className="text-xs text-[#8a857d]">{stage.name}</p>
								<p className="text-xl font-semibold text-[#1c1a15]">{stage.total}</p>
								<p className="text-xs text-[#3a9960] flex items-center gap-0.5">
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
										{stage.segments.map((segment, idx) => {
											const segmentPercent =
												(segment.value / stage.total) * 100;
											return (
												<div
													key={idx}
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
													<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white border border-[#e5e2db] rounded shadow-sm text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
														<p className="font-medium text-[#1c1a15]">{segment.name}</p>
														<p className="text-[#8a857d]">
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
			<Card className="shadow-none! bg-white">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-semibold text-[#1c1a15]">
						Cohort Analysis: Time to Compliance
					</CardTitle>
					<CardDescription className="text-[#8a857d]">
						Percentage of candidates who have achieved compliance at each day
						since starting. Higher is better.
					</CardDescription>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="bg-[#faf9f7] hover:bg-[#faf9f7]">
								<TableHead className="text-xs font-medium text-[#6b6760] min-w-[140px]">
									Cohort
								</TableHead>
								<TableHead className="text-xs font-medium text-[#6b6760] text-center w-16">
									Size
								</TableHead>
								{dayColumns.map((day) => (
									<TableHead
										key={day}
										className="text-xs font-medium text-[#6b6760] text-center min-w-[70px] px-1"
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
										className={cn(
											"bg-white",
											isMean && "font-medium"
										)}
									>
										<TableCell className="py-2 pr-4">
											{isMean ? (
												<span className="flex items-center gap-1">
													<Badge
														variant="outline"
														className="text-[10px] px-1.5 border-[#6b4fc7]/30 text-[#6b4fc7]"
													>
														Mean
													</Badge>
												</span>
											) : (
												<span className="text-sm text-[#3d3a32]">{row.cohort}</span>
											)}
										</TableCell>
										<TableCell className="text-center py-2 px-2 text-sm text-[#8a857d] tabular-nums">
											{row.size}
										</TableCell>
										{row.days.map((value, dayIdx) => {
											const isDay0 = dayIdx === 0;
											return (
												<TableCell key={dayIdx} className="py-1.5 px-1">
													<div
														className={cn(
															"rounded px-2 py-1.5 text-center text-xs font-medium transition-colors",
															value === null && "border border-dashed border-[#e5e2db]"
														)}
														style={{
															backgroundColor: getCellColor(value, isMean, isDay0),
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
				return (
					<CohortTable data={cohortData} />
				);
			default:
				return null;
		}
	}, [activeTab]);

	return (
		<div className="flex flex-1 flex-col gap-10 p-8 bg-[#faf9f7] min-h-full">
			{/* Header */}
			<div>
				<h1 className="text-4xl font-semibold tracking-tight text-balance text-[#1c1a15]">Reports</h1>
				<p className="text-[#6b6760] text-sm mt-1">
					Analytics and compliance reporting
				</p>
			</div>

			{/* Tabs */}
			<div className="flex items-center gap-1 border-b border-[#eeeae4]">
				{reportTabs.map((tab) => {
					const isSelected = activeTab === tab.value;
					return (
						<button
							key={tab.value}
							onClick={() => setActiveTab(tab.value)}
							className={cn(
								"px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer whitespace-nowrap outline-none",
								isSelected
									? "border-[#4444cf] text-[#4444cf]"
									: "border-transparent text-[#8a857d] hover:text-[#3d3a32] hover:border-[#ccc8c0]"
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
