"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import faIcon from "@/app/FA-icon.png";
import dynamic from "next/dynamic";
import {
	ArrowLeft,
	CheckCircle2,
	Circle,
	AlertTriangle,
	Clock,
	Download,
	Shield,
	MapPin,
	Briefcase,
	Building2,
	ChevronDown,
	ChevronRight,
	FileText,
	Upload,
} from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "@/components/toast";
import { ShareProfileDialog } from "@/components/candidate/share-profile-dialog";
import { useOrg } from "@/lib/org-context";
import {
	ActivityTimeline,
	type TimelineData,
} from "@/components/candidate/activity-timeline";
import { FacilityDetailDialog } from "@/components/facility/facility-detail-dialog";
import { NextActionsSection } from "@/components/placement/next-actions-section";
const DocumentIntelligenceDialog = dynamic(
	() =>
		import("@/components/placement/document-intelligence-dialog").then(
			(mod) => mod.DocumentIntelligenceDialog,
		),
	{ ssr: false },
);

// ============================================
// Types
// ============================================

interface PlacementDetail {
	id: string;
	organisationId: string;
	profileId: string;
	workNodeId: string;
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
	fulfilmentProvider: string;
	status:
		| "met"
		| "expiring"
		| "expired"
		| "pending"
		| "requires_review"
		| "missing";
	carryForward: boolean;
	expiresAt: string | null;
	evidenceId: string | null;
	evidenceStatus: string | null;
	packageSlug: string;
	packageReason: string;
	evidenceSource: string | null;
	evidenceVerificationStatus: string | null;
	evidenceIssuedAt: string | null;
	evidenceVerifiedAt: string | null;
	evidenceFilePath: string | null;
	evidenceFileName: string | null;
	evidenceMimeType: string | null;
	evidenceExtractedData: Record<string, unknown> | null;
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
		fulfilmentProvider: string;
	}>;
}

interface PlacementContext {
	roleSlug: string;
	jurisdiction: string;
	facilityType: string;
	isLapseDeal?: boolean;
}

interface PlacementTask {
	id: string;
	title: string;
	description: string | null;
	priority: "urgent" | "high" | "medium" | "low";
	category: string | null;
	status: "pending" | "in_progress" | "completed" | "dismissed" | "snoozed";
	source: string;
	agentId: string | null;
	executionId: string | null;
	scheduledFor: string | null;
	complianceElementSlugs: string[];
	dueAt: string | null;
	snoozedUntil: string | null;
	createdAt: string;
}

interface AcceptableDocumentInfo {
	id: string;
	name: string;
	documentType: string;
	status: "preferred" | "alternative" | "conditional";
	acceptanceCriteria: string | null;
	clinicianGuidance: string | null;
	priority: number;
}

