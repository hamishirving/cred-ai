"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/toast";
import {
	ArrowLeft,
	CheckCircle2,
	Circle,
	AlertTriangle,
	Clock,
	Shield,
	MapPin,
	Briefcase,
	Building2,
	ChevronDown,
	ChevronRight,
	RefreshCw,
	ArrowUpRight,
} from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

interface PlacementDetail {
	id: string;
	organisationId: string;
	profileId: string;
	candidateName: string;
	candidateEmail: string;
	roleName: string;
	roleSlug: string;
	facilityName: string;
	facilityType: string;
	jurisdiction: string | null;
	startDate: string | null;
	endDate: string | null;
	status: string;
	compliancePercentage: number;
	isCompliant: boolean;
	dealType: string | null;
	notes: string | null;
}

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

interface RequirementGroup {
	packageSlug: string;
	packageName: string;
	reason: string;
	elements: Array<{
		slug: string;
		name: string;
		description: string | null;
		category: string | null;
		scope: string;
		evidenceType: string;
		expiryDays: number | null;
		expiryWarningDays: number | null;
		faHandled: boolean;
	}>;
}

interface PlacementContext {
	roleSlug: string;
	jurisdiction: string;
	facilityType: string;
	isLapseDeal?: boolean;
}

interface PlacementData {
	placement: PlacementDetail;
	context: PlacementContext;
	requirementGroups: RequirementGroup[];
	compliance: {
		items: ComplianceItem[];
		summary: ComplianceSummary;
	};
}

// ============================================
// Helpers
// ============================================

const avatarColors = [
	"bg-primary",
	"bg-chart-2",
	"bg-chart-3",
	"bg-destructive",
	"bg-muted-foreground",
	"bg-chart-5",
];

function getAvatarColor(name: string): string {
	const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return avatarColors[hash % avatarColors.length];
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

const STATUS_BADGE_VARIANT: Record<string, "neutral" | "info" | "warning" | "success" | "danger"> = {
	pending: "neutral",
	onboarding: "info",
	compliance: "warning",
	ready: "success",
	active: "success",
	completed: "neutral",
	cancelled: "danger",
};

const DEAL_TYPE_LABELS: Record<string, string> = {
	standard: "Standard",
	lapse: "Lapse Deal",
	reassignment: "Reassignment",
};

const COMPLIANCE_STATUS_VARIANT: Record<string, "success" | "danger" | "warning" | "neutral"> = {
	met: "success",
	missing: "danger",
	expired: "danger",
	pending: "warning",
	requires_review: "warning",
	expiring: "warning",
};

const SOURCE_ICONS: Record<string, typeof Shield> = {
	federal: Shield,
	state: MapPin,
	role: Briefcase,
	facility: Building2,
};

function getSourceFromReason(reason: string): string {
	if (reason.startsWith("role:")) return "role";
	if (reason.startsWith("state:")) return "state";
	if (reason.startsWith("facility:")) return "facility";
	if (reason.startsWith("conditional:")) return "federal";
	return "federal";
}

function getReasonLabel(reason: string): string {
	if (reason.startsWith("role:")) return `Required for ${reason.split(":")[1]} role`;
	if (reason.startsWith("state:")) {
		const state = reason.split(":")[1];
		return `Required in ${state.charAt(0).toUpperCase() + state.slice(1)}`;
	}
	if (reason.startsWith("facility:")) return `Required by ${reason.split(":")[1]}`;
	if (reason.includes("lapse-deal")) return "Required for lapse deals (OIG/SAM)";
	if (reason.includes("state-mandate")) return "Required by state mandate";
	if (reason.includes("facility-requirement")) return "Required by facility";
	return reason;
}

// ============================================
// Sub-components
// ============================================

function ComplianceStatusIcon({ status }: { status: ComplianceItem["status"] }) {
	switch (status) {
		case "met":
			return <CheckCircle2 className="size-4 text-[var(--positive)] shrink-0" />;
		case "missing":
			return <Circle className="size-4 text-destructive shrink-0" />;
		case "expired":
			return <AlertTriangle className="size-4 text-destructive shrink-0" />;
		case "pending":
		case "requires_review":
			return <Clock className="size-4 text-[var(--warning)] shrink-0" />;
		case "expiring":
			return <AlertTriangle className="size-4 text-[var(--warning)] shrink-0" />;
	}
}

function ComplianceItemRow({ item }: { item: ComplianceItem }) {
	return (
		<div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-b-0">
			<ComplianceStatusIcon status={item.status} />
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="text-sm">{item.name}</span>
					{item.faHandled && (
						<Badge variant="info" className="text-[10px] px-1.5 py-0 leading-tight shrink-0 rounded-full">
							FA
						</Badge>
					)}
					{item.carryForward && (
						<span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0 rounded-full shrink-0">
							Carry-forward
						</span>
					)}
				</div>
				{item.expiresAt && (
					<p className="text-xs text-muted-foreground mt-0.5">
						{item.status === "expired" ? "Expired" : "Expires"}{" "}
						{format(new Date(item.expiresAt), "dd MMM yyyy")}
					</p>
				)}
			</div>
			<Badge
				variant={COMPLIANCE_STATUS_VARIANT[item.status] || "neutral"}
				className="text-xs font-medium capitalize shrink-0"
			>
				{item.status === "requires_review" ? "Review" : item.status}
			</Badge>
		</div>
	);
}

function RequirementGroupCard({
	group,
	items,
}: {
	group: RequirementGroup;
	items: ComplianceItem[];
}) {
	const [open, setOpen] = useState(true);
	const source = getSourceFromReason(group.reason);
	const Icon = SOURCE_ICONS[source] || Shield;
	const met = items.filter((i) => i.status === "met").length;
	const allDone = met === items.length;

	return (
		<Card className="shadow-none! bg-card overflow-hidden">
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
				<Icon className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
				<div className="flex-1 text-left">
					<span className="text-sm font-medium">{group.packageName}</span>
					<span className="text-xs text-muted-foreground ml-2">
						{getReasonLabel(group.reason)}
					</span>
				</div>
				{allDone ? (
					<Badge variant="success" className="text-xs">Complete</Badge>
				) : (
					<span className="text-xs tabular-nums text-muted-foreground">
						{met}/{items.length}
					</span>
				)}
			</button>

			{open && (
				<div className="px-4 pb-3 pl-12">
					{items.map((item) => (
						<ComplianceItemRow key={item.slug} item={item} />
					))}
				</div>
			)}
		</Card>
	);
}

function SummaryStatCard({ label, value, color }: { label: string; value: number; color?: string }) {
	return (
		<div className="flex flex-col items-center gap-1 rounded-lg border bg-card px-4 py-3">
			<span className={cn("text-2xl font-semibold tabular-nums", color)}>{value}</span>
			<span className="text-xs text-muted-foreground">{label}</span>
		</div>
	);
}

function DetailSkeleton() {
	return (
		<div className="flex min-h-full flex-1 flex-col gap-8 bg-background p-8">
			<Skeleton className="h-5 w-[140px]" />
			<div className="flex items-center gap-4">
				<Skeleton className="h-12 w-12 rounded-full" />
				<div className="space-y-2">
					<Skeleton className="h-8 w-[250px]" />
					<Skeleton className="h-4 w-[300px]" />
				</div>
			</div>
			<div className="grid grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-20 rounded-lg" />
				))}
			</div>
			<div className="space-y-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-40 rounded-lg" />
				))}
			</div>
		</div>
	);
}

