"use client";

import { Badge } from "@/components/ui/badge";
import {
	CheckCircle2,
	Clock,
	Loader2,
	XCircle,
	Wrench,
	Zap,
} from "lucide-react";

interface ExecutionSummaryProps {
	result: {
		status: "completed" | "failed" | "escalated";
		summary: string;
		steps: Array<{ type: string }>;
		usage: { inputTokens: number; outputTokens: number; totalTokens: number };
		durationMs: number;
		executionId?: string;
	};
}

export function ExecutionSummary({ result }: ExecutionSummaryProps) {
	const isCompleted = result.status === "completed";
	const toolSteps = result.steps.filter((s) => s.type === "tool-call").length;

	return (
		<div className="flex items-center gap-3 text-xs text-[#8a857d] pt-2 border-t border-[#e5e2db]">
			<span className="flex items-center gap-1">
				{isCompleted ? (
					<CheckCircle2 className="size-3 text-[#3a9960]" />
				) : (
					<XCircle className="size-3 text-[#c93d4e]" />
				)}
				{isCompleted ? "Completed" : "Failed"}
			</span>
			<span className="flex items-center gap-1">
				<Clock className="size-3" />
				{(result.durationMs / 1000).toFixed(1)}s
			</span>
			<span className="flex items-center gap-1">
				<Wrench className="size-3" />
				{toolSteps} tool{toolSteps !== 1 ? "s" : ""}
			</span>
			<span className="flex items-center gap-1">
				<Zap className="size-3" />
				{result.usage.totalTokens.toLocaleString()} tokens
			</span>
		</div>
	);
}

export function StatusBadge({ status }: { status: string }) {
	switch (status) {
		case "running":
			return (
				<Badge variant="default" className="gap-1">
					<Loader2 className="size-3 animate-spin" />
					Running
				</Badge>
			);
		case "completed":
			return (
				<Badge
					variant="default"
					className="gap-1 bg-[#3a9960] hover:bg-[#2e7a4d]"
				>
					<CheckCircle2 className="size-3" />
					Completed
				</Badge>
			);
		case "failed":
			return (
				<Badge variant="destructive" className="gap-1">
					<XCircle className="size-3" />
					Failed
				</Badge>
			);
		default:
			return <Badge variant="secondary">Idle</Badge>;
	}
}
