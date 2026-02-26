"use client";

import { Badge } from "@/components/ui/badge";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

// ============================================
// Types matching Sterling API v2 response
// ============================================

interface ReportItem {
	id: string;
	type: string;
	status: string;
	result: string | null;
	root?: string;
	description?: string;
	updatedAt: string;
	estimatedCompletionTime?: string;
}

interface ScreeningData {
	id: string;
	candidateId: string;
	packageId: string;
	packageName?: string;
	status: string;
	result: string;
	links?: {
		admin?: {
			web?: string;
		};
	};
	reportItems: ReportItem[];
	submittedAt?: string;
	updatedAt?: string;
	estimatedCompletionTime?: string;
}

interface ScreeningOutput {
	data?: ScreeningData;
	error?: string;
}

// ============================================
// Helpers
// ============================================

/** Status icon for a report item */
function StatusIcon({ status }: { status: string }) {
	switch (status) {
		case "complete":
			return <span className="text-green-600">&#10003;</span>;
		case "in_progress":
			return <span className="text-blue-500 animate-spin inline-block">&#9696;</span>;
		case "pending":
			return <span className="text-muted-foreground">&#128339;</span>;
		case "flagged":
		case "adverse":
		case "consider":
			return <span className="text-red-500">&#9888;</span>;
		default:
			return <span className="text-muted-foreground">-</span>;
	}
}

/** Badge variant for overall status */
function statusBadgeVariant(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
	const s = status.toLowerCase();
	switch (s) {
		case "complete":
			return "success";
		case "in progress":
		case "in_progress":
			return "info";
		case "pending":
			return "neutral";
		case "adverse":
			return "danger";
		case "consider":
			return "warning";
		default:
			return "neutral";
	}
}

/** Badge variant for result */
function resultBadgeVariant(result: string): "success" | "warning" | "danger" {
	const r = result.toLowerCase();
	switch (r) {
		case "clear":
			return "success";
		case "consider":
		case "review":
		case "negative_dilute":
			return "warning";
		case "adverse":
		case "flagged":
			return "danger";
		default:
			return "warning";
	}
}

/** Format result label */
function resultLabel(result: string): string {
	const r = result.toLowerCase();
	switch (r) {
		case "clear":
			return "Clear";
		case "consider":
			return "Review";
		case "negative_dilute":
			return "Neg. Dilute";
		case "adverse":
			return "Flagged";
		default:
			return result.charAt(0).toUpperCase() + result.slice(1);
	}
}

// ============================================
// Component
// ============================================

export function FAScreeningTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, ScreeningOutput>) {
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="FA Screening Status"
				state={state}
				input={input}
			/>
		);
	}

	if (output.error) {
		return (
			<div className="text-destructive text-sm">
				Error: {String(output.error)}
			</div>
		);
	}

	if (!output.data) return null;

	const screening = output.data;
	const items = screening.reportItems || [];
	const completedCount = items.filter((c) => c.status === "complete").length;

	return (
		<div className="not-prose my-3 rounded-lg border bg-card text-card-foreground">
			{/* Header */}
			<div className="p-3 border-b space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium">
						Background Screening
					</span>
					<Badge
						variant={statusBadgeVariant(screening.status)}
						className="text-[10px] px-1.5 py-0"
					>
						{screening.status}
					</Badge>
				</div>

				<div className="flex gap-3 text-xs text-muted-foreground">
					<span>ID: {screening.id}</span>
					{screening.packageName && <span>Pkg: {screening.packageName}</span>}
					{screening.submittedAt && (
						<span>
							Submitted:{" "}
							{new Date(screening.submittedAt).toLocaleDateString("en-GB", {
								day: "numeric",
								month: "short",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</span>
					)}
				</div>

				{/* Progress bar */}
				{items.length > 0 && (
					<div className="space-y-1">
						<div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
							<div
								className="h-full rounded-full transition-all bg-green-500"
								style={{
									width: `${Math.round((completedCount / items.length) * 100)}%`,
								}}
							/>
						</div>
						<span className="text-xs text-muted-foreground">
							{completedCount} of {items.length} components complete
						</span>
					</div>
				)}
			</div>

			{/* Report items breakdown */}
			{items.length > 0 && (
				<div className="p-3">
					<div className="flex flex-col gap-2">
						{items.map((item) => (
							<div
								key={item.id}
								className="flex items-center gap-2 text-sm"
							>
								<StatusIcon status={item.status} />
								<span>{item.type}</span>
								{item.root && (
									<span className="text-xs text-muted-foreground">
										({item.root}{item.description ? ` - ${item.description}` : ""})
									</span>
								)}
								<div className="ml-auto flex items-center gap-1.5">
									{item.result && (
										<Badge
											variant={resultBadgeVariant(item.result)}
											className="text-[10px] px-1.5 py-0"
										>
											{resultLabel(item.result)}
										</Badge>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Overall result (when complete) */}
			{screening.status.toLowerCase() === "complete" && screening.result && (
				<div className="p-3 border-t">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Overall Result</span>
						<Badge
							variant={resultBadgeVariant(screening.result)}
							className="px-2 py-0.5"
						>
							{resultLabel(screening.result)}
						</Badge>
					</div>
				</div>
			)}

			{/* Admin link */}
			{screening.links?.admin?.web && (
				<div className="p-3 border-t">
					<a
						href={screening.links.admin.web}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-blue-600 hover:underline"
					>
						View in Sterling Portal
					</a>
				</div>
			)}
		</div>
	);
}
