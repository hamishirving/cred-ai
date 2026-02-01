"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, User } from "lucide-react";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface TaskAssignee {
	id: string;
	name: string;
	initials: string;
	role: string;
}

interface TaskData {
	id: string;
	title: string;
	description?: string;
	priority: "low" | "medium" | "high" | "urgent";
	category: string;
	status: string;
	dueAt?: string;
	assignee: TaskAssignee;
	subjectType?: string;
	subjectId?: string;
	createdAt: string;
}

interface TaskOutput {
	data?: TaskData;
	message?: string;
	error?: string;
}

const priorityColors: Record<string, string> = {
	low: "bg-slate-100 text-slate-700",
	medium: "bg-blue-100 text-blue-700",
	high: "bg-orange-100 text-orange-700",
	urgent: "bg-red-100 text-red-700",
};

function formatDueDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffDays = Math.ceil(
		(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
	);

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Tomorrow";
	if (diffDays > 0 && diffDays < 7) {
		return date.toLocaleDateString("en-GB", { weekday: "long" });
	}
	return date.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
	});
}

export function TaskTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<{ title: string; assigneeId: string }, TaskOutput>) {
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Create Task"
				state={state}
				input={input}
			/>
		);
	}

	if (output.error) {
		return <div className="text-destructive text-sm">{output.error}</div>;
	}

	if (!output.data) {
		return (
			<div className="text-muted-foreground text-sm">
				Task could not be created.
			</div>
		);
	}

	const { title, description, priority, dueAt, assignee } = output.data;

	return (
		<div className="w-[400px] max-w-full rounded-lg border bg-white p-3 dark:bg-card">
			<div className="flex items-start gap-3">
				<div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
					<CheckCircle2 className="h-4 w-4 text-primary" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<span className="font-medium text-sm truncate">{title}</span>
						<Badge
							variant="secondary"
							className={`text-[10px] px-1.5 py-0 ${priorityColors[priority]}`}
						>
							{priority}
						</Badge>
					</div>

					{description && (
						<p className="text-xs text-muted-foreground line-clamp-2 mb-2">
							{description}
						</p>
					)}

					<div className="flex items-center gap-3 text-xs text-muted-foreground">
						<div className="flex items-center gap-1.5">
							<Avatar className="h-5 w-5">
								<AvatarFallback className="text-[10px] bg-primary/10 text-primary">
									{assignee.initials}
								</AvatarFallback>
							</Avatar>
							<span>{assignee.name}</span>
						</div>

						{dueAt && (
							<div className="flex items-center gap-1">
								<Calendar className="h-3 w-3" />
								<span>{formatDueDate(dueAt)}</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