// ============================================
// Main Page
// ============================================

export default function PlacementDetailPage() {
	const params = useParams();
	const router = useRouter();
	const [data, setData] = useState<PlacementData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [screeningInProgress, setScreeningInProgress] = useState(false);
	const [submittingScreening, setSubmittingScreening] = useState(false);

	useEffect(() => {
		async function fetchData() {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(`/api/placements/${params.id}`);
				if (!res.ok) {
					setError(res.status === 404 ? "Placement not found" : "Failed to load placement");
					return;
				}
				const json = await res.json();
				setData(json);
			} catch (err) {
				console.error("Failed to fetch placement:", err);
				setError("Failed to load placement");
			} finally {
				setLoading(false);
			}
		}
		fetchData();
	}, [params.id]);

	// Group compliance items by packageSlug
	const groupedItems = useMemo(() => {
		if (!data) return new Map<string, ComplianceItem[]>();
		const map = new Map<string, ComplianceItem[]>();
		for (const item of data.compliance.items) {
			const existing = map.get(item.packageSlug) || [];
			existing.push(item);
			map.set(item.packageSlug, existing);
		}
		return map;
	}, [data]);

	const missingFaItems = useMemo(() => {
		if (!data) return 0;
		return data.compliance.items.filter(
			(i) => i.faHandled && (i.status === "missing" || i.status === "expired"),
		).length;
	}, [data]);

	async function handleInitiateScreening() {
		if (!data) return;
		setSubmittingScreening(true);
		setScreeningInProgress(false);

		try {
			const { placement, context } = data;

			const response = await fetch("/api/agents/background-screening/execute", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					candidateSearch: placement.candidateName,
					targetState: context.jurisdiction,
					facilityName: placement.facilityName,
					dealType: placement.dealType || "standard",
				}),
			});

			if (!response.ok || !response.body) {
				toast({ type: "error", description: "Failed to initiate screening" });
				return;
			}

			// Listen for execution ID from SSE stream
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let gotExecutionId = false;

			const processStream = async () => {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (line.startsWith("data: ")) {
							try {
								const eventData = JSON.parse(line.slice(6));
								if (eventData.executionId) {
									gotExecutionId = true;
									setScreeningInProgress(true);
									const execId = eventData.executionId;
									toast({
										type: "success",
										description: "FA screening initiated",
										action: {
											label: "View →",
											onClick: () => router.push(`/agents/background-screening/executions/${execId}`),
										},
									});
									reader.cancel();
									return;
								}
							} catch {
								// Skip malformed events
							}
						}
					}
				}
			};

			await processStream();

			if (!gotExecutionId) {
				toast({ type: "error", description: "Screening failed to start" });
			}
		} catch (err) {
			console.error("Failed to initiate screening:", err);
			toast({ type: "error", description: "Failed to initiate screening" });
		} finally {
			setSubmittingScreening(false);
		}
	}

	if (loading) return <DetailSkeleton />;

	if (error || !data) {
		return (
			<div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-background p-8">
				<p className="text-sm text-muted-foreground">{error || "Placement not found"}</p>
				<Button variant="outline" size="sm" onClick={() => router.push("/placements")}>
					← Back to Placements
				</Button>
			</div>
		);
	}

	const { placement, compliance } = data;
	const { summary } = compliance;
	const carryForwardCount = compliance.items.filter((i) => i.carryForward).length;

	return (
		<div className="flex min-h-full flex-1 flex-col gap-8 bg-background p-8">
			{/* Back link */}
			<Link
				href="/placements"
				className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
			>
				<ArrowLeft className="size-3.5" />
				Back to Placements
			</Link>

			{/* Header */}
			<div className="flex items-start justify-between gap-6">
				<div className="flex items-start gap-4">
					<Avatar className="h-12 w-12">
						<AvatarFallback className={cn(getAvatarColor(placement.candidateName), "text-sm text-white")}>
							{getInitials(placement.candidateName)}
						</AvatarFallback>
					</Avatar>
					<div>
						<h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">
							{placement.candidateName}
						</h1>
						<div className="mt-2 flex items-center gap-3 flex-wrap">
							<Badge variant="info" className="text-xs font-medium">
								{placement.roleName}
							</Badge>
							<span className="text-sm text-muted-foreground">
								{placement.facilityName}
								{placement.jurisdiction && (
									<span className="capitalize">, {placement.jurisdiction}</span>
								)}
							</span>
							<Badge
								variant={STATUS_BADGE_VARIANT[placement.status] || "neutral"}
								className="text-xs font-medium capitalize"
							>
								{placement.status}
							</Badge>
							{placement.dealType && (
								<span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
									{DEAL_TYPE_LABELS[placement.dealType] || placement.dealType}
								</span>
							)}
							{screeningInProgress && (
								<Badge variant="info" className="text-xs font-medium">
									<RefreshCw className="size-3 mr-1 animate-spin" />
									Screening in progress
								</Badge>
							)}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							Start date:{" "}
							{placement.startDate
								? format(new Date(placement.startDate), "dd MMM yyyy")
								: "TBC"}
						</p>
					</div>
				</div>

				{/* Overall compliance */}
				<div className="text-right shrink-0">
					<span
						className={cn(
							"text-4xl font-semibold tabular-nums",
							summary.percentage >= 80 ? "text-[var(--positive)]" :
							summary.percentage >= 50 ? "text-[var(--warning)]" :
							"text-destructive",
						)}
					>
						{summary.percentage}%
					</span>
					<p className="text-xs text-muted-foreground mt-1">
						{summary.met} of {summary.total} items met
					</p>
				</div>
			</div>

			{/* Summary stats */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
				<SummaryStatCard label="Total" value={summary.total} />
				<SummaryStatCard label="Met" value={summary.met} color="text-[var(--positive)]" />
				<SummaryStatCard label="Missing" value={summary.missing} color="text-destructive" />
				<SummaryStatCard label="Pending" value={summary.pending} color="text-[var(--warning)]" />
				<SummaryStatCard
					label="FA Items"
					value={summary.faItemsMet}
					color={summary.faItemsMet === summary.faItemsTotal ? "text-[var(--positive)]" : undefined}
				/>
				<SummaryStatCard label="Carry Forward" value={carryForwardCount} />
			</div>

			{/* Send to FA action */}
			{missingFaItems > 0 && (
				<Card className="shadow-none! bg-card flex items-center justify-between px-4 py-3">
					<div>
						<p className="text-sm font-medium">
							{missingFaItems} missing item{missingFaItems !== 1 ? "s" : ""} handled by First Advantage
						</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							Initiate background screening to resolve these items
						</p>
					</div>
					<Button
						onClick={handleInitiateScreening}
						disabled={submittingScreening || screeningInProgress}
						variant={screeningInProgress ? "outline" : "default"}
						className="shrink-0"
					>
						{submittingScreening ? (
							<>
								<RefreshCw className="size-3.5 mr-2 animate-spin" />
								Starting…
							</>
						) : screeningInProgress ? (
							<>
								<RefreshCw className="size-3.5 mr-2 animate-spin" />
								Screening in progress
							</>
						) : (
							<>
								Initiate FA Screening
								<ArrowUpRight className="size-3.5 ml-2" />
							</>
						)}
					</Button>
				</Card>
			)}

			{/* Compliance groups */}
			<div className="space-y-4">
				<h2 className="text-xl font-semibold text-foreground">Compliance Requirements</h2>
				{data.requirementGroups.map((group) => {
					const items = groupedItems.get(group.packageSlug) || [];
					if (items.length === 0) return null;
					return (
						<RequirementGroupCard
							key={group.packageSlug}
							group={group}
							items={items}
						/>
					);
				})}
			</div>
		</div>
	);
}
