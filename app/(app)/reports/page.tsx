"use client";

import { ArrowUp } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Pipeline stages with stacked segments
const pipelineStages = [
	{
		name: "Applied",
		total: 245,
		change: 12,
		segments: [
			{ name: "This week", value: 45, color: "hsl(210, 90%, 55%)" },
			{ name: "Last week", value: 200, color: "hsl(210, 70%, 70%)" },
		],
	},
	{
		name: "Documents",
		total: 180,
		change: 8,
		segments: [
			{ name: "Complete", value: 120, color: "hsl(142, 70%, 45%)" },
			{ name: "In Progress", value: 60, color: "hsl(142, 50%, 65%)" },
		],
	},
	{
		name: "References",
		total: 142,
		change: 5,
		segments: [
			{ name: "Verified", value: 85, color: "hsl(175, 60%, 45%)" },
			{ name: "Pending", value: 40, color: "hsl(175, 40%, 60%)" },
			{ name: "Requested", value: 17, color: "hsl(175, 30%, 75%)" },
		],
	},
	{
		name: "DBS Check",
		total: 98,
		change: 3,
		segments: [
			{ name: "Cleared", value: 65, color: "hsl(262, 60%, 55%)" },
			{ name: "Processing", value: 33, color: "hsl(262, 40%, 70%)" },
		],
	},
	{
		name: "Training",
		total: 76,
		change: 4,
		segments: [
			{ name: "Complete", value: 50, color: "hsl(320, 60%, 55%)" },
			{ name: "In Progress", value: 26, color: "hsl(320, 40%, 70%)" },
		],
	},
	{
		name: "Ready",
		total: 45,
		change: 6,
		segments: [{ name: "Active", value: 45, color: "hsl(45, 85%, 55%)" }],
	},
];

interface CohortRow {
	cohort: string;
	size: number;
	// Percentage compliant at each day (0 = just started, 100 = all compliant)
	days: (number | null)[];
}

// Data now shows % COMPLIANT (0% = just started, increasing to 100% = fully compliant)
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

// Get cell background color based on percentage compliant
// Higher % = more compliant = more saturated color
function getCellColor(value: number | null, isMean: boolean, isDay0: boolean): string {
	if (value === null) return "transparent";

	// Day 0 is always 0% - use faded/muted style
	if (isDay0) {
		return isMean ? "hsl(270, 30%, 92%)" : "hsl(210, 30%, 92%)";
	}

	// Mean row uses vibrant purple (similar to DBS Check bar)
	if (isMean) {
		if (value >= 90) return "hsl(262, 60%, 55%)";
		if (value >= 70) return "hsl(262, 55%, 60%)";
		if (value >= 50) return "hsl(262, 50%, 65%)";
		if (value >= 30) return "hsl(262, 45%, 70%)";
		return "hsl(262, 40%, 75%)";
	}

	// Regular rows use vibrant blue (similar to Applied bar)
	if (value >= 90) return "hsl(210, 90%, 55%)";
	if (value >= 70) return "hsl(210, 85%, 60%)";
	if (value >= 50) return "hsl(210, 80%, 65%)";
	if (value >= 30) return "hsl(210, 70%, 70%)";
	return "hsl(210, 60%, 75%)";
}

function getTextColor(value: number | null, isDay0: boolean): string {
	if (value === null) return "hsl(var(--muted-foreground))";
	// Day 0 column uses dark/muted text
	if (isDay0) return "hsl(var(--muted-foreground))";
	// All other cells use white text
	return "white";
}

export default function ReportsPage() {
	const maxTotal = Math.max(...pipelineStages.map((s) => s.total));

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold">Reports</h1>
				<p className="text-muted-foreground">
					Analytics and compliance reporting dashboard
				</p>
			</div>

			{/* Pipeline Overview */}
			<Card>
				<CardHeader>
					<CardTitle>Pipeline Overview</CardTitle>
				</CardHeader>
				<CardContent>
					{/* Metric cards row */}
					<div className="grid grid-cols-6 gap-4 mb-6">
						{pipelineStages.map((stage) => (
							<div key={stage.name} className="space-y-1">
								<p className="text-sm text-muted-foreground">{stage.name}</p>
								<p className="text-2xl font-semibold">{stage.total}</p>
								<p className="text-sm text-green-600 flex items-center gap-0.5">
									{stage.change}% <ArrowUp className="h-3 w-3" />
								</p>
							</div>
						))}
					</div>

					{/* Stacked vertical bars */}
					<div className="grid grid-cols-6 gap-4 h-[280px]">
						{pipelineStages.map((stage) => {
							const heightPercent = (stage.total / maxTotal) * 100;
							return (
								<div
									key={stage.name}
									className="flex flex-col justify-end items-center"
								>
									<div
										className="w-full rounded-t-lg overflow-hidden flex flex-col-reverse"
										style={{ height: `${heightPercent}%` }}
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
													<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border rounded shadow-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
														<p className="font-medium">{segment.name}</p>
														<p className="text-muted-foreground">
															{segment.value} candidates
														</p>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>

			{/* Cohort Analysis Table */}
			<Card>
				<CardHeader>
					<CardTitle>Cohort Analysis: Time to Compliance</CardTitle>
					<CardDescription>
						Percentage of candidates who have achieved compliance at each day
						since starting. Higher is better - shows speed of compliance
						completion.
					</CardDescription>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b">
								<th className="text-left py-3 pr-4 font-medium">Cohort</th>
								<th className="text-center py-3 px-2 font-medium w-16">Size</th>
								{dayColumns.map((day) => (
									<th
										key={day}
										className="text-center py-3 px-1 font-medium min-w-[70px]"
									>
										{day}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{cohortData.map((row, rowIdx) => {
								const isMean = row.cohort === "Mean";
								return (
									<tr
										key={row.cohort}
										className={cn(
											"border-b last:border-b-0",
											isMean && "font-medium"
										)}
									>
										<td className="py-3 pr-4">
											{isMean ? (
												<span className="flex items-center gap-1">
													<span className="text-muted-foreground">↳</span>{" "}
													{row.cohort}
												</span>
											) : (
												row.cohort
											)}
										</td>
										<td className="text-center py-3 px-2 text-muted-foreground">
											{row.size}
										</td>
										{row.days.map((value, dayIdx) => {
											const isDay0 = dayIdx === 0;
											return (
												<td key={dayIdx} className="py-2 px-1">
													<div
														className={cn(
															"rounded px-2 py-1.5 text-center text-xs font-medium transition-colors",
															value === null && "border border-dashed"
														)}
														style={{
															backgroundColor: getCellColor(value, isMean, isDay0),
															color: getTextColor(value, isDay0),
														}}
													>
														{value !== null ? `${value.toFixed(1)}%` : "—"}
													</div>
												</td>
											);
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</CardContent>
			</Card>
		</div>
	);
}
