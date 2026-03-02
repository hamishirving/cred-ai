"use client";

import {
	Activity,
	Bot,
	RefreshCcw,
	ShieldAlert,
	Timer,
	Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrg } from "@/lib/org-context";
import type {
	AgentMetricsRange,
	AgentMetricsResponse,
} from "@/lib/reports/types";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS: Array<{ value: AgentMetricsRange; label: string }> = [
	{ value: "7d", label: "7D" },
	{ value: "30d", label: "30D" },
	{ value: "90d", label: "90D" },
];
const CARD_SKELETON_IDS = [
	"skeleton-run",
	"skeleton-success",
	"skeleton-automation",
	"skeleton-hours",
];
const PANEL_SKELETON_IDS = [
	"skeleton-reliability",
	"skeleton-tools",
	"skeleton-outcomes",
];

function formatPercent(value: number): string {
	return `${value.toFixed(1)}%`;
}

function formatDuration(valueMs: number): string {
	if (valueMs <= 0) return "0s";
	if (valueMs < 1000) return `${valueMs}ms`;
	if (valueMs < 60_000) return `${(valueMs / 1000).toFixed(1)}s`;
	return `${(valueMs / 60_000).toFixed(1)}m`;
}

function toRatioPercent(count: number, total: number): number {
	if (total <= 0) return 0;
	return (count / total) * 100;
}

function isAgentMetricsResponse(data: unknown): data is AgentMetricsResponse {
	if (!data || typeof data !== "object") return false;
	const record = data as Record<string, unknown>;
	return (
		typeof record.window === "object" &&
		typeof record.runs === "object" &&
		typeof record.tools === "object" &&
		typeof record.communications === "object" &&
		typeof record.tasks === "object" &&
		typeof record.valueEstimate === "object"
	);
}

