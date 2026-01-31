"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSkillExecution } from "@/hooks/use-skill-execution";
import { ExecutionTimeline } from "@/components/skills/execution-timeline";
import {
	ExecutionSummary,
	StatusBadge,
} from "@/components/skills/execution-summary";

export default function SkillExecutionPage() {
	const params = useParams<{ skillId: string }>();
	const searchParams = useSearchParams();
	const { status, steps, result, liveViewUrl, browserActions, execute, reset } =
		useSkillExecution();
	const hasStarted = useRef(false);

	// Start execution on mount
	useEffect(() => {
		if (hasStarted.current) return;
		hasStarted.current = true;

		const input: Record<string, string> = {};
		searchParams.forEach((value, key) => {
			input[key] = value;
		});

		execute(params.skillId, input);
	}, [params.skillId, searchParams, execute]);

	// Auto-scroll to bottom
	const bottomRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [steps, browserActions]);

	return (
		<div className="flex flex-col gap-4 p-4 w-full max-w-2xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" asChild>
						<Link href={`/skills/${params.skillId}`}>
							<ArrowLeft className="size-3 mr-1" />
							Back
						</Link>
					</Button>
					<StatusBadge status={status} />
				</div>
				{status !== "running" && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							reset();
							hasStarted.current = false;
							const input: Record<string, string> = {};
							searchParams.forEach((value, key) => {
								input[key] = value;
							});
							execute(params.skillId, input);
						}}
					>
						Re-run
					</Button>
				)}
			</div>

			{/* Timeline */}
			<ExecutionTimeline
				steps={steps}
				status={status}
				liveViewUrl={liveViewUrl}
				browserActions={browserActions}
			/>

			{/* Summary */}
			{result && <ExecutionSummary result={result} />}

			<div ref={bottomRef} />
		</div>
	);
}
