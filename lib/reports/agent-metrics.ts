import "server-only";

import { and, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import type { AgentStep } from "@/lib/ai/agents/types";
import { db } from "@/lib/db";
import {
	activities,
	agentExecutions,
	organisations,
	tasks,
} from "@/lib/db/schema";
import type { AgentMetricsResponse } from "./types";
import { buildValueEstimate } from "./value-estimate";

const ACTION_TOOL_NAMES = new Set([
	"createTask",
	"sendSms",
	"draftEmail",
	"faInitiateScreening",
	"createEscalation",
	"updateLocalProfile",
	"uploadDocumentEvidence",
	"verifyDocumentEvidence",
]);

const DAY_MS = 24 * 60 * 60 * 1000;

type RunStatus = "running" | "completed" | "failed" | "escalated";
type TriggerType = "manual" | "schedule" | "event";

type ToolCall = {
	toolName: string;
	toolOutput: unknown;
};

function round(value: number, decimals = 1): number {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}

function percent(numerator: number, denominator: number): number {
	if (denominator <= 0) return 0;
	return round((numerator / denominator) * 100, 1);
}

function percentile(values: number[], p: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const rank = Math.ceil((p / 100) * sorted.length) - 1;
	const index = Math.max(0, Math.min(sorted.length - 1, rank));
	return sorted[index];
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return null;
}

function asString(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function extractToolCalls(rawSteps: unknown): ToolCall[] {
	if (!Array.isArray(rawSteps)) return [];

	const calls: ToolCall[] = [];
	for (const rawStep of rawSteps) {
		const step = asRecord(rawStep);
		if (!step) continue;
		if (step.type !== "tool-call") continue;

		const toolName = asString(step.toolName);
		if (!toolName) continue;

		calls.push({
			toolName,
			toolOutput: step.toolOutput,
		});
	}

	return calls;
}

function isFailedSmsToolOutput(toolOutput: unknown): boolean {
	const output = asRecord(toolOutput);
	if (!output) return false;

	const outputError = asString(output.error);
	if (outputError && outputError.trim().length > 0) {
		return true;
	}

	const data = asRecord(output.data);
	const dataStatus = asString(data?.status)?.toLowerCase();
	if (dataStatus === "failed") {
		return true;
	}

	return false;
}

function getWindowLabel({
	from,
	to,
	label,
}: {
	from: Date;
	to: Date;
	label: string;
}): string {
	const fromDate = from.toISOString().slice(0, 10);
	const toDate = to.toISOString().slice(0, 10);
	return `${label} (${fromDate} to ${toDate})`;
}

export async function getAgentMetrics({
	organisationId,
	from,
	to,
	label,
}: {
	organisationId: string;
	from: Date;
	to: Date;
	label: string;
}): Promise<AgentMetricsResponse> {
	const [orgRows, runRows, communicationRows, taskRows] = await Promise.all([
		db
			.select({ name: organisations.name })
			.from(organisations)
			.where(eq(organisations.id, organisationId))
			.limit(1),
		db
			.select({
				status: agentExecutions.status,
				triggerType: agentExecutions.triggerType,
				durationMs: agentExecutions.durationMs,
				steps: agentExecutions.steps,
			})
			.from(agentExecutions)
			.where(
				and(
					gte(agentExecutions.createdAt, from),
					lt(agentExecutions.createdAt, to),
					or(
						eq(agentExecutions.orgId, organisationId),
						and(
							isNull(agentExecutions.orgId),
							eq(
								sql<string>`${agentExecutions.input} ->> 'organisationId'`,
								organisationId,
							),
						),
					),
				),
			),
		db
			.select({
				channel: activities.channel,
				summary: activities.summary,
				details: activities.details,
			})
			.from(activities)
			.where(
				and(
					eq(activities.organisationId, organisationId),
					eq(activities.actor, "ai"),
					eq(activities.activityType, "message_sent"),
					gte(activities.createdAt, from),
					lt(activities.createdAt, to),
					or(eq(activities.channel, "email"), eq(activities.channel, "sms")),
				),
			),
		db
			.select({
				status: tasks.status,
				createdAt: tasks.createdAt,
			})
			.from(tasks)
			.where(
				and(
					eq(tasks.organisationId, organisationId),
					eq(tasks.source, "ai_agent"),
					gte(tasks.createdAt, from),
					lt(tasks.createdAt, to),
				),
			),
	]);

	const orgName = orgRows[0]?.name;

	const runCounts: Record<RunStatus, number> = {
		running: 0,
		completed: 0,
		failed: 0,
		escalated: 0,
	};

	const triggerCounts: Record<TriggerType, number> = {
		manual: 0,
		schedule: 0,
		event: 0,
	};

	const durations: number[] = [];
	const toolUsage = new Map<string, number>();
	let toolCallsTotal = 0;
	let automationActionRuns = 0;
	let runsWithFailedSms = 0;
	let runsWithSmsFallback = 0;

	for (const run of runRows) {
		const status = run.status as RunStatus;
		const triggerType = run.triggerType as TriggerType;

		if (runCounts[status] !== undefined) {
			runCounts[status] += 1;
		}
		if (triggerCounts[triggerType] !== undefined) {
			triggerCounts[triggerType] += 1;
		}

		if (status !== "running" && typeof run.durationMs === "number") {
			durations.push(run.durationMs);
		}

		const toolCalls = extractToolCalls(run.steps as AgentStep[] | null);
		toolCallsTotal += toolCalls.length;

		let hasAutomationAction = false;
		let hasFailedSms = false;
		let hasSmsFallback = false;
		let failedSmsSeen = false;

		for (const call of toolCalls) {
			toolUsage.set(call.toolName, (toolUsage.get(call.toolName) ?? 0) + 1);

			if (ACTION_TOOL_NAMES.has(call.toolName)) {
				hasAutomationAction = true;
			}

			if (
				call.toolName === "sendSms" &&
				isFailedSmsToolOutput(call.toolOutput)
			) {
				hasFailedSms = true;
				failedSmsSeen = true;
				continue;
			}

			if (failedSmsSeen && call.toolName === "draftEmail") {
				hasSmsFallback = true;
				break;
			}
		}

		if (hasAutomationAction) {
			automationActionRuns += 1;
		}
		if (hasFailedSms) {
			runsWithFailedSms += 1;
		}
		if (hasSmsFallback) {
			runsWithSmsFallback += 1;
		}
	}

	const topTools = [...toolUsage.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8)
		.map(([toolName, count]) => ({ toolName, count }));

	let emailDrafted = 0;
	let smsSent = 0;
	let smsFailed = 0;

	for (const row of communicationRows) {
		const details = asRecord(row.details);
		const status = asString(details?.status)?.toLowerCase();
		const summary = (row.summary ?? "").toLowerCase();

		if (row.channel === "email") {
			if (
				status === "drafted" ||
				status === "preview" ||
				summary.includes("draft") ||
				summary.includes("preview")
			) {
				emailDrafted += 1;
			}
			continue;
		}

		if (row.channel === "sms") {
			if (status === "failed" || summary.includes("failed")) {
				smsFailed += 1;
			} else {
				smsSent += 1;
			}
		}
	}

	const aiCreated = taskRows.length;
	const aiCompleted = taskRows.filter(
		(row) => row.status === "completed",
	).length;
	const openRows = taskRows.filter(
		(row) =>
			row.status === "pending" ||
			row.status === "in_progress" ||
			row.status === "snoozed",
	);

	const now = Date.now();
	const avgOpenDays =
		openRows.length > 0
			? round(
					openRows.reduce((sum, row) => {
						return sum + (now - row.createdAt.getTime()) / DAY_MS;
					}, 0) / openRows.length,
					1,
				)
			: null;

	const endedRuns =
		runCounts.completed + runCounts.failed + runCounts.escalated;
	const totalRuns = runRows.length;

	return {
		window: {
			from: from.toISOString(),
			to: to.toISOString(),
			label: getWindowLabel({ from, to, label }),
		},
		runs: {
			total: totalRuns,
			byStatus: runCounts,
			successRate: percent(runCounts.completed, endedRuns),
			byTriggerType: triggerCounts,
			durationMs: {
				avg:
					durations.length > 0
						? Math.round(
								durations.reduce((sum, value) => sum + value, 0) /
									durations.length,
							)
						: 0,
				p50: percentile(durations, 50),
				p95: percentile(durations, 95),
			},
		},
		tools: {
			totalCalls: toolCallsTotal,
			avgCallsPerRun: totalRuns > 0 ? round(toolCallsTotal / totalRuns, 2) : 0,
			topTools,
			automationActionRuns,
			automationActionRate: percent(automationActionRuns, totalRuns),
			smsToEmailFallbackRate: percent(runsWithSmsFallback, runsWithFailedSms),
		},
		communications: {
			emailDrafted,
			smsSent,
			smsFailed,
		},
		tasks: {
			aiCreated,
			aiCompleted,
			completionRate: percent(aiCompleted, aiCreated),
			openCount: openRows.length,
			avgOpenDays,
		},
		valueEstimate: buildValueEstimate({
			completedRuns: runCounts.completed,
			orgName,
		}),
	};
}
