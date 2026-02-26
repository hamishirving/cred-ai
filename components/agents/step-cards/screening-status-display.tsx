"use client";

import { useState } from "react";
import {
	ChevronDown,
	ChevronRight,
	CheckCircle2,
	Circle,
	Clock,
	AlertTriangle,
	ExternalLink,
	Shield,
	Loader2,
	FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReportItem {
	type: string;
	status: "pending" | "in_progress" | "complete";
	result: string | null;
	jurisdiction?: string;
	estimatedCompletionTime?: string;
}

interface ComplianceImpactItem {
	reportItemType: string;
	complianceElement: string;
	canBeVerified: boolean;
}

interface ScreeningStatusData {
	candidateName: string;
	screeningId: string;
	packageName: string;
	overallStatus: "Pending" | "In Progress" | "Complete";
	overallResult: "Pending" | "Clear" | "Consider" | "Adverse";
	submittedAt: string;
	estimatedCompletionTime?: string;
	portalLink?: string;
	reportLink?: string;
	reportItems: ReportItem[];
	complianceImpact: ComplianceImpactItem[];
}

function StatusBadge({ status }: { status: string }) {
	switch (status) {
		case "Complete":
		case "complete":
			return <Badge variant="success" className="text-[10px] px-1.5 py-0">Complete</Badge>;
		case "In Progress":
		case "in_progress":
			return <Badge variant="info" className="text-[10px] px-1.5 py-0">In Progress</Badge>;
		case "Pending":
		case "pending":
			return <Badge variant="neutral" className="text-[10px] px-1.5 py-0">Pending</Badge>;
		default:
			return <Badge variant="neutral" className="text-[10px] px-1.5 py-0">{status}</Badge>;
	}
}

function ResultBadge({ result }: { result: string | null }) {
	if (!result || result === "Pending") return null;
	switch (result.toLowerCase()) {
		case "clear":
			return <Badge variant="success" className="text-[10px] px-1.5 py-0">Clear</Badge>;
		case "consider":
			return <Badge variant="warning" className="text-[10px] px-1.5 py-0">Consider</Badge>;
		case "negative_dilute":
			return <Badge variant="warning" className="text-[10px] px-1.5 py-0">Neg. Dilute</Badge>;
		case "adverse":
			return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Adverse</Badge>;
		default:
			return <Badge variant="neutral" className="text-[10px] px-1.5 py-0">{result}</Badge>;
	}
}

function ItemStatusIcon({ status }: { status: ReportItem["status"] }) {
	switch (status) {
		case "complete":
			return <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />;
		case "in_progress":
			return <Loader2 className="size-3.5 text-blue-500 shrink-0 animate-spin" />;
		case "pending":
			return <Circle className="size-3.5 text-neutral-400 shrink-0" />;
	}
}

function ReportItemRow({ item }: { item: ReportItem }) {
	const isNegDilute = item.result?.toLowerCase() === "negative_dilute";
	return (
		<div className="flex items-center gap-2 py-1.5 border-b border-neutral-100 last:border-b-0">
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1.5">
					<span className="text-xs font-medium">{item.type}</span>
					<ResultBadge result={item.result} />
				</div>
				{item.jurisdiction && (
					<p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
						{item.jurisdiction}
					</p>
				)}
			</div>
			{isNegDilute ? (
				<AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
			) : (
				<ItemStatusIcon status={item.status} />
			)}
		</div>
	);
}

function OverallStatusIcon({ status }: { status: string }) {
	switch (status) {
		case "Complete":
			return <CheckCircle2 className="size-5 text-green-600 shrink-0" />;
		case "In Progress":
			return <Loader2 className="size-5 text-blue-500 shrink-0 animate-spin" />;
		case "Pending":
			return <Clock className="size-5 text-neutral-400 shrink-0" />;
		default:
			return <Circle className="size-5 text-neutral-400 shrink-0" />;
	}
}

function formatElapsed(submittedAt: string): string {
	const submitted = new Date(submittedAt);
	const now = new Date();
	const diffMs = now.getTime() - submitted.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHrs = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHrs / 24);

	if (diffDays > 0) return `${diffDays}d ${diffHrs % 24}h ago`;
	if (diffHrs > 0) return `${diffHrs}h ${diffMins % 60}m ago`;
	return `${diffMins}m ago`;
}

function formatDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

