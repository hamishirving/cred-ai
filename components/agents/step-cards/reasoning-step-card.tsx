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
			<div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
				<MessageSquare className="size-3 text-muted-foreground" />
			</div>
			<div className="min-w-0 max-w-none flex-1 text-xs leading-relaxed text-muted-foreground prose prose-xs dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_hr]:hidden [&_li]:my-0 [&_p]:my-1 [&_ul]:my-1">
				<Response>{step.content}</Response>
			</div>
		</div>
	);
}
