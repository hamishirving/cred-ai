"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ClipboardList, ShieldAlert } from "lucide-react";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface FollowupTask {
	id: string;
	title: string;
}

interface FollowupOutcomeData {
	summary?: string;
	updatedFields?: string[];
	skippedSensitiveFields?: string[];
	tasksCreated?: FollowupTask[];
}

interface FollowupOutcomeOutput {
	data?: FollowupOutcomeData;
	error?: string;
}

export function FollowupVoiceOutcomeTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, FollowupOutcomeOutput>) {
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Apply Voice Outcome"
				state={state}
				input={input}
			/>
		);
	}

	if (output.error) {
		return (
			<div className="w-[700px] max-w-full rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
				{output.error}
			</div>
		);
	}

	const data = output.data;
	if (!data) {
		return (
			<div className="w-[700px] max-w-full rounded-lg border bg-card p-3 text-sm text-muted-foreground">
				No follow-up outcome data was returned.
			</div>
		);
	}

	const updatedFields = data.updatedFields ?? [];
	const skippedSensitiveFields = data.skippedSensitiveFields ?? [];
	const tasksCreated = data.tasksCreated ?? [];

	return (
		<div className="w-[700px] max-w-full rounded-lg border bg-card p-3 space-y-3">
			<div className="flex items-center gap-2">
				<div className="rounded-full bg-primary/10 p-1.5">
					<CheckCircle2 className="h-4 w-4 text-primary" />
				</div>
				<div className="text-sm font-medium">Follow-up outcome applied</div>
			</div>

			{data.summary ? <p className="text-sm text-muted-foreground">{data.summary}</p> : null}

			<div className="flex flex-wrap gap-2">
				<Badge variant={updatedFields.length > 0 ? "success" : "secondary"}>
					updated: {updatedFields.length}
				</Badge>
				<Badge
					variant={skippedSensitiveFields.length > 0 ? "warning" : "secondary"}
				>
					sensitive skipped: {skippedSensitiveFields.length}
				</Badge>
				<Badge variant={tasksCreated.length > 0 ? "info" : "secondary"}>
					tasks: {tasksCreated.length}
				</Badge>
			</div>

			{updatedFields.length > 0 ? (
				<div className="text-xs text-muted-foreground">
					<span className="font-medium text-foreground">Updated fields:</span>{" "}
					{updatedFields.join(", ")}
				</div>
			) : null}

			{skippedSensitiveFields.length > 0 ? (
				<div className="rounded-md bg-muted/40 p-2 text-xs">
					<div className="mb-1 flex items-center gap-1 text-muted-foreground">
						<ShieldAlert className="h-3.5 w-3.5" />
						Sensitive fields routed for review
					</div>
					<div>{skippedSensitiveFields.join(", ")}</div>
				</div>
			) : null}

			{tasksCreated.length > 0 ? (
				<div className="rounded-md bg-muted/40 p-2 text-xs">
					<div className="mb-1 flex items-center gap-1 text-muted-foreground">
						<ClipboardList className="h-3.5 w-3.5" />
						Created tasks
					</div>
					<ul className="space-y-1">
						{tasksCreated.map((task) => (
							<li key={task.id}>
								<span className="font-medium">{task.title}</span>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}
