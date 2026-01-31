"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Wrench, CheckCircle2 } from "lucide-react";
import type { AgentStep } from "@/lib/ai/agents/types";

interface ToolStepCardProps {
	step: AgentStep;
}

function ToolData({ label, data }: { label: string; data: unknown }) {
	if (data == null) return null;
	if (typeof data === "object" && Object.keys(data as object).length === 0)
		return null;

	return (
		<details className="text-xs">
			<summary className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
				{label}
			</summary>
			<pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-48 overflow-y-auto">
				{JSON.stringify(data, null, 2)}
			</pre>
		</details>
	);
}

export function ToolStepCard({ step }: ToolStepCardProps) {
	if (step.type !== "tool-call") return null;

	return (
		<Card className="shadow-none border-border/50">
			<CardContent className="p-3">
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-2">
						<div className="flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
							<Wrench className="size-3 text-blue-600 dark:text-blue-400" />
						</div>
						<span className="text-xs font-medium">{step.toolName}</span>
						<CheckCircle2 className="size-3 text-green-500 ml-auto" />
					</div>
					<div className="ml-7 flex flex-col gap-1">
						<ToolData label="Input" data={step.toolInput} />
						<ToolData label="Output" data={step.toolOutput} />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
