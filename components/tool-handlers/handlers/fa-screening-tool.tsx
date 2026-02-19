"use client";

import { Badge } from "@/components/ui/badge";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

// ============================================
// Types matching faCheckScreening output
// ============================================

interface ScreeningComponent {
	type: string;
	subType?: string;
	status: string;
	result?: string;
	updatedAt?: string;
}

interface ScreeningData {
	id: string;
	candidateId: string;
	packageId: string;
	status: string;
	result?: string;
	reportLinks?: Array<{ href: string }>;
	screenings?: ScreeningComponent[];
	submittedAt?: string;
	updatedAt?: string;
}

interface ScreeningOutput {
	data?: ScreeningData;
	error?: string;
}

// ============================================
// Helpers
// ============================================

/** Human-readable component type label */
function componentLabel(type: string): string {
	const labels: Record<string, string> = {
		criminal_federal: "Criminal Federal",
		criminal_county: "Criminal County",
		criminal_nationwide: "Criminal Nationwide",
		criminal_state: "Criminal State",
		ssn_trace: "SSN Trace",
		sex_offender: "Sex Offender",
		facis_level3: "FACIS Level III",
		drug_test: "Drug Test",
		drug_10panel: "Drug Test (10-panel)",
		oig_exclusion: "OIG Exclusion",
		sam_exclusion: "SAM Exclusion",
		health_screening: "Health Screening",
	};
	return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Status icon for a component */
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
	switch (status) {
		case "complete":
			return "success";
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
	switch (result) {
		case "clear":
			return "success";
		case "consider":
			return "warning";
		case "adverse":
			return "danger";
		default:
			return "warning";
	}
}

/** Format status label */
function statusLabel(status: string): string {
	switch (status) {
		case "in_progress":
			return "In Progress";
		case "complete":
			return "Complete";
		case "pending":
			return "Pending";
		case "adverse":
			return "Adverse";
		case "consider":
			return "Review";
		default:
			return status.charAt(0).toUpperCase() + status.slice(1);
	}
}

/** Format result label */
function resultLabel(result: string): string {
	switch (result) {
		case "clear":
			return "Clear";
		case "consider":
			return "Review";
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
	const components = screening.screenings || [];
	const completedCount = components.filter((c) => c.status === "complete").length;

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
						{statusLabel(screening.status)}
					</Badge>
				</div>

				<div className="flex gap-3 text-xs text-muted-foreground">
					<span>ID: {screening.id}</span>
					<span>Pkg: {screening.packageId}</span>
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
				{components.length > 0 && (
					<div className="space-y-1">
						<div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
							<div
								className="h-full rounded-full transition-all bg-green-500"
								style={{
									width: `${Math.round((completedCount / components.length) * 100)}%`,
								}}
							/>
						</div>
						<span className="text-xs text-muted-foreground">
							{completedCount} of {components.length} components complete
						</span>
					</div>
				)}
			</div>

			{/* Component breakdown */}
			{components.length > 0 && (
				<div className="p-3">
					<div className="flex flex-col gap-2">
						{components.map((component, i) => (
							<div
								key={`${component.type}-${i}`}
								className="flex items-center gap-2 text-sm"
							>
								<StatusIcon status={component.status} />
								<span>{componentLabel(component.type)}</span>
								<div className="ml-auto flex items-center gap-1.5">
									{component.result && (
										<Badge
											variant={resultBadgeVariant(component.result)}
											className="text-[10px] px-1.5 py-0"
										>
											{resultLabel(component.result)}
										</Badge>
									)}
									<span className="text-xs text-muted-foreground">
										{statusLabel(component.status)}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Overall result (when complete) */}
			{screening.status === "complete" && screening.result && (
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

			{/* Report link */}
			{screening.reportLinks && screening.reportLinks.length > 0 && (
				<div className="p-3 border-t">
					<a
						href={screening.reportLinks[0].href}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-blue-600 hover:underline"
					>
						View Full Report
					</a>
				</div>
			)}
		</div>
	);
}
