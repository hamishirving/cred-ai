"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Scale, CheckCircle2 } from "lucide-react";
import type { AgentStep } from "@/lib/ai/agents/types";

interface DecisionStepCardProps {
	step: AgentStep;
}

export function DecisionStepCard({ step }: DecisionStepCardProps) {
	if (step.type !== "tool-call" || step.toolName !== "updateDocumentStatus")
		return null;

	const input = step.toolInput as
		| { status?: string; evidence?: Record<string, unknown> }
		| undefined;

	return (
		<Card className="shadow-none border-border/50">
			<CardContent className="p-3">
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-2">
						<div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12">
							<Scale className="size-3 text-primary" />
						</div>
						<span className="text-xs font-medium">Decision</span>
						<CheckCircle2 className="ml-auto size-3 text-[var(--positive)]" />
					</div>

					{/* Evidence — aligned to ml-7 */}
					{input?.evidence && Object.keys(input.evidence).length > 0 && (
						<div className="ml-7">
							<details className="text-xs">
								<summary className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
									Evidence
								</summary>
								<pre className="mt-1 max-h-32 overflow-y-auto overflow-x-auto rounded bg-muted p-2 text-xs">
									{JSON.stringify(input.evidence, null, 2)}
								</pre>
							</details>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
