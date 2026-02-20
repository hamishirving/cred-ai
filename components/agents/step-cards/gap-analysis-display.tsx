"use client";

import { useState } from "react";
import {
	ChevronDown,
	ChevronRight,
	CheckCircle2,
	Circle,
	AlertTriangle,
	Clock,
	Shield,
	MapPin,
	Briefcase,
	Building2,
	Package,
	Zap,
	OctagonAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ============================================
// Types matching the agent's outputSchema
// ============================================

interface GapItem {
	name: string;
	status: "done" | "missing" | "expired";
	detail: string;
	handler?: "fa" | "candidate" | "facility" | "credentially";
}

interface GapGroup {
	source: "federal" | "state" | "role" | "facility";
	label: string;
	completed: number;
	total: number;
	items: GapItem[];
}

interface GapAnalysisData {
	candidateName: string;
	roleName: string;
	facilityName: string;
	targetState: string;
	overall: {
		completed: number;
		total: number;
		percentage: number;
	};
	groups: GapGroup[];
	recommendation: {
		faPackageId: string;
		faPackageName: string;
		reason: string;
	};
	workerPassportCount: number;
	newItemCount: number;
	estimatedTimeToCompliance: string;
	blockers: string[];
	immediateActions: string[];
}

// ============================================
// Sub-components
// ============================================

const SOURCE_ICONS: Record<string, typeof Shield> = {
	federal: Shield,
	state: MapPin,
	role: Briefcase,
	facility: Building2,
};

function StatusIcon({ status }: { status: GapItem["status"] }) {
	switch (status) {
		case "done":
			return <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />;
		case "missing":
			return <Circle className="size-3.5 text-red-500 shrink-0" />;
		case "expired":
			return <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />;
	}
}

function HandlerBadge({ handler }: { handler: GapItem["handler"] }) {
	if (!handler) return null;

	const config: Record<string, { label: string; variant: "neutral" | "info" | "warning" }> = {
		fa: { label: "FA", variant: "info" },
		candidate: { label: "Candidate", variant: "warning" },
		facility: { label: "Facility", variant: "neutral" },
		credentially: { label: "Cred", variant: "info" },
	};

	const c = config[handler];
	if (!c) return null;

	return (
		<Badge variant={c.variant} className="text-[10px] px-1.5 py-0 shrink-0">
			{c.label}
		</Badge>
	);
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
	const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
	return (
		<div className="flex items-center gap-2">
			<div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
				<div
					className="h-full rounded-full transition-all bg-green-500"
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
				{completed}/{total}
			</span>
		</div>
	);
}

function GroupSection({ group }: { group: GapGroup }) {
	const [open, setOpen] = useState(true);
	const allDone = group.completed === group.total;
	const Icon = SOURCE_ICONS[group.source] || Shield;

	return (
		<div className="border-b last:border-b-0">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-neutral-50 transition-colors"
			>
				{open ? (
					<ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
				) : (
					<ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
				)}
				<Icon className="size-3.5 text-muted-foreground shrink-0" />
				<span className="text-xs font-medium flex-1 text-left">{group.label}</span>
				{allDone ? (
					<Badge variant="success" className="text-[10px] px-1.5 py-0">
						Complete
					</Badge>
				) : (
					<span className="text-xs tabular-nums text-muted-foreground">
						{group.completed}/{group.total}
					</span>
				)}
			</button>

			{open && (
				<div className="px-3 pb-2">
					<div className="flex flex-col">
						{group.items.map((item) => (
							<div
								key={item.name}
								className="flex items-start gap-2 py-1.5 pl-5"
							>
								<StatusIcon status={item.status} />
								<div className="flex-1 min-w-0">
									<span className="text-xs">{item.name}</span>
									<p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
										{item.detail}
									</p>
								</div>
								<HandlerBadge handler={item.handler} />
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// ============================================
// Main component
// ============================================

export function GapAnalysisDisplay({ data }: { data: unknown }) {
	const d = data as GapAnalysisData;
	const pct = d.overall.percentage;

	return (
		<div className="not-prose my-3 rounded-lg border bg-card text-card-foreground overflow-hidden">
			{/* Header */}
			<div className="p-3 border-b bg-neutral-50/50">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h4 className="text-sm font-semibold">{d.candidateName}</h4>
						<p className="text-xs text-muted-foreground mt-0.5">
							{d.roleName} &rarr; {d.facilityName}, {d.targetState}
						</p>
					</div>
					<div className="text-right shrink-0">
						<span className="text-2xl font-semibold tabular-nums">{pct}%</span>
						<p className="text-[11px] text-muted-foreground">
							{d.overall.completed} of {d.overall.total} items
						</p>
					</div>
				</div>

				<div className="mt-2">
					<ProgressBar completed={d.overall.completed} total={d.overall.total} />
				</div>

				{/* Quick stats */}
				<div className="flex gap-4 mt-2.5">
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<CheckCircle2 className="size-3 text-green-600" />
						<span>{d.workerPassportCount} carry forward</span>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Circle className="size-3 text-red-500" />
						<span>{d.newItemCount} new</span>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Clock className="size-3" />
						<span>{d.estimatedTimeToCompliance}</span>
					</div>
				</div>
			</div>

			{/* Groups */}
			<div>
				{d.groups.map((group) => (
					<GroupSection key={group.label} group={group} />
				))}
			</div>

			{/* Recommendation */}
			<div className="p-3 border-t bg-blue-50/50">
				<div className="flex items-start gap-2">
					<Package className="size-3.5 text-blue-600 mt-0.5 shrink-0" />
					<div>
						<p className="text-xs font-medium">
							Recommended: {d.recommendation.faPackageName}
							<span className="text-muted-foreground font-normal ml-1">
								({d.recommendation.faPackageId})
							</span>
						</p>
						<p className="text-[11px] text-muted-foreground mt-0.5">
							{d.recommendation.reason}
						</p>
					</div>
				</div>
			</div>

			{/* Immediate actions & blockers */}
			{(d.immediateActions.length > 0 || d.blockers.length > 0) && (
				<div className="p-3 border-t grid grid-cols-2 gap-3">
					{d.immediateActions.length > 0 && (
						<div>
							<div className="flex items-center gap-1.5 mb-1.5">
								<Zap className="size-3 text-green-600" />
								<span className="text-[11px] font-medium">Start now</span>
							</div>
							<ul className="space-y-1">
								{d.immediateActions.map((action) => (
									<li key={action} className="text-[11px] text-muted-foreground leading-tight">
										{action}
									</li>
								))}
							</ul>
						</div>
					)}
					{d.blockers.length > 0 && (
						<div>
							<div className="flex items-center gap-1.5 mb-1.5">
								<OctagonAlert className="size-3 text-red-500" />
								<span className="text-[11px] font-medium">Blockers</span>
							</div>
							<ul className="space-y-1">
								{d.blockers.map((blocker) => (
									<li key={blocker} className="text-[11px] text-muted-foreground leading-tight">
										{blocker}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
