"use client";

import { MessageSquare } from "lucide-react";
import { Response } from "@/components/elements/response";
import type { AgentStep } from "@/lib/ai/agents/types";

interface ReasoningStepCardProps {
	step: AgentStep;
}

export function ReasoningStepCard({ step }: ReasoningStepCardProps) {
	if (step.type !== "text") return null;

	return (
		<div className="flex items-start gap-2 pl-3 py-2">
			<div className="flex items-center justify-center size-5 rounded-full bg-purple-100 dark:bg-purple-900/30 shrink-0 mt-0.5">
				<MessageSquare className="size-3 text-purple-600 dark:text-purple-400" />
			</div>
			<div className="min-w-0 flex-1 text-xs text-muted-foreground leading-relaxed prose prose-xs dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_hr]:hidden [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0">
				<Response>{step.content}</Response>
			</div>
		</div>
	);
}
