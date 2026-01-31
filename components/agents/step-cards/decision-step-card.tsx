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
						<div className="flex items-center justify-center size-5 rounded-full bg-[#eeedf8] shrink-0">
							<Scale className="size-3 text-[#4444cf]" />
						</div>
						<span className="text-xs font-medium">Decision</span>
						<CheckCircle2 className="size-3 text-[#3a9960] ml-auto" />
					</div>

					{/* Evidence — aligned to ml-7 */}
					{input?.evidence && Object.keys(input.evidence).length > 0 && (
						<div className="ml-7">
							<details className="text-xs">
								<summary className="text-[#8a857d] cursor-pointer hover:text-[#1c1a15] transition-colors">
									Evidence
								</summary>
								<pre className="mt-1 p-2 bg-[#f0ede7] rounded text-xs overflow-x-auto max-h-32 overflow-y-auto">
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