interface PlacementData {
	placement: PlacementDetail;
	context: PlacementContext;
	facilityDrugTestRequirements?: string[];
	requirementGroups: RequirementGroup[];
	compliance: {
		items: ComplianceItem[];
		summary: ComplianceSummary;
	};
	timeline: {
		activities: Array<{
			id: string;
			summary: string;
			actor: string;
			createdAt: string;
			[key: string]: unknown;
		}>;
		startDate: string;
		endDate: string;
	};
	tasks: PlacementTask[];
	acceptableDocuments?: Record<string, AcceptableDocumentInfo[]>;
	candidateProfile?: {
		address: {
			line1?: string;
			line2?: string;
			city?: string;
			state?: string;
			postcode?: string;
			country?: string;
		} | null;
		sex: "male" | "female" | null;
	} | null;
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
	const hash = name
		.split("")
		.reduce((acc, char) => acc + char.charCodeAt(0), 0);
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

const STATUS_BADGE_VARIANT: Record<
	string,
	"neutral" | "info" | "warning" | "success" | "danger"
> = {
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

const COMPLIANCE_STATUS_VARIANT: Record<
	string,
	"success" | "danger" | "warning" | "neutral"
> = {
	met: "success",
	missing: "warning",
	expired: "danger",
	pending: "warning",
	requires_review: "warning",
	expiring: "warning",
};

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
	document: "Document upload",
	form: "Form completion",
	check: "Background check",
	attestation: "Self-attestation",
	external: "External verification",
};

const SCOPE_LABELS: Record<string, string> = {
	candidate: "Candidate-scoped (portable)",
	placement: "Placement-specific",
};

const EVIDENCE_SOURCE_LABELS: Record<string, string> = {
	user_upload: "Uploaded by candidate",
	cv_extraction: "Extracted from CV",
	document_extraction: "Extracted from document",
	external_check: "External provider",
	ai_extraction: "AI extraction",
	admin_entry: "Entered by admin",
	attestation: "Self-attested",
};

const VERIFICATION_LABELS: Record<string, string> = {
	unverified: "Unverified",
	auto_verified: "Auto-verified",
	human_verified: "Verified by admin",
	external_verified: "Externally verified",
};

function getFulfilmentProviderLabel(
	provider: string,
	candidateLabel: string,
): string {
	const labels: Record<string, string> = {
		candidate: candidateLabel,
		organisation_staff: "Internal team",
		external_provider: "External provider",
		system: "Automated",
		flexible: "Flexible",
	};
	return labels[provider] || provider;
}

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
	if (reason.startsWith("role:"))
		return `Required for ${reason.split(":")[1]} role`;
	if (reason.startsWith("state:")) {
		const state = reason.split(":")[1];
		return `Required in ${state.charAt(0).toUpperCase() + state.slice(1)}`;
	}
	if (reason.startsWith("facility:"))
		return `Required by ${reason.split(":")[1]}`;
	if (reason.includes("lapse-deal"))
		return "Required for lapse deals (OIG/SAM)";
	if (reason.includes("state-mandate")) return "Required by state mandate";
	if (reason.includes("facility-requirement")) return "Required by facility";
	return reason;
}

// ============================================
// Sub-components
// ============================================

function ComplianceStatusIcon({
	status,
}: {
	status: ComplianceItem["status"];
}) {
	switch (status) {
		case "met":
			return (
				<CheckCircle2 className="size-4 text-[var(--positive)] shrink-0" />
			);
		case "pending":
		case "requires_review":
		case "missing":
			return <Circle className="size-4 text-[var(--warning)] shrink-0" />;
		case "expired":
			return <AlertTriangle className="size-4 text-destructive shrink-0" />;
		case "expiring":
			return (
				<AlertTriangle className="size-4 text-[var(--warning)] shrink-0" />
			);
	}
}

const EVIDENCE_TYPE_SHORT: Record<string, string> = {
	document: "Document",
	form: "Form",
	check: "Check",
	attestation: "Attestation",
	external: "External",
};

function ComplianceItemRow({
	item,
	isSelected,
	onSelect,
	candidateLabel,
	evidenceType,
}: {
	item: ComplianceItem;
	isSelected: boolean;
	onSelect: () => void;
	candidateLabel: string;
	evidenceType: string | null;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"w-full flex items-center gap-3 py-2 px-2 border-b border-border/50 last:border-b-0 text-left transition-colors duration-100 cursor-pointer rounded-sm",
				isSelected ? "bg-muted/40" : "hover:bg-muted/40",
			)}
		>
			<ComplianceStatusIcon status={item.status} />
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="text-sm">{item.name}</span>
					{item.faHandled && (
						<Image
							src={faIcon}
							alt="First Advantage"
							className="size-4 shrink-0"
						/>
					)}
					{evidenceType && (
						<span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
							{EVIDENCE_TYPE_SHORT[evidenceType] || evidenceType}
						</span>
					)}
				</div>
				<div className="flex items-center gap-2 mt-0.5">
					<span className="text-[10px] text-muted-foreground">
						{getFulfilmentProviderLabel(
							item.fulfilmentProvider,
							candidateLabel,
						)}
					</span>
					{item.expiresAt && (
						<>
							<span className="text-[10px] text-muted-foreground/40">·</span>
							<span className="text-[10px] text-muted-foreground">
								{item.status === "expired" ? "Expired" : "Expires"}{" "}
								{format(new Date(item.expiresAt), "dd MMM yyyy")}
							</span>
						</>
					)}
				</div>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				{item.carryForward && (
					<span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
						Carry-forward
					</span>
				)}
				<Badge
					variant={COMPLIANCE_STATUS_VARIANT[item.status] || "neutral"}
					className="text-xs font-medium capitalize"
				>
					{item.status === "requires_review" ? "Review" : item.status}
				</Badge>
			</div>
		</button>
	);
}

