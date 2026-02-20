"use client";

import { Loader2, Globe, Navigation, MousePointer, Type, Monitor, Eye } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { AgentStep, BrowserAction } from "@/lib/ai/agents/types";
import { ToolStepCard } from "./step-cards/tool-step-card";
import { ReasoningStepCard } from "./step-cards/reasoning-step-card";
import { BrowserStepCard } from "./step-cards/browser-step-card";
import { DecisionStepCard } from "./step-cards/decision-step-card";
import { StructuredOutputStepCard } from "./step-cards/structured-output-step-card";

interface ExecutionTimelineProps {
	steps: AgentStep[];
	status: string;
	liveViewUrl?: string | null;
	browserActions?: BrowserAction[];
}

function StepCard({
	step,
	allSteps,
	liveViewUrl,
	browserActions,
	isLastStep,
	isRunning,
}: {
	step: AgentStep;
	allSteps: AgentStep[];
	liveViewUrl?: string | null;
	browserActions?: BrowserAction[];
	isLastStep: boolean;
	isRunning: boolean;
}) {
	if (step.type === "structured-output") {
		return <StructuredOutputStepCard step={step} />;
	}

	if (step.type === "tool-call") {
		if (step.toolName === "browseAndVerify" || step.toolName === "dvlaBrowseVerify" || step.toolName === "gdcBrowseVerify") {
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
		return <ToolStepCard step={step} allSteps={allSteps} />;
	}

	return <ReasoningStepCard step={step} />;
}

/** Verb label for browser action type */
function previewActionVerb(type: string): string {
	const lower = type.toLowerCase();
	if (lower === "goto" || lower === "navigate") return "Navigate";
	if (lower === "click" || lower === "act") return "Click";
	if (lower === "type" || lower === "fillform") return "Type";
	if (lower === "screenshot") return "Screenshot";
	if (lower === "extract" || lower === "observe") return "Extract";
	if (lower === "browser-ready") return "Ready";
	return type.charAt(0).toUpperCase() + type.slice(1);
}

/** Format browser action for display in preview */
function formatPreviewAction(action: BrowserAction): string {
	if (action.type === "browser-ready") return "Browser session initialised";
	if (action.action) {
		try {
			const parsed = JSON.parse(action.action);
			if (parsed.instruction) return parsed.instruction;
			if (parsed.action) return parsed.action;
			if (parsed.url) return new URL(parsed.url).hostname;
			if (parsed.text) return `"${parsed.text}"`;
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

		// Text first, then tool calls, then structured output last
		const text = group.filter((s) => s.type === "text");
		const tools = group.filter((s) => s.type === "tool-call");
		const structured = group.filter((s) => s.type === "structured-output");
		result.push(...text, ...tools, ...structured);
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
						allSteps={orderedSteps}
						liveViewUrl={liveViewUrl}
						browserActions={
							step.type === "tool-call" && (step.toolName === "browseAndVerify" || step.toolName === "dvlaBrowseVerify" || step.toolName === "gdcBrowseVerify")
								? browserActions
								: undefined
						}
						isLastStep={i === orderedSteps.length - 1}
						isRunning={status === "running"}
					/>
				</div>
			))}

			{/* Browser actions preview before the tool step has completed */}
			{status === "running" && browserActions.length > 0 && !steps.some((s) => s.type === "tool-call" && (s.toolName === "browseAndVerify" || s.toolName === "dvlaBrowseVerify" || s.toolName === "gdcBrowseVerify")) && (
				<div className="flex flex-col gap-1 rounded-lg border border-border/50 bg-card p-3">
					<div className="flex items-center gap-2 text-xs font-medium text-foreground">
						<Loader2 className="size-3 animate-spin text-muted-foreground" />
						Browser working...
					</div>
					<div className="ml-5 relative h-5">
						<AnimatePresence mode="wait">
							{browserActions.length > 0 && (
								<motion.div
									key={browserActions[browserActions.length - 1].index}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.25 }}
									className="absolute inset-0 flex items-start gap-1.5 text-xs text-muted-foreground"
								>
									<div className="flex items-center justify-center size-4 shrink-0 mt-0.5">
										<PreviewActionIcon type={browserActions[browserActions.length - 1].type} />
									</div>
									<span className="leading-relaxed truncate">
										<span className="font-medium text-foreground/80">{previewActionVerb(browserActions[browserActions.length - 1].type)}:</span>{" "}
										{formatPreviewAction(browserActions[browserActions.length - 1])}
									</span>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			)}

			{status === "running" && (
				<div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
					<Loader2 className="size-3 animate-spin" />
					<span>Thinking...</span>
				</div>
			)}
		</div>
	);
}
