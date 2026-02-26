"use client";

import {
	Briefcase,
	Building2,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Circle,
	MapPin,
	Shield,
	TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface ComplianceItem {
	elementId: string;
	elementName: string;
	elementSlug: string;
	status: string;
	packageName?: string | null;
	carryForward?: boolean;
	faHandled?: boolean;
}

interface ComplianceOutput {
	data?: {
		completed: number;
		total: number;
		percentage: number;
		items: ComplianceItem[];
	};
	error?: string;
}

function statusVariant(
	status: string,
): "success" | "warning" | "danger" | "secondary" {
	const s = status.toLowerCase();
	if (s === "met") return "success";
	if (s === "expiring" || s === "pending" || s === "requires_review")
		return "warning";
	if (s === "expired" || s === "missing") return "danger";
	return "secondary";
}

function formatStatus(status: string): string {
	if (status === "requires_review") return "Review";
	return status
		.replace(/[_-]/g, " ")
		.toLowerCase()
		.replace(/^\w/, (c) => c.toUpperCase());
}

function percentColour(pct: number): string {
	if (pct === 100) return "text-[var(--positive)]";
	if (pct >= 75) return "text-[var(--warning)]";
	return "text-destructive";
}

function StatusIcon({ status }: { status: string }) {
	const s = status.toLowerCase();
	if (s === "met")
		return <CheckCircle2 className="size-4 text-[var(--positive)] shrink-0" />;
	if (s === "expired" || s === "missing")
		return <TriangleAlert className="size-4 text-destructive shrink-0" />;
	return <Circle className="size-4 text-[var(--warning)] shrink-0" />;
}

const SOURCE_ICONS: Record<string, typeof Shield> = {
	federal: Shield,
	state: MapPin,
	role: Briefcase,
	facility: Building2,
};

function getSourceFromPackage(name: string): string {
	const lower = name.toLowerCase();
	if (lower.includes("state") || lower.includes("florida")) return "state";
	if (
		lower.includes("role") ||
		lower.includes("nurse") ||
		lower.includes("travel")
	)
		return "role";
	if (lower.includes("facility") || lower.includes("hospital"))
		return "facility";
	return "federal";
}

function PackageGroup({
	packageName,
	items,
}: {
	packageName: string;
	items: ComplianceItem[];
}) {
	const met = items.filter((i) => i.status === "met").length;
	const allDone = met === items.length;
	const [open, setOpen] = useState(false);

	const source = getSourceFromPackage(packageName);
	const Icon = SOURCE_ICONS[source] || Shield;

	return (
		<div className="overflow-hidden rounded-lg border bg-card">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors duration-150 cursor-pointer"
			>
				{open ? (
					<ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
				) : (
					<ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
				)}
				<Icon
					className="size-4 text-muted-foreground shrink-0"
					aria-hidden="true"
				/>
				<span className="text-sm font-medium flex-1 text-left">
					{packageName}
				</span>
				{allDone ? (
					<Badge variant="success" className="text-xs">
						Complete
					</Badge>
				) : (
					<span className="text-xs tabular-nums text-muted-foreground">
						{met}/{items.length}
					</span>
				)}
			</button>

			{open && (
				<div className="px-4 pb-3 pl-12">
					{items.map((item) => (
						<div
							key={item.elementId}
							className="flex items-center gap-3 py-2 px-2 border-b border-border/50 last:border-b-0"
						>
							<StatusIcon status={item.status} />
							<span className="text-sm flex-1 min-w-0">{item.elementName}</span>
							<div className="flex items-center gap-1.5 shrink-0">
								{item.carryForward && (
									<span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
										Carry-forward
									</span>
								)}
								{item.faHandled && (
									<span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
										FA
									</span>
								)}
								<Badge
									variant={statusVariant(item.status)}
									className="text-xs capitalize"
								>
									{formatStatus(item.status)}
								</Badge>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export function LocalComplianceTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, ComplianceOutput>) {
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Get Compliance"
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

	const d = output.data;
	if (!d) return null;

	const pending = d.total - d.completed;

	// Group items by package
	const grouped = new Map<string, ComplianceItem[]>();
	for (const item of d.items) {
		const key = item.packageName || "Other";
		const existing = grouped.get(key) || [];
		existing.push(item);
		grouped.set(key, existing);
	}

	return (
		<div className="not-prose my-3 w-full space-y-3">
			{/* Summary header */}
			<div className="flex items-center gap-6 rounded-lg border bg-card px-5 py-4">
				<div className="text-center">
					<div
						className={cn(
							"text-2xl font-semibold tabular-nums",
							percentColour(d.percentage),
						)}
					>
						{d.percentage}%
					</div>
					<div className="text-muted-foreground text-xs">Compliant</div>
				</div>
				<div className="h-8 w-px bg-border" />
				<div className="text-center">
					<div className="text-2xl font-semibold tabular-nums text-[var(--positive)]">
						{d.completed}
					</div>
					<div className="text-xs text-[var(--positive)]">Complete</div>
				</div>
				<div className="text-center">
					<div className="text-2xl font-semibold tabular-nums text-[var(--warning)]">
						{pending}
					</div>
					<div className="text-muted-foreground text-xs">Pending</div>
				</div>
				<div className="text-center">
					<div className="text-2xl font-semibold tabular-nums">{d.total}</div>
					<div className="text-muted-foreground text-xs">Total</div>
				</div>
			</div>

			{/* Package groups */}
			<div className="space-y-2">
				{[...grouped.entries()].map(([packageName, items]) => (
					<PackageGroup
						key={packageName}
						packageName={packageName}
						items={items}
					/>
				))}
			</div>
		</div>
	);
}