function RequirementGroupCard({
	group,
	items,
	selectedItemSlug,
	onSelectItem,
	candidateLabel,
}: {
	group: RequirementGroup;
	items: ComplianceItem[];
	selectedItemSlug: string | null;
	onSelectItem: (slug: string) => void;
	candidateLabel: string;
}) {
	const source = getSourceFromReason(group.reason);
	const Icon = SOURCE_ICONS[source] || Shield;
	const met = items.filter((i) => i.status === "met").length;
	const allDone = met === items.length;
	const [open, setOpen] = useState(!allDone);

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
				<Icon
					className="size-4 text-muted-foreground shrink-0"
					aria-hidden="true"
				/>
				<div className="flex-1 text-left">
					<span className="text-sm font-medium">{group.packageName}</span>
					<span className="text-xs text-muted-foreground ml-2">
						{getReasonLabel(group.reason)}
					</span>
				</div>
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
					{items.map((item) => {
						const el = group.elements.find((e) => e.slug === item.slug);
						return (
							<ComplianceItemRow
								key={item.slug}
								item={item}
								isSelected={selectedItemSlug === item.slug}
								onSelect={() => onSelectItem(item.slug)}
								candidateLabel={candidateLabel}
								evidenceType={el?.evidenceType || null}
							/>
						);
					})}
				</div>
			)}
		</Card>
	);
}

type ElementDefinition = RequirementGroup["elements"][number];

const ACCEPTABLE_DOC_STATUS_VARIANT: Record<
	string,
	"success" | "info" | "warning"
> = {
	preferred: "success",
	alternative: "info",
	conditional: "warning",
};

