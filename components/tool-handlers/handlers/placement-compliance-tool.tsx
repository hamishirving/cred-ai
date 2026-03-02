"use client";

import { Badge } from "@/components/ui/badge";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

// ============================================
// Types matching checkPlacementCompliance output
// ============================================

interface ComplianceItem {
	slug: string;
	name: string;
	category: string | null;
	faHandled: boolean;
	status: "met" | "expiring" | "expired" | "pending" | "requires_review" | "missing";
	carryForward: boolean;
	expiresAt: string | null;
	evidenceId: string | null;
	evidenceStatus: string | null;
	packageSlug: string;
	packageReason: string;
}

interface ComplianceSummary {
	total: number;
	met: number;
	expiring: number;
	pending: number;
	missing: number;
	percentage: number;
	faItemsTotal: number;
	faItemsMet: number;
	faItemsPending: number;
}

interface ComplianceOutput {
	data?: {
		items: ComplianceItem[];
		summary: ComplianceSummary;
	};
	error?: string;
}

// ============================================
// Helpers
// ============================================

/** Derive a source label from the packageReason field (e.g. "federal-core" -> "Federal Core") */
function deriveSourceLabel(reason: string): string {
	if (reason.startsWith("federal")) return "Federal Core";
	if (reason.startsWith("state:")) {
		const state = reason.replace("state:", "").trim();
		return `State: ${state.charAt(0).toUpperCase() + state.slice(1)}`;
	}
	if (reason.startsWith("role:")) {
		const role = reason.replace("role:", "").trim();
		return `Role: ${role}`;
	}
	if (reason.startsWith("facility")) return "Facility";
	if (reason.includes("oig") || reason.includes("exclusion")) return "Exclusion Checks";
	return reason;
}

/** Derive a source key for grouping */
function deriveSourceKey(reason: string): string {
	if (reason.startsWith("federal")) return "federal";
	if (reason.startsWith("state:")) return "state";
	if (reason.startsWith("role:")) return "role";
	if (reason.startsWith("facility")) return "facility";
	if (reason.includes("oig") || reason.includes("exclusion")) return "exclusion";
	return reason;
}

const SOURCE_ORDER: Record<string, number> = {
	federal: 0,
	state: 1,
	role: 2,
	facility: 3,
	exclusion: 4,
};

function StatusIcon({ status }: { status: ComplianceItem["status"] }) {
	switch (status) {
		case "met":
			return <span className="text-green-600 font-medium">&#10003;</span>;
		case "expiring":
			return <span className="text-amber-500 font-medium">&#9888;</span>;
		case "expired":
			return <span className="text-red-500 font-medium">&#10007;</span>;
		case "missing":
			return <span className="text-red-500 font-medium">&#10007;</span>;
		case "pending":
			return <span className="text-blue-500 font-medium">&#8987;</span>;
		case "requires_review":
			return <span className="text-amber-500 font-medium">&#8987;</span>;
		default:
			return <span className="text-muted-foreground">-</span>;
	}
}

function statusLabel(status: ComplianceItem["status"]): string {
	switch (status) {
		case "met":
			return "Complete";
		case "expiring":
			return "Expiring soon";
		case "expired":
			return "Expired";
		case "missing":
			return "Missing";
		case "pending":
			return "Pending";
		case "requires_review":
			return "Needs review";
		default:
			return status;
	}
}

function handlerLabel(item: ComplianceItem): string | null {
	if (item.status === "met") return null;
	if (item.faHandled) return "FA";
	// Facility/placement-scoped items are typically candidate or Credentially
	if (item.packageSlug?.includes("facility") || item.packageSlug?.includes("hospital")) return "Candidate";
	return "Credentially";
}

// ============================================
// Component
// ============================================

export function PlacementComplianceTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, ComplianceOutput>) {
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Placement Compliance"
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

	const { items, summary } = output.data;

	// Group items by source
	const groups = new Map<string, { label: string; items: ComplianceItem[] }>();
	for (const item of items) {
		const key = deriveSourceKey(item.packageReason);
		if (!groups.has(key)) {
			groups.set(key, {
				label: deriveSourceLabel(item.packageReason),
				items: [],
			});
		}
		groups.get(key)!.items.push(item);
	}

	// Sort groups by source order
	const sortedGroups = [...groups.entries()].sort(
		([a], [b]) => (SOURCE_ORDER[a] ?? 99) - (SOURCE_ORDER[b] ?? 99),
	);

	const carryForwardCount = items.filter((i) => i.carryForward).length;
	const faNeeded = items.filter((i) => i.faHandled && i.status !== "met").length;
	const pct = summary.percentage;

	return (
		<div className="not-prose my-3 rounded-lg border bg-card text-card-foreground">
			{/* Summary header */}
			<div className="p-3 border-b space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium">
						Placement Compliance
					</span>
					<span className="text-xs text-muted-foreground">
						{summary.met} of {summary.total} complete ({pct}%)
					</span>
				</div>

				{/* Progress bar */}
				<div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
					<div
						className="h-full rounded-full transition-all bg-green-500"
						style={{ width: `${pct}%` }}
					/>
				</div>

				{/* Quick stats */}
				<div className="flex gap-3 text-xs text-muted-foreground">
					{carryForwardCount > 0 && (
						<span>{carryForwardCount} carry forward</span>
					)}
					{faNeeded > 0 && <span>{faNeeded} need FA</span>}
					{summary.missing > 0 && (
						<span>{summary.missing} missing</span>
					)}
					{summary.expiring > 0 && (
						<span>{summary.expiring} expiring</span>
					)}
				</div>
			</div>

			{/* Grouped items */}
			<div className="divide-y">
				{sortedGroups.map(([key, group]) => {
					const groupMet = group.items.filter(
						(i) => i.status === "met",
					).length;
					return (
						<div key={key} className="p-3">
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{group.label}
								</span>
								<span className="text-xs text-muted-foreground">
									{groupMet}/{group.items.length}
								</span>
							</div>

							<div className="flex flex-col gap-1.5">
								{group.items.map((item) => {
									const handler = handlerLabel(item);
									return (
										<div
											key={item.slug}
											className="flex items-center gap-2 text-sm"
										>
											<StatusIcon status={item.status} />
											<span
												className={
													item.status === "met"
														? "text-foreground"
														: "text-foreground"
												}
											>
												{item.name}
											</span>

											<div className="ml-auto flex items-center gap-1.5">
												{item.carryForward && (
													<Badge
														variant="info"
														className="text-[10px] px-1.5 py-0"
													>
														carry forward
													</Badge>
												)}
												{item.status === "expiring" &&
													item.expiresAt && (
														<span className="text-xs text-amber-500">
															expires{" "}
															{new Date(
																item.expiresAt,
															).toLocaleDateString(
																"en-GB",
																{
																	day: "numeric",
																	month: "short",
																},
															)}
														</span>
													)}
												{handler && (
													<Badge
														variant={
															handler === "FA"
																? "warning"
																: handler === "Candidate"
																	? "neutral"
																	: "secondary"
														}
														className="text-[10px] px-1.5 py-0"
													>
														{handler}
													</Badge>
												)}
												<span className="text-xs text-muted-foreground">
													{statusLabel(item.status)}
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
