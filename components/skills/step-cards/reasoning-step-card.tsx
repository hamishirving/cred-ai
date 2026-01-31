"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { Response } from "@/components/elements/response";
import type { SkillStep } from "@/lib/ai/skills/types";

interface ReasoningStepCardProps {
	step: SkillStep;
}

export function ReasoningStepCard({ step }: ReasoningStepCardProps) {
	if (step.type !== "text") return null;

	return (
		<Card className="border-muted">
			<CardContent className="p-3">
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-2">
						<div className="flex items-center justify-center size-5 rounded-full bg-purple-100 dark:bg-purple-900/30 shrink-0">
							<MessageSquare className="size-3 text-purple-600 dark:text-purple-400" />
						</div>
					</div>
					<div className="ml-7 text-xs text-foreground leading-relaxed prose prose-xs dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_hr]:hidden [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0">
						<Response>{step.content}</Response>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