function ComplianceDetailPanel({
	item,
	element,
	candidateLabel,
	acceptableDocs,
	placementId,
	organisationId,
	profileId,
	onVerified,
}: {
	item: ComplianceItem | null;
	element: ElementDefinition | null;
	candidateLabel: string;
	acceptableDocs: AcceptableDocumentInfo[];
	placementId: string;
	organisationId: string;
	profileId: string;
	onVerified?: () => void;
}) {
	const [docDialogOpen, setDocDialogOpen] = useState(false);

	if (!item) {
		return (
			<Card className="shadow-none! bg-card p-4">
				<p className="text-sm text-muted-foreground">
					Select a requirement to view details
				</p>
			</Card>
		);
	}

	const hasEvidence = !!item.evidenceId;

	return (
		<Card className="shadow-none! bg-card p-4 space-y-4">
			{/* Header */}
			<div className="flex items-start justify-between gap-2">
				<h3 className="text-sm font-semibold">{item.name}</h3>
				<Badge
					variant={COMPLIANCE_STATUS_VARIANT[item.status] || "neutral"}
					className="text-xs font-medium capitalize shrink-0"
				>
					{item.status === "requires_review" ? "Review" : item.status}
				</Badge>
			</div>

			{/* Description */}
			{element?.description && (
				<p className="text-sm text-muted-foreground leading-relaxed">
					{element.description}
				</p>
			)}

			{/* Requirement definition */}
			{element && (
				<div className="space-y-2 border-t border-border pt-4">
					<h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
						Requirement
					</h4>
					<DetailRow
						label="Scope"
						value={SCOPE_LABELS[element.scope] || element.scope}
					/>
					<DetailRow
						label="Evidence type"
						value={
							EVIDENCE_TYPE_LABELS[element.evidenceType] || element.evidenceType
						}
					/>
					<DetailRow
						label="Fulfilled by"
						value={getFulfilmentProviderLabel(
							element.fulfilmentProvider,
							candidateLabel,
						)}
					/>
					{item.expiresAt && (
						<DetailRow
							label={item.status === "expired" ? "Expired" : "Expires"}
							value={format(new Date(item.expiresAt), "dd MMM yyyy")}
						/>
					)}
				</div>
			)}

			{/* Evidence */}
			{hasEvidence && (
				<div className="space-y-2 border-t border-border pt-4">
					<h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
						Evidence
					</h4>
					{item.evidenceSource && (
						<DetailRow
							label="Source"
							value={
								EVIDENCE_SOURCE_LABELS[item.evidenceSource] ||
								item.evidenceSource
							}
						/>
					)}
					{item.evidenceVerificationStatus && (
						<DetailRow
							label="Verification"
							value={
								VERIFICATION_LABELS[item.evidenceVerificationStatus] ||
								item.evidenceVerificationStatus
							}
						/>
					)}
					{item.evidenceIssuedAt && (
						<DetailRow
							label="Issued"
							value={format(new Date(item.evidenceIssuedAt), "dd MMM yyyy")}
						/>
					)}
					{item.evidenceVerifiedAt && (
						<DetailRow
							label="Verified"
							value={format(new Date(item.evidenceVerifiedAt), "dd MMM yyyy")}
						/>
					)}
					{/* Acceptable documents */}
					{acceptableDocs.length > 0 && (
						<div className="space-y-2 border-t border-border pt-4">
							<h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
								Acceptable Documents
							</h4>
							<div className="space-y-2">
								{acceptableDocs.map((doc) => (
									<AcceptableDocRow key={doc.id} doc={doc} />
								))}
							</div>
						</div>
					)}

					{item.evidenceFilePath ? (
						<Button
							size="sm"
							className="w-full mt-2"
							onClick={() => setDocDialogOpen(true)}
						>
							<Shield className="size-3.5 mr-1.5" />
							View & Verify
						</Button>
					) : element?.evidenceType === "document" ? (
						<Button
							variant="outline"
							size="sm"
							className="w-full mt-2"
							onClick={() => setDocDialogOpen(true)}
						>
							<Upload className="size-3.5 mr-1.5" />
							Upload & Verify
						</Button>
					) : null}
				</div>
			)}

			{/* Acceptable documents (no evidence yet) */}
			{!hasEvidence && acceptableDocs.length > 0 && (
				<div className="space-y-2 border-t border-border pt-4">
					<h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
						Acceptable Documents
					</h4>
					<div className="space-y-2">
						{acceptableDocs.map((doc) => (
							<AcceptableDocRow key={doc.id} doc={doc} />
						))}
					</div>
				</div>
			)}

			{/* Upload & verify for elements without evidence */}
			{!hasEvidence && element?.evidenceType === "document" && (
				<div className="border-t border-border pt-4">
					<Button
						variant="outline"
						size="sm"
						className="w-full"
						onClick={() => setDocDialogOpen(true)}
					>
						<Upload className="size-3 mr-1.5" />
						Upload & Verify
					</Button>
				</div>
			)}

			{/* Missing item guidance */}
			{!hasEvidence && element && element.evidenceType !== "document" && (
				<div className="rounded-md border border-border bg-muted/30 px-3 py-2">
					<p className="text-xs text-muted-foreground">
						<span className="font-medium text-foreground">Required:</span>{" "}
						{EVIDENCE_TYPE_LABELS[element.evidenceType] || element.evidenceType}{" "}
						needed to fulfil this requirement.
					</p>
				</div>
			)}

			{/* Unified document intelligence dialog */}
			<DocumentIntelligenceDialog
				open={docDialogOpen}
				onOpenChange={setDocDialogOpen}
				placementId={placementId}
				organisationId={organisationId}
				profileId={profileId}
				elementSlug={item.slug}
				elementName={item.name}
				existingFilePath={item.evidenceFilePath}
				existingFileName={item.evidenceFileName}
				existingMimeType={item.evidenceMimeType}
				existingExtractedData={item.evidenceExtractedData}
				onVerified={onVerified}
			/>
		</Card>
	);
}

function AcceptableDocRow({ doc }: { doc: AcceptableDocumentInfo }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="rounded-md border border-border bg-muted/20 overflow-hidden">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors duration-150 cursor-pointer"
			>
				{expanded ? (
					<ChevronDown className="size-3 text-muted-foreground shrink-0" />
				) : (
					<ChevronRight className="size-3 text-muted-foreground shrink-0" />
				)}
				<span className="text-xs flex-1">{doc.name}</span>
				<Badge
					variant={ACCEPTABLE_DOC_STATUS_VARIANT[doc.status] || "neutral"}
					className="text-[10px] font-medium capitalize shrink-0"
				>
					{doc.status}
				</Badge>
			</button>
			{expanded && doc.acceptanceCriteria && (
				<div className="px-3 pb-2 pl-8">
					<p className="text-[10px] text-muted-foreground leading-relaxed">
						{doc.acceptanceCriteria}
					</p>
				</div>
			)}
		</div>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-baseline justify-between gap-2">
			<span className="text-xs text-muted-foreground shrink-0">{label}</span>
			<span className="text-xs text-right">{value}</span>
		</div>
	);
}

