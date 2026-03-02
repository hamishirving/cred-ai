"use client";

import { BarChart3 } from "lucide-react";
import type { AgentStep } from "@/lib/ai/agents/types";
import { GapAnalysisDisplay } from "./gap-analysis-display";
import { ScreeningStatusDisplay } from "./screening-status-display";
import { EscalationDisplay } from "./escalation-display";

interface StructuredOutputStepCardProps {
	step: AgentStep;
}

function isGapAnalysis(data: unknown): boolean {
	if (!data || typeof data !== "object") return false;
	const d = data as Record<string, unknown>;
	return "groups" in d && "overall" in d && "candidateName" in d;
}

function isScreeningStatus(data: unknown): boolean {
	if (!data || typeof data !== "object") return false;
	const d = data as Record<string, unknown>;
	return "screeningId" in d && "reportItems" in d && "overallStatus" in d;
}

function hasEscalation(data: unknown): data is { escalation: { escalationId: string; type: string; priority: string; question: string; aiReasoning: string; aiRecommendation: string; options: { id: string; label: string; description: string; isRecommended: boolean }[] } } {
	if (!data || typeof data !== "object") return false;
	const d = data as Record<string, unknown>;
	if (!d.escalation || typeof d.escalation !== "object") return false;
	const e = d.escalation as Record<string, unknown>;
	return "escalationId" in e && "options" in e;
}

export function StructuredOutputStepCard({ step }: StructuredOutputStepCardProps) {
	if (step.type !== "structured-output" || !step.structuredOutput) return null;

	if (isGapAnalysis(step.structuredOutput)) {
		return <GapAnalysisDisplay data={step.structuredOutput} />;
	}

	if (isScreeningStatus(step.structuredOutput)) {
		return (
			<>
				<ScreeningStatusDisplay data={step.structuredOutput} />
				{hasEscalation(step.structuredOutput) && (
					<EscalationDisplay data={step.structuredOutput.escalation} />
				)}
			</>
		);
	}

	// Fallback: render as formatted JSON
	return (
		<div className="rounded-lg border bg-card p-3">
			<div className="flex items-center gap-2 mb-2">
				<div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
					<BarChart3 className="size-3 text-muted-foreground" />
				</div>
				<span className="text-xs font-medium">Structured Output</span>
			</div>
			<pre className="text-xs text-muted-foreground overflow-x-auto">
				{JSON.stringify(step.structuredOutput, null, 2)}
			</pre>
		</div>
	);
}
