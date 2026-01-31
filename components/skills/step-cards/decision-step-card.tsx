"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Scale, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import type { SkillStep } from "@/lib/ai/skills/types";

interface DecisionStepCardProps {
	step: SkillStep;
}

function getStatusDisplay(status: string) {
	switch (status) {
		case "verified":
			return {
				icon: CheckCircle2,
				label: "Verified",
				className: "bg-green-600 hover:bg-green-700",
			};
		case "expired":
			return {
				icon: Clock,
				label: "Expired",
				className: "bg-amber-600 hover:bg-amber-700",
			};
		case "unverifiable":
			return {
				icon: XCircle,
				label: "Unverifiable",
				className: "bg-red-600 hover:bg-red-700",
			};
		case "pending_review":
			return {
				icon: AlertTriangle,
				label: "Pending Review",
				className: "bg-yellow-600 hover:bg-yellow-700",
			};
		default:
			return {
				icon: Scale,
				label: status,
				className: "",
			};
	}
}

export function DecisionStepCard({ step }: DecisionStepCardProps) {
	if (step.type !== "tool-call" || step.toolName !== "updateDocumentStatus")
		return null;

	const input = step.toolInput as
		| { status?: string; evidence?: Record<string, unknown> }
		| undefined;

	const status = input?.status || "unknown";
	const display = getStatusDisplay(status);
	const Icon = display.icon;

	return (
		<Card
			className={
				status === "verified"
					? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
					: status === "expired"
						? "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30"
						: "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30"
			}
		>
			<CardContent className="p-3">
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-2">
						<div className="flex items-center justify-center size-5 rounded-full bg-white dark:bg-gray-800 shadow-sm shrink-0">
							<Scale className="size-3 text-foreground" />
						</div>
						<span className="text-xs font-medium">Decision</span>
						<Badge
							variant="default"
							className={`ml-auto gap-1 ${display.className}`}
						>
							<Icon className="size-3" />
							{display.label}
						</Badge>
						<Badge variant="outline" className="text-xs">
							Step {step.index}
						</Badge>
					</div>

					{/* Evidence — aligned to ml-7 */}
					{input?.evidence && Object.keys(input.evidence).length > 0 && (
						<div className="ml-7">
							<details className="text-xs">
								<summary className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
									Evidence
								</summary>
								<pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-32 overflow-y-auto">
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
