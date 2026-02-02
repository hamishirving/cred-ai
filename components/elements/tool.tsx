"use client";

import type { ToolUIPart } from "ai";
import {
	CheckCircleIcon,
	ChevronDownIcon,
	CircleIcon,
	ClockIcon,
	WrenchIcon,
	XCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
	<Collapsible
		className={cn(
			"not-prose mb-4 w-full rounded-md border bg-white transition-all dark:bg-card",
			className,
		)}
		{...props}
	/>
);

export type ToolHeaderProps = {
	type: string;
	state: ToolUIPart["state"] | string;
	className?: string;
};

const getStatusBadge = (status: ToolUIPart["state"] | string) => {
	const labels: Record<string, string> = {
		"input-streaming": "Pending",
		"input-available": "Running",
		"partial-call": "Running",
		call: "Running",
		"approval-requested": "Approval Requested",
		"approval-responded": "Approved",
		"output-available": "Completed",
		result: "Completed",
		"output-error": "Error",
		"output-denied": "Denied",
	};

	const icons: Record<string, ReactNode> = {
		"input-streaming": <CircleIcon className="size-4" />,
		"input-available": <ClockIcon className="size-4 animate-spin" />,
		"partial-call": <ClockIcon className="size-4 animate-spin" />,
		call: <ClockIcon className="size-4 animate-spin" />,
		"approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
		"approval-responded": <CheckCircleIcon className="size-4 text-blue-600" />,
		"output-available": <CheckCircleIcon className="size-4 text-green-600" />,
		result: <CheckCircleIcon className="size-4 text-green-600" />,
		"output-error": <XCircleIcon className="size-4 text-red-600" />,
		"output-denied": <XCircleIcon className="size-4 text-orange-600" />,
	};

	const isRunning =
		status === "input-available" ||
		status === "partial-call" ||
		status === "call";

	const label = labels[status] ?? "Unknown";
	const icon = icons[status] ?? <CircleIcon className="size-4" />;

	return (
		<Badge
			className={cn(
				"flex items-center gap-1 rounded-full text-xs",
				isRunning &&
					"bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
			)}
			variant={isRunning ? "default" : "secondary"}
		>
			{icon}
			<span className={cn(isRunning && "font-semibold")}>{label}</span>
		</Badge>
	);
};

export const ToolHeader = ({
	className,
	type,
	state,
	...props
}: ToolHeaderProps) => {
	const isRunning = state === "input-available";

	return (
		<CollapsibleTrigger
			className={cn(
				"flex w-full min-w-0 items-center justify-between gap-2 p-3 transition-colors",
				isRunning && "bg-blue-50/50 dark:bg-blue-950/20",
				className,
			)}
			{...props}
		>
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<WrenchIcon
					className={cn(
						"size-4 shrink-0 text-muted-foreground",
						isRunning && "text-blue-600 dark:text-blue-400",
					)}
				/>
				<span className="truncate font-medium text-sm">{type}</span>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{getStatusBadge(state)}
				<ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
			</div>
		</CollapsibleTrigger>
	);
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
	<CollapsibleContent
		className={cn(
			"data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in",
			className,
		)}
		{...props}
	/>
);

export type ToolInputProps = ComponentProps<"div"> & {
	input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
	<div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
		<h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
			Parameters
		</h4>
		<div className="rounded-md bg-muted/50">
			<CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
		</div>
	</div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
	output: ReactNode;
	errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({
	className,
	output,
	errorText,
	...props
}: ToolOutputProps) => {
	if (!(output || errorText)) {
		return null;
	}

	return (
		<div className={cn("space-y-2 p-4", className)} {...props}>
			<h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
				{errorText ? "Error" : "Result"}
			</h4>
			<div
				className={cn(
					"overflow-x-auto rounded-md text-xs [&_table]:w-full",
					errorText
						? "bg-destructive/10 text-destructive"
						: "bg-muted/50 text-foreground",
				)}
			>
				{errorText && <div>{errorText}</div>}
				{output && <div>{output}</div>}
			</div>
		</div>
	);
};
