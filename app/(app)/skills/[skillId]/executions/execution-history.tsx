"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	ArrowLeft,
	CheckCircle2,
	Clock,
	Play,
	Wrench,
	XCircle,
	Zap,
} from "lucide-react";
import type { SkillDefinition } from "@/lib/ai/skills/types";

interface Execution {
	id: string;
	status: string;
	createdAt: Date;
	durationMs: number | null;
	tokensUsed: unknown;
	steps: unknown;
	input: unknown;
}

interface ExecutionHistoryProps {
	skill: SkillDefinition;
	executions: Execution[];
}

function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(date));
}

export function ExecutionHistory({
	skill,
	executions,
}: ExecutionHistoryProps) {
	return (
		<>
			<div className="flex items-center gap-2">
				<Button variant="ghost" size="sm" asChild>
					<Link href={`/skills/${skill.id}`}>
						<ArrowLeft className="size-3 mr-1" />
						{skill.name}
					</Link>
				</Button>
			</div>

			<div>
				<h1 className="text-lg font-semibold">Execution History</h1>
				<p className="text-sm text-muted-foreground">
					{executions.length} execution{executions.length !== 1 ? "s" : ""}
				</p>
			</div>

			{executions.length === 0 ? (
				<Card>
					<CardContent className="pt-6 pb-6 text-center">
						<p className="text-sm text-muted-foreground mb-3">
							No executions yet.
						</p>
						<Button size="sm" asChild>
							<Link href={`/skills/${skill.id}`}>
								<Play className="size-3 mr-1" />
								Run Skill
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="flex flex-col gap-2">
					{executions.map((exec) => {
						const tokens = exec.tokensUsed as {
							totalTokens?: number;
						} | null;
						const steps = exec.steps as Array<{ type: string }> | null;
						const toolSteps =
							steps?.filter((s) => s.type === "tool-call").length || 0;

						return (
							<Card key={exec.id}>
								<CardContent className="pt-3 pb-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											{exec.status === "completed" ? (
												<CheckCircle2 className="size-4 text-green-600" />
											) : exec.status === "failed" ? (
												<XCircle className="size-4 text-red-600" />
											) : (
												<Clock className="size-4 text-muted-foreground" />
											)}
											<div className="flex flex-col">
												<span className="text-sm font-medium">
													{formatDate(exec.createdAt)}
												</span>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													{exec.durationMs && (
														<span className="flex items-center gap-1">
															<Clock className="size-2.5" />
															{(exec.durationMs / 1000).toFixed(1)}s
														</span>
													)}
													{toolSteps > 0 && (
														<span className="flex items-center gap-1">
															<Wrench className="size-2.5" />
															{toolSteps}
														</span>
													)}
													{tokens?.totalTokens && (
														<span className="flex items-center gap-1">
															<Zap className="size-2.5" />
															{tokens.totalTokens.toLocaleString()}
														</span>
													)}
												</div>
											</div>
										</div>
										<Badge
											variant={
												exec.status === "completed"
													? "default"
													: exec.status === "failed"
														? "destructive"
														: "secondary"
											}
											className={
												exec.status === "completed"
													? "bg-green-600 hover:bg-green-700"
													: ""
											}
										>
											{exec.status}
										</Badge>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</>
	);
}