function LoadingState() {
	return (
		<div className="space-y-4">
			<div className="grid gap-4 md:grid-cols-4">
				{CARD_SKELETON_IDS.map((id) => (
					<Card key={id} className="shadow-none! bg-card">
						<CardContent className="p-4">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="mt-2 h-7 w-24" />
						</CardContent>
					</Card>
				))}
			</div>
			<div className="grid gap-4 lg:grid-cols-3">
				{PANEL_SKELETON_IDS.map((id) => (
					<Card key={id} className="shadow-none! bg-card">
						<CardHeader>
							<Skeleton className="h-5 w-40" />
						</CardHeader>
						<CardContent className="space-y-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
							<Skeleton className="h-4 w-4/6" />
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

export function AgentActivityReport() {
	const { selectedOrg, loading: orgLoading } = useOrg();
	const [range, setRange] = useState<AgentMetricsRange>("30d");
	const [metrics, setMetrics] = useState<AgentMetricsResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const organisationId = selectedOrg?.id;

	const loadMetrics = useCallback(async () => {
		if (!organisationId) {
			setMetrics(null);
			setError(null);
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams({
				organisationId,
				range,
			});
			const response = await fetch(
				`/api/reports/agent-metrics?${params.toString()}`,
			);
			const payload = await response.json().catch(() => null);

			if (!response.ok) {
				const errorPayload =
					payload && typeof payload === "object"
						? (payload as { error?: string })
						: null;
				throw new Error(errorPayload?.error || "Failed to load metrics");
			}

			if (!isAgentMetricsResponse(payload)) {
				throw new Error("Invalid agent metrics response shape");
			}

			setMetrics(payload);
		} catch (fetchError) {
			setError(
				fetchError instanceof Error
					? fetchError.message
					: "Failed to load metrics",
			);
			setMetrics(null);
		} finally {
			setLoading(false);
		}
	}, [organisationId, range]);

	useEffect(() => {
		if (orgLoading) return;
		void loadMetrics();
	}, [loadMetrics, orgLoading]);

	const hasNoRuns = useMemo(() => metrics?.runs.total === 0, [metrics]);
	const topTools = useMemo(() => {
		if (!metrics) return [];
		return metrics.tools.topTools.slice(0, 5);
	}, [metrics]);
	const topToolMax = useMemo(
		() => Math.max(1, ...topTools.map((tool) => tool.count)),
		[topTools],
	);
	const triggerTotal = useMemo(() => {
		if (!metrics) return 0;
		const byTrigger = metrics.runs.byTriggerType;
		return byTrigger.manual + byTrigger.schedule + byTrigger.event;
	}, [metrics]);

	if (orgLoading) {
		return <LoadingState />;
	}

	if (!organisationId) {
		return (
			<Card className="shadow-none! bg-card">
				<CardContent className="p-6 text-sm text-muted-foreground">
					Select an organisation to view agent activity metrics.
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="text-sm text-muted-foreground">{selectedOrg?.name}</p>
					<p className="text-xs text-muted-foreground">
						{metrics?.window.label ?? "Loading metrics\u2026"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1 rounded-md border border-border p-1.5">
						{RANGE_OPTIONS.map((option) => {
							const isSelected = option.value === range;
							return (
								<Button
									key={option.value}
									variant={isSelected ? "default" : "ghost"}
									size="sm"
									className={cn(
										"h-8 px-3 text-sm",
										!isSelected && "text-muted-foreground",
									)}
									onClick={() => setRange(option.value)}
								>
									{option.label}
								</Button>
							);
						})}
					</div>
					<Button
						variant="outline"
						size="sm"
						className="h-9 px-3"
						onClick={() => void loadMetrics()}
					>
						<RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
						Refresh
					</Button>
				</div>
			</div>

			{loading && <LoadingState />}

			{!loading && error && (
				<Card className="shadow-none! bg-card border-destructive/30">
					<CardContent className="flex items-center justify-between gap-3 p-4">
						<p className="text-sm text-destructive">{error}</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => void loadMetrics()}
						>
							Retry
						</Button>
					</CardContent>
				</Card>
			)}

			{!loading && !error && metrics && (
				<>
					{hasNoRuns && (
						<Card className="shadow-none! bg-card">
							<CardContent className="p-4 text-sm text-muted-foreground">
								No agent runs in the selected period. Metrics are shown as zero.
							</CardContent>
						</Card>
					)}

					<div className="grid gap-4 lg:grid-cols-12">
						<Card className="shadow-none! bg-card lg:col-span-4">
							<CardContent className="p-4">
								<div className="flex items-start justify-between gap-2">
									<div>
										<p className="text-xs text-muted-foreground">Primary KPI</p>
										<p className="mt-1 text-sm font-medium text-foreground">
											Estimated Value Created
										</p>
									</div>
									<Badge variant="info" className="text-[10px] uppercase">
										Heuristic
									</Badge>
								</div>
								<p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
									{metrics.valueEstimate.currencySymbol}
									{metrics.valueEstimate.moneySaved.toLocaleString()}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{metrics.valueEstimate.hoursSaved} hours saved
								</p>
							</CardContent>
						</Card>
						<div className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
							<Card className="shadow-none! bg-card border-l-4 border-l-primary">
								<CardContent className="p-4">
									<p className="text-xs text-muted-foreground">Total Runs</p>
									<p className="mt-1 text-2xl font-semibold tabular-nums">
										{metrics.runs.total}
									</p>
								</CardContent>
							</Card>
							<Card className="shadow-none! bg-card border-l-4 border-l-[var(--positive)]">
								<CardContent className="p-4">
									<p className="text-xs text-muted-foreground">Success Rate</p>
									<p className="mt-1 text-2xl font-semibold tabular-nums">
										{formatPercent(metrics.runs.successRate)}
									</p>
								</CardContent>
							</Card>
							<Card className="shadow-none! bg-card border-l-4 border-l-[var(--warning)]">
								<CardContent className="p-4">
									<p className="text-xs text-muted-foreground">
										Automation Action Rate
									</p>
									<p className="mt-1 text-2xl font-semibold tabular-nums">
										{formatPercent(metrics.tools.automationActionRate)}
									</p>
								</CardContent>
							</Card>
						</div>
					</div>

					<div className="grid gap-4 lg:grid-cols-3">
						<Card className="shadow-none! bg-card">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-base">
									<ShieldAlert className="h-4 w-4 text-muted-foreground" />
									Reliability
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 text-sm">
								<div className="grid grid-cols-2 gap-2">
									<div className="flex items-center justify-between rounded border border-border bg-muted/30 px-2.5 py-2">
										<span className="text-muted-foreground">Running</span>
										<span className="tabular-nums font-medium">
											{metrics.runs.byStatus.running}
										</span>
									</div>
									<div className="flex items-center justify-between rounded border border-[var(--positive)]/30 bg-[var(--positive-bg)] px-2.5 py-2 text-[var(--positive)]">
										<span>Completed</span>
										<span className="tabular-nums font-medium">
											{metrics.runs.byStatus.completed}
										</span>
									</div>
									<div className="flex items-center justify-between rounded border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-destructive">
										<span>Failed</span>
										<span className="tabular-nums font-medium">
											{metrics.runs.byStatus.failed}
										</span>
									</div>
									<div className="flex items-center justify-between rounded border border-[var(--warning)]/30 bg-[var(--warning-bg)] px-2.5 py-2 text-[var(--warning)]">
										<span>Escalated</span>
										<span className="tabular-nums font-medium">
											{metrics.runs.byStatus.escalated}
										</span>
									</div>
								</div>
								<div className="space-y-1 text-muted-foreground">
									<p className="flex items-center justify-between">
										<span>Avg duration</span>
										<span className="tabular-nums text-foreground">
											{formatDuration(metrics.runs.durationMs.avg)}
										</span>
									</p>
									<p className="flex items-center justify-between">
										<span>Median (p50)</span>
										<span className="tabular-nums text-foreground">
											{formatDuration(metrics.runs.durationMs.p50)}
										</span>
									</p>
									<p className="flex items-center justify-between">
										<span>95th percentile</span>
										<span className="tabular-nums text-foreground">
											{formatDuration(metrics.runs.durationMs.p95)}
										</span>
									</p>
								</div>
							</CardContent>
						</Card>

						<Card className="shadow-none! bg-card">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-base">
									<Wrench className="h-4 w-4 text-muted-foreground" />
									Automation & Tools
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 text-sm">
								<p className="flex items-center justify-between">
									<span className="text-muted-foreground">Tool calls</span>
									<span className="tabular-nums">
										{metrics.tools.totalCalls}
									</span>
								</p>
								<p className="flex items-center justify-between">
									<span className="text-muted-foreground">Calls / run</span>
									<span className="tabular-nums">
										{metrics.tools.avgCallsPerRun.toFixed(2)}
									</span>
								</p>
								<p className="flex items-center justify-between">
									<span className="text-muted-foreground">
										SMS fallback rate
									</span>
									<span className="tabular-nums">
										{formatPercent(metrics.tools.smsToEmailFallbackRate)}
									</span>
								</p>
								<div className="space-y-2 pt-1">
									<p className="text-xs font-medium text-muted-foreground">
										Top tools
									</p>
									{topTools.length > 0 ? (
										<div className="space-y-2">
											{topTools.map((tool) => {
												const width = Math.max(
													8,
													Math.round((tool.count / topToolMax) * 100),
												);
												return (
													<div key={tool.toolName} className="space-y-1">
														<p className="flex items-center justify-between gap-2 text-xs">
															<span
																className="max-w-[72%] truncate text-muted-foreground"
																title={tool.toolName}
															>
																{tool.toolName}
															</span>
															<span className="tabular-nums text-foreground">
																{tool.count}
															</span>
														</p>
														<div className="h-1.5 overflow-hidden rounded-full bg-muted">
															<div
																className="h-full rounded-full bg-primary/70"
																style={{ width: `${width}%` }}
															/>
														</div>
													</div>
												);
											})}
										</div>
									) : (
										<span className="text-xs text-muted-foreground">
											No tool calls recorded
										</span>
									)}
								</div>
							</CardContent>
						</Card>

						<Card className="shadow-none! bg-card">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-base">
									<Activity className="h-4 w-4 text-muted-foreground" />
									Outcomes & Value
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 text-sm">
								<div className="space-y-1">
									<p className="text-xs font-medium text-muted-foreground">
										Communications
									</p>
									<p className="flex items-center justify-between">
										<span>Email drafted</span>
										<span className="tabular-nums">
											{metrics.communications.emailDrafted}
										</span>
									</p>
									<p className="flex items-center justify-between">
										<span>SMS sent</span>
										<span className="tabular-nums">
											{metrics.communications.smsSent}
										</span>
									</p>
									<p className="flex items-center justify-between">
										<span>SMS failed</span>
										<span className="tabular-nums">
											{metrics.communications.smsFailed}
										</span>
									</p>
								</div>
								<div className="space-y-1">
									<p className="text-xs font-medium text-muted-foreground">
										AI tasks
									</p>
									<p className="flex items-center justify-between">
										<span>Created</span>
										<span className="tabular-nums">
											{metrics.tasks.aiCreated}
										</span>
									</p>
									<p className="flex items-center justify-between">
										<span>Completion rate</span>
										<span className="tabular-nums">
											{formatPercent(metrics.tasks.completionRate)}
										</span>
									</p>
									<p className="flex items-center justify-between">
										<span>Avg open days</span>
										<span className="tabular-nums">
											{metrics.tasks.avgOpenDays ?? "-"}
										</span>
									</p>
								</div>
								<div className="rounded border border-border bg-muted/30 p-2.5">
									<p className="flex items-center justify-between">
										<span className="text-muted-foreground">
											Estimated value
										</span>
										<span className="tabular-nums font-medium">
											{metrics.valueEstimate.currencySymbol}
											{metrics.valueEstimate.moneySaved.toLocaleString()}
										</span>
									</p>
									<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
										<Timer className="h-3 w-3 flex-shrink-0" />
										{metrics.valueEstimate.hoursSaved} hours saved (heuristic)
									</p>
								</div>
							</CardContent>
						</Card>
					</div>

					<Card className="shadow-none! bg-card">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-base">
								<Bot className="h-4 w-4 text-muted-foreground" />
								Trigger Mix
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
								<div
									className="bg-primary"
									style={{
										width: `${toRatioPercent(metrics.runs.byTriggerType.manual, triggerTotal)}%`,
									}}
								/>
								<div
									className="bg-chart-3"
									style={{
										width: `${toRatioPercent(metrics.runs.byTriggerType.schedule, triggerTotal)}%`,
									}}
								/>
								<div
									className="bg-chart-2"
									style={{
										width: `${toRatioPercent(metrics.runs.byTriggerType.event, triggerTotal)}%`,
									}}
								/>
							</div>
							<div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
								<p className="flex items-center justify-between rounded border bg-muted/20 px-2 py-1.5">
									<span className="flex items-center gap-1">
										<span className="h-2 w-2 rounded-full bg-primary" />
										Manual
									</span>
									<span className="tabular-nums">
										{metrics.runs.byTriggerType.manual} (
										{Math.round(
											toRatioPercent(
												metrics.runs.byTriggerType.manual,
												triggerTotal,
											),
										)}
										%)
									</span>
								</p>
								<p className="flex items-center justify-between rounded border bg-muted/20 px-2 py-1.5">
									<span className="flex items-center gap-1">
										<span className="h-2 w-2 rounded-full bg-chart-3" />
										Schedule
									</span>
									<span className="tabular-nums">
										{metrics.runs.byTriggerType.schedule} (
										{Math.round(
											toRatioPercent(
												metrics.runs.byTriggerType.schedule,
												triggerTotal,
											),
										)}
										%)
									</span>
								</p>
								<p className="flex items-center justify-between rounded border bg-muted/20 px-2 py-1.5">
									<span className="flex items-center gap-1">
										<span className="h-2 w-2 rounded-full bg-chart-2" />
										Event
									</span>
									<span className="tabular-nums">
										{metrics.runs.byTriggerType.event} (
										{Math.round(
											toRatioPercent(
												metrics.runs.byTriggerType.event,
												triggerTotal,
											),
										)}
										%)
									</span>
								</p>
							</div>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