export function ScreeningStatusDisplay({ data }: { data: unknown }) {
	const d = data as ScreeningStatusData;
	const [itemsOpen, setItemsOpen] = useState(false);
	const [complianceOpen, setComplianceOpen] = useState(false);

	const completedItems = d.reportItems.filter((i) => i.status === "complete").length;
	const totalItems = d.reportItems.length;
	const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

	const verifiableCount = d.complianceImpact.filter((c) => c.canBeVerified).length;

	return (
		<div className="not-prose my-3 rounded-lg border bg-card text-card-foreground overflow-hidden">
			{/* Header */}
			<div className="px-4 py-3 border-b bg-neutral-50/50">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-3">
						<OverallStatusIcon status={d.overallStatus} />
						<div>
							<h4 className="text-base font-semibold leading-tight">{d.candidateName}</h4>
							<p className="text-xs text-muted-foreground mt-1">
								{d.packageName} · ID: {d.screeningId}
							</p>
						</div>
					</div>
					<div className="text-right shrink-0">
						<StatusBadge status={d.overallStatus} />
						{d.overallResult !== "Pending" && (
							<div className="mt-1">
								<ResultBadge result={d.overallResult} />
							</div>
						)}
					</div>
				</div>

				{/* Progress bar */}
				<div className="mt-2.5 flex items-center gap-2">
					<div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
						<div
							className="h-full rounded-full transition-all bg-green-500"
							style={{ width: `${pct}%` }}
						/>
					</div>
					<span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
						{completedItems}/{totalItems}
					</span>
				</div>

				{/* Quick stats */}
				<div className="flex gap-4 mt-2.5">
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Clock className="size-3" />
						<span>Submitted {formatElapsed(d.submittedAt)}</span>
					</div>
					{d.estimatedCompletionTime && (
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<AlertTriangle className="size-3" />
							<span>ETA: {formatDateTime(d.estimatedCompletionTime!)}</span>
						</div>
					)}
					{verifiableCount > 0 && (
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<Shield className="size-3 text-green-600" />
							<span>{verifiableCount} can be verified</span>
						</div>
					)}
				</div>
			</div>

			{/* Report Items */}
			<div className="border-b">
				<button
					type="button"
					onClick={() => setItemsOpen(!itemsOpen)}
					className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-neutral-50/80 transition-colors cursor-pointer"
				>
					{itemsOpen ? (
						<ChevronDown className="size-3 text-muted-foreground shrink-0" />
					) : (
						<ChevronRight className="size-3 text-muted-foreground shrink-0" />
					)}
					<FileText className="size-3.5 text-muted-foreground shrink-0" />
					<span className="text-xs font-semibold uppercase tracking-wide flex-1 text-left">
						Screening Components
					</span>
					<span className="text-[11px] tabular-nums text-muted-foreground">
						{completedItems}/{totalItems} complete
					</span>
				</button>

				{itemsOpen && (
					<div className="px-4 pb-3 pl-10">
						{d.reportItems.map((item) => (
							<ReportItemRow key={item.type} item={item} />
						))}
					</div>
				)}
			</div>

			{/* Compliance Impact */}
			{d.complianceImpact.length > 0 && (
				<div className="border-b last:border-b-0">
					<button
						type="button"
						onClick={() => setComplianceOpen(!complianceOpen)}
						className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-neutral-50/80 transition-colors cursor-pointer"
					>
						{complianceOpen ? (
							<ChevronDown className="size-3 text-muted-foreground shrink-0" />
						) : (
							<ChevronRight className="size-3 text-muted-foreground shrink-0" />
						)}
						<Shield className="size-3.5 text-muted-foreground shrink-0" />
						<span className="text-xs font-semibold uppercase tracking-wide flex-1 text-left">
							Compliance Impact
						</span>
						{verifiableCount > 0 && (
							<Badge variant="success" className="text-[10px] px-1.5 py-0">
								{verifiableCount} verifiable
							</Badge>
						)}
					</button>

					{complianceOpen && (
						<div className="px-4 pb-3 pl-10">
							{d.complianceImpact.map((item) => (
								<div
									key={`${item.reportItemType}-${item.complianceElement}`}
									className="flex items-center gap-2 py-1.5 border-b border-neutral-100 last:border-b-0"
								>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-1.5">
											<span className="text-xs font-medium">{item.reportItemType}</span>
											<span className="text-[11px] text-muted-foreground">
												→ {item.complianceElement}
											</span>
										</div>
									</div>
									{item.canBeVerified ? (
										<CheckCircle2 className="size-3.5 text-green-600 shrink-0" />
									) : (
										<Clock className="size-3.5 text-neutral-400 shrink-0" />
									)}
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Portal / Report links */}
			{(d.portalLink || d.reportLink) && (
				<div className="px-4 py-3 border-t bg-neutral-50/30 flex gap-4">
					{d.portalLink && (
						<a
							href={d.portalLink}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 text-xs text-primary hover:underline"
						>
							<ExternalLink className="size-3" />
							Sterling Portal
						</a>
					)}
					{d.reportLink && (
						<a
							href={d.reportLink}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 text-xs text-primary hover:underline"
						>
							<FileText className="size-3" />
							Download Report
						</a>
					)}
				</div>
			)}
		</div>
	);
}