function SummaryStatCard({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color?: string;
}) {
	return (
		<div className="flex flex-col items-center gap-1 rounded-lg border bg-card px-4 py-3">
			<span className={cn("text-2xl font-semibold tabular-nums", color)}>
				{value}
			</span>
			<span className="text-xs text-muted-foreground">{label}</span>
		</div>
	);
}

function DownloadPDFButton({
	profileId,
	organisationId,
}: {
	profileId: string;
	organisationId: string;
}) {
	const [loading, setLoading] = useState(false);

	const handleDownload = async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/profiles/${profileId}/share-link`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ttlHours: 1, organisationId }),
			});
			if (!res.ok) throw new Error("Failed to create share link");
			const { link } = await res.json();
			window.open(`${link.url}?print=true`, "_blank");
		} catch {
			toast({ type: "error", description: "Failed to generate PDF" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			className="gap-1.5"
			onClick={handleDownload}
			disabled={loading}
		>
			<Download className="h-3.5 w-3.5" />
			{loading ? "Generating\u2026" : "Download PDF"}
		</Button>
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
	const { selectedOrg } = useOrg();
	const candidateLabel =
		selectedOrg?.settings?.terminology?.candidate || "Candidate";
	const [data, setData] = useState<PlacementData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refreshData = useCallback(async () => {
		try {
			const res = await fetch(`/api/placements/${params.id}`);
			if (!res.ok) return;
			const json = await res.json();
			setData(json);
		} catch (err) {
			console.error("Failed to refresh placement:", err);
		}
	}, [params.id]);

	useEffect(() => {
		async function fetchData() {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(`/api/placements/${params.id}`);
				if (!res.ok) {
					setError(
						res.status === 404
							? "Placement not found"
							: "Failed to load placement",
					);
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

	const parsedTimeline = useMemo(() => {
		if (!data) return null;
		return {
			activities: data.timeline.activities.map((a) => ({
				...a,
				createdAt: new Date(a.createdAt),
			})),
			startDate: new Date(data.timeline.startDate),
			endDate: new Date(data.timeline.endDate),
		};
	}, [data]);

	// Element definition lookup by slug (from requirementGroups)
	const elementLookup = useMemo(() => {
		if (!data) return new Map<string, ElementDefinition>();
		const map = new Map<string, ElementDefinition>();
		for (const group of data.requirementGroups) {
			for (const el of group.elements) {
				if (!map.has(el.slug)) map.set(el.slug, el);
			}
		}
		return map;
	}, [data]);

	// Selection state
	const [selectedItemSlug, setSelectedItemSlug] = useState<string | null>(null);

	// Auto-select first incomplete item when data loads
	useEffect(() => {
		if (!data || selectedItemSlug) return;
		const firstIncomplete = data.compliance.items.find(
			(i) => i.status !== "met",
		);
		setSelectedItemSlug(
			firstIncomplete?.slug ?? data.compliance.items[0]?.slug ?? null,
		);
	}, [data, selectedItemSlug]);

	const selectedItem = useMemo(() => {
		if (!data || !selectedItemSlug) return null;
		return (
			data.compliance.items.find((i) => i.slug === selectedItemSlug) ?? null
		);
	}, [data, selectedItemSlug]);

	const selectedElement = useMemo(() => {
		if (!selectedItemSlug) return null;
		return elementLookup.get(selectedItemSlug) ?? null;
	}, [selectedItemSlug, elementLookup]);

	if (loading) return <DetailSkeleton />;

	if (error || !data) {
		return (
			<div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-background p-8">
				<p className="text-sm text-muted-foreground">
					{error || "Placement not found"}
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => router.push("/placements")}
				>
					← Back to Placements
				</Button>
			</div>
		);
	}

	const { placement, compliance } = data;
	const { summary } = compliance;
	const carryForwardCount = compliance.items.filter(
		(i) => i.carryForward,
	).length;

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
						<AvatarFallback
							className={cn(
								getAvatarColor(placement.candidateName),
								"text-sm text-white",
							)}
						>
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
							<FacilityDetailDialog
								workNodeId={placement.workNodeId}
								facilityName={placement.facilityName}
								jurisdiction={placement.jurisdiction}
								currentPlacementId={placement.id}
							/>
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
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							Start date:{" "}
							{placement.startDate
								? format(new Date(placement.startDate), "dd MMM yyyy")
								: "TBC"}
						</p>
					</div>
				</div>

				{/* Actions + compliance */}
				<div className="flex items-center gap-4 shrink-0">
					<div className="flex items-center gap-2">
						<ShareProfileDialog
							profileId={placement.profileId}
							organisationId={placement.organisationId}
						/>
						<DownloadPDFButton
							profileId={placement.profileId}
							organisationId={placement.organisationId}
						/>
					</div>
					<div className="text-right">
						<span
							className={cn(
								"text-4xl font-semibold tabular-nums",
								summary.percentage >= 80
									? "text-[var(--positive)]"
									: summary.percentage >= 50
										? "text-[var(--warning)]"
										: "text-destructive",
							)}
						>
							{summary.percentage}%
						</span>
						<p className="text-xs text-muted-foreground mt-1">
							{summary.met} of {summary.total} items met
						</p>
					</div>
				</div>
			</div>

			{/* Summary stats */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
				<SummaryStatCard label="Total" value={summary.total} />
				<SummaryStatCard
					label="Met"
					value={summary.met}
					color="text-[var(--positive)]"
				/>
				<SummaryStatCard
					label="Missing"
					value={summary.missing}
					color="text-destructive"
				/>
				<SummaryStatCard
					label="Pending"
					value={summary.pending}
					color="text-[var(--warning)]"
				/>
				<SummaryStatCard
					label="FA Items"
					value={summary.faItemsMet}
					color={
						summary.faItemsMet === summary.faItemsTotal
							? "text-[var(--positive)]"
							: undefined
					}
				/>
				<SummaryStatCard label="Carry Forward" value={carryForwardCount} />
			</div>

			{/* Activity timeline */}
			{parsedTimeline && parsedTimeline.activities.length > 0 && (
				<ActivityTimeline
					data={parsedTimeline as TimelineData}
					profileId={placement.profileId}
					showViewAllLink={false}
				/>
			)}

			{/* Next Actions */}
			<NextActionsSection
				tasks={data.tasks}
				screeningItems={data.compliance.items.filter((i) => i.faHandled)}
				placement={{
					id: placement.id,
					candidateName: placement.candidateName,
					facilityName: placement.facilityName,
					dealType: placement.dealType,
				}}
				context={data.context}
				candidateAddress={data.candidateProfile?.address ?? null}
				facilityDrugTestRequirements={data.facilityDrugTestRequirements ?? []}
				onRefresh={refreshData}
			/>

			{/* Compliance requirements — list-detail layout */}
			<div className="space-y-4">
				<h2 className="text-xl font-semibold text-foreground">
					Compliance Requirements
				</h2>
				<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
					{/* Left: requirement groups list */}
					<div className="space-y-3">
						{data.requirementGroups.map((group) => {
							const items = groupedItems.get(group.packageSlug) || [];
							if (items.length === 0) return null;
							return (
								<RequirementGroupCard
									key={group.packageSlug}
									group={group}
									items={items}
									selectedItemSlug={selectedItemSlug}
									onSelectItem={setSelectedItemSlug}
									candidateLabel={candidateLabel}
								/>
							);
						})}
					</div>

					{/* Right: detail panel (sticky) */}
					<div className="hidden lg:block sticky top-4 self-start">
						<ComplianceDetailPanel
							item={selectedItem}
							element={selectedElement}
							candidateLabel={candidateLabel}
							acceptableDocs={
								selectedItemSlug && data.acceptableDocuments?.[selectedItemSlug]
									? data.acceptableDocuments[selectedItemSlug]
									: []
							}
							placementId={placement.id}
							organisationId={placement.organisationId}
							profileId={placement.profileId}
							onVerified={refreshData}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
