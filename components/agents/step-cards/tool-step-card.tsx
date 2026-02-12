"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Wrench, CheckCircle2, Eye } from "lucide-react";
import type { AgentStep } from "@/lib/ai/agents/types";
import { toolDisplayRegistry } from "./tool-display-registry";

interface ToolStepCardProps {
	step: AgentStep;
	allSteps?: AgentStep[];
}

function ToolData({ label, data }: { label: string; data: unknown }) {
	if (data == null) return null;
	if (typeof data === "object" && Object.keys(data as object).length === 0)
		return null;

	return (
		<details className="text-xs">
			<summary className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
				{label}
			</summary>
			<pre className="mt-1 max-h-48 overflow-y-auto overflow-x-auto rounded bg-muted p-2 text-xs">
				{JSON.stringify(data, null, 2)}
			</pre>
		</details>
	);
}

export function ToolStepCard({ step, allSteps }: ToolStepCardProps) {
	const [displayOpen, setDisplayOpen] = useState(false);

	if (step.type !== "tool-call") return null;

	const display = step.toolName ? toolDisplayRegistry[step.toolName] : undefined;
	const DisplayComponent = display?.component;

	return (
		<>
			<Card className="shadow-none border-border/50">
				<CardContent className="p-3">
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center gap-2">
							<div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12">
								<Wrench className="size-3 text-primary" />
							</div>
							<span className="text-xs font-medium">{step.toolName}</span>
							<CheckCircle2 className="ml-auto size-3 text-[var(--positive)]" />
						</div>
						<div className="ml-7 flex flex-col gap-1">
							<ToolData label="Input" data={step.toolInput} />
							<ToolData label="Output" data={step.toolOutput} />
							{display && (
								<Button
									variant="outline"
									size="sm"
									className="w-fit mt-1 gap-1.5 text-xs"
									onClick={() => setDisplayOpen(true)}
								>
									<Eye className="size-3" />
									{display.label}
								</Button>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{display && DisplayComponent && (
				<Dialog open={displayOpen} onOpenChange={setDisplayOpen}>
					<DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
						<DialogHeader className="sr-only">
							<DialogTitle>{display.label}</DialogTitle>
							<DialogDescription>{step.toolName}</DialogDescription>
						</DialogHeader>
						<div className="flex justify-center">
							<DisplayComponent data={step.toolOutput} allSteps={allSteps} />
						</div>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
}
