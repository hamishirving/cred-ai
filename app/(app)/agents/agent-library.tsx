"use client";

import { useState, useEffect, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
	Bot,
	Play,
	Clock,
	DollarSign,
	PoundSterling,
	Timer,
	Activity,
	Check,
	X,
	AlertTriangle,
	Loader2,
	Pencil,
	ChevronRight,
	Wrench,
	Shield,
	Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const statusConfig = {
	running: { label: "Running", icon: Loader2, color: "text-blue-600", iconClass: "animate-spin" },
	completed: { label: "Completed", icon: Check, color: "text-green-600", iconClass: "" },
	failed: { label: "Failed", icon: X, color: "text-red-600", iconClass: "" },
	escalated: { label: "Escalated", icon: AlertTriangle, color: "text-amber-600", iconClass: "" },
};

/** Estimate hours saved per successful run (mock: 1.5h average) */
const HOURS_PER_RUN = 1.5;
/** Estimated hourly cost of manual compliance work */
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

export function AgentLibrary({ agents }: { agents: SerializedAgentDefinition[] }) {
	const { selectedOrg } = useOrg();
	const [executions, setExecutions] = useState<AgentExecution[]>([]);
	const [loadingExecs, setLoadingExecs] = useState(true);

	// Fetch recent executions across all agents
	useEffect(() => {
		async function fetchExecutions() {
			setLoadingExecs(true);
			try {
				// Fetch executions for all agents
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
				// Sort by most recent first
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

		return {
			totalAgents: agents.length,
			totalRuns,
			hoursSaved,
			moneySaved,
		};
	}, [executions, agents.length, currency.rate]);

	const agentNameMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const a of agents) map[a.id] = a.name;
		return map;
	}, [agents]);

	return (
		<div className="flex flex-col gap-4">
			{/* Stats */}
			<div className="grid gap-3 md:grid-cols-4">
				<Card className="border-l-4 border-l-blue-500">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">Active Agents</p>
								<p className="text-xl font-bold">{stats.totalAgents}</p>
							</div>
							<Bot className="h-6 w-6 text-blue-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-purple-500">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">Total Runs</p>
								<p className="text-xl font-bold">{stats.totalRuns}</p>
							</div>
							<Activity className="h-6 w-6 text-purple-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-amber-500">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">Hours Saved</p>
								<p className="text-xl font-bold">{stats.hoursSaved}</p>
							</div>
							<Timer className="h-6 w-6 text-amber-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-green-500">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">Money Saved</p>
								<p className="text-xl font-bold">
									{currency.symbol}{stats.moneySaved.toLocaleString()}
								</p>
							</div>
							{currency.symbol === "$" ? (
								<DollarSign className="h-6 w-6 text-green-500 opacity-50" />
							) : (
								<PoundSterling className="h-6 w-6 text-green-500 opacity-50" />
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Split layout: Agents table + Runs table */}
			<div className="grid gap-4 lg:grid-cols-2">
				{/* Agents table */}
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium flex items-center gap-2">
								<Bot className="h-4 w-4" />
								Agents
							</CardTitle>
							<Badge variant="secondary" className="text-xs">
								{agents.length}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="w-[80px]">Trigger</TableHead>
									<TableHead className="w-[80px]">Tools</TableHead>
									<TableHead className="w-[100px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{agents.length > 0 ? (
									agents.map((agent) => (
										<TableRow key={agent.id}>
											<TableCell>
												<div className="min-w-0">
													<div className="font-medium text-sm truncate">
														{agent.name}
													</div>
													<div className="text-xs text-muted-foreground truncate max-w-[200px]">
														{agent.description}
													</div>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline" className="text-xs gap-1">
													<Zap className="size-2.5" />
													{agent.trigger.type}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge variant="outline" className="text-xs gap-1">
													<Wrench className="size-2.5" />
													{agent.tools.length}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1 justify-end">
													<Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
														<Link href={`/agents/${agent.id}/edit`}>
															<Pencil className="size-3" />
														</Link>
													</Button>
													<Button size="sm" className="h-7" asChild>
														<Link href={`/agents/${agent.id}`}>
															<Play className="size-3 mr-1" />
															Run
														</Link>
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={4} className="h-24 text-center">
											<div className="flex flex-col items-center">
												<Bot className="h-8 w-8 text-muted-foreground mb-2" />
												<p className="text-sm text-muted-foreground">
													No agents registered
												</p>
											</div>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				{/* Recent runs table */}
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium flex items-center gap-2">
								<Activity className="h-4 w-4" />
								Recent Runs
							</CardTitle>
							<Badge variant="secondary" className="text-xs">
								{executions.length}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						{loadingExecs ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[35%]">Agent</TableHead>
										<TableHead className="w-[20%]">Status</TableHead>
										<TableHead className="w-[20%]">Duration</TableHead>
										<TableHead className="w-[25%]">When</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{executions.length > 0 ? (
										executions.slice(0, 10).map((exec) => {
											const config = statusConfig[exec.status];
											const StatusIcon = config.icon;
											return (
												<TableRow key={exec.id}>
													<TableCell>
														<Link
															href={`/agents/${exec.agentId}/executions`}
															className="text-sm font-medium hover:underline truncate block max-w-[160px]"
														>
															{agentNameMap[exec.agentId] || exec.agentId}
														</Link>
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-1.5">
															<StatusIcon
																className={cn("h-3.5 w-3.5", config.color, config.iconClass)}
															/>
															<span className={cn("text-xs", config.color)}>
																{config.label}
															</span>
														</div>
													</TableCell>
													<TableCell>
														<span className="text-xs text-muted-foreground">
															{exec.durationMs
																? `${(exec.durationMs / 1000).toFixed(1)}s`
																: "-"}
														</span>
													</TableCell>
													<TableCell>
														<span className="text-xs text-muted-foreground whitespace-nowrap">
															{formatDistanceToNow(new Date(exec.createdAt), {
																addSuffix: true,
															})}
														</span>
													</TableCell>
												</TableRow>
											);
										})
									) : (
										<TableRow>
											<TableCell colSpan={4} className="h-24 text-center">
												<div className="flex flex-col items-center">
													<Clock className="h-8 w-8 text-muted-foreground mb-2" />
													<p className="text-sm text-muted-foreground">
														No runs yet
													</p>
													<p className="text-xs text-muted-foreground">
														Run an agent to see results here
													</p>
												</div>
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
