"use client";

import { Loader2, Globe, Navigation, MousePointer, Type, Monitor, Eye } from "lucide-react";
import type { AgentStep, BrowserAction } from "@/lib/ai/agents/types";
import { ToolStepCard } from "./step-cards/tool-step-card";
import { ReasoningStepCard } from "./step-cards/reasoning-step-card";
import { BrowserStepCard } from "./step-cards/browser-step-card";
import { DecisionStepCard } from "./step-cards/decision-step-card";

interface ExecutionTimelineProps {
	steps: AgentStep[];
	status: string;
	liveViewUrl?: string | null;
	browserActions?: BrowserAction[];
}

function StepCard({
	step,
	liveViewUrl,
	browserActions,
	isLastStep,
	isRunning,
}: {
	step: AgentStep;
	liveViewUrl?: string | null;
	browserActions?: BrowserAction[];
	isLastStep: boolean;
	isRunning: boolean;
}) {
	if (step.type === "tool-call") {
		if (step.toolName === "browseAndVerify") {
			const isActive = isLastStep && isRunning;
			return (
				<BrowserStepCard
					step={step}
					liveViewUrl={liveViewUrl}
					browserActions={browserActions}
					isActive={isActive}
				/>
			);
		}
		if (step.toolName === "updateDocumentStatus") {
			return <DecisionStepCard step={step} />;
		}
		return <ToolStepCard step={step} />;
	}

	return <ReasoningStepCard step={step} />;
}

/** Format browser action for display in preview */
function formatPreviewAction(action: BrowserAction): string {
	if (action.type === "browser-ready") return "Browser session ready";
	if (action.action) {
		try {
			const parsed = JSON.parse(action.action);
			if (parsed.instruction) return parsed.instruction;
			if (parsed.action) return parsed.action;
			if (parsed.url) return `Navigate to ${new URL(parsed.url).hostname}`;
			if (parsed.text) return `Type "${parsed.text}"`;
		} catch {
			if (action.action.length < 100) return action.action;
		}
	}
	return action.type;
}

/** Icon for browser action type */
function PreviewActionIcon({ type }: { type: string }) {
	const lower = type.toLowerCase();
	if (lower === "goto" || lower === "navigate") return <Navigation className="size-3" />;
	if (lower === "click" || lower === "act") return <MousePointer className="size-3" />;
	if (lower === "type" || lower === "fillform") return <Type className="size-3" />;
	if (lower === "screenshot") return <Monitor className="size-3" />;
	if (lower === "extract" || lower === "observe") return <Eye className="size-3" />;
	return <Globe className="size-3" />;
}

/**
 * Reorder steps so text steps appear before tool-call steps
 * within the same step index. The AI SDK emits tool calls first,
 * then the text — but the text explains what's about to happen.
 */
function reorderSteps(steps: AgentStep[]): AgentStep[] {
	const result: AgentStep[] = [];
	let i = 0;

	while (i < steps.length) {
		const currentIndex = steps[i].index;

		// Collect all steps with the same index
		const group: AgentStep[] = [];
		while (i < steps.length && steps[i].index === currentIndex) {
			group.push(steps[i]);
			i++;
		}

		// Text first, then tool calls
		const text = group.filter((s) => s.type === "text");
		const tools = group.filter((s) => s.type === "tool-call");
		result.push(...text, ...tools);
	}

	return result;
}

export function ExecutionTimeline({
	steps,
	status,
	liveViewUrl,
	browserActions = [],
}: ExecutionTimelineProps) {
	const orderedSteps = reorderSteps(steps);

	return (
		<div className="flex flex-col gap-3">
			{orderedSteps.map((step, i) => (
				<div key={`${step.index}-${step.type}-${i}`}>
					<StepCard
						step={step}
						liveViewUrl={liveViewUrl}
						browserActions={
							step.type === "tool-call" && step.toolName === "browseAndVerify"
								? browserActions
								: undefined
						}
						isLastStep={i === orderedSteps.length - 1}
						isRunning={status === "running"}
					/>
				</div>
			))}

			{/* Browser actions preview before the tool step has completed */}
			{status === "running" && browserActions.length > 0 && !steps.some((s) => s.type === "tool-call" && s.toolName === "browseAndVerify") && (
				<div className="flex flex-col gap-1 p-3 rounded-lg border border-[#4444cf]/20 bg-[#eeedf8]/50">
					<div className="flex items-center gap-2 text-xs font-medium text-[#4444cf]">
						<Loader2 className="size-3 animate-spin" />
						Browser working...
					</div>
					<div className="flex flex-col gap-1 ml-5">
						{browserActions.map((action) => (
							<div
								key={action.index}
								className="flex items-start gap-1.5 text-xs text-[#8a857d]"
							>
								<div className="flex items-center justify-center size-4 rounded bg-[#eeedf8] shrink-0 mt-0.5">
									<PreviewActionIcon type={action.type} />
								</div>
								<span className="leading-relaxed">
									{formatPreviewAction(action)}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{status === "running" && (
				<div className="flex items-center gap-2 text-xs text-[#8a857d] p-2">
					<Loader2 className="size-3 animate-spin" />
					<span>Thinking...</span>
				</div>
			)}
		</div>
	);
}
