/**
 * Placement Requirements Engine
 *
 * Resolves the full set of compliance requirements for a placement by walking
 * the package hierarchy: federal -> state -> role -> facility + conditional OIG/SAM.
 *
 * Then checks a candidate's evidence against those requirements, with
 * carry-forward tagging for items that transfer between assignments.
 */

import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
	complianceElements,
	compliancePackages,
	evidence,
} from "@/lib/db/schema";
import {
	usRolePackages,
	usStatePackages,
	usFacilityPackages,
	usPackageContents,
	faHandledElements,
} from "@/lib/db/seed/markets/us";

// ============================================
// Types
// ============================================

export interface PlacementContext {
	/** Role slug (e.g. "travel-rn", "travel-icu-rn") */
	roleSlug: string;
	/** Jurisdiction/state (e.g. "florida", "california") */
	jurisdiction: string;
	/** Facility type (e.g. "hospital") — derived from work node type */
	facilityType: string;
	/** Whether this is a lapse deal (inactive > 90 days) */
	isLapseDeal?: boolean;
	/** Whether the state requires statewide OIG/SAM */
	stateRequiresOigSam?: boolean;
	/** Whether the facility requires OIG/SAM */
	facilityRequiresOigSam?: boolean;
}

export interface ResolvedElement {
	/** Element slug */
	slug: string;
	/** Display name */
	name: string;
	/** Description */
	description: string | null;
	/** Category (identity, professional, training, health, orientation) */
	category: string | null;
	/** Scope (candidate or placement) */
	scope: string;
	/** Evidence type expected */
	evidenceType: string;
	/** Expiry period in days */
	expiryDays: number | null;
	/** Warning days before expiry */
	expiryWarningDays: number | null;
	/** Whether First Advantage handles this element */
	faHandled: boolean;
}

export interface RequirementGroup {
	/** Package slug this group came from */
	packageSlug: string;
	/** Package display name */
	packageName: string;
	/** Why this package was included (e.g. "role:travel-rn", "state:florida") */
	reason: string;
	/** Elements in this group */
	elements: ResolvedElement[];
}

export interface PlacementComplianceItem {
	/** Element slug */
	slug: string;
	/** Display name */
	name: string;
	/** Category */
	category: string | null;
	/** Whether First Advantage handles this */
	faHandled: boolean;
	/** Current status */
	status: "met" | "expiring" | "expired" | "pending" | "requires_review" | "missing";
	/** Whether this evidence carries forward from a previous assignment */
	carryForward: boolean;
	/** Expiry date if applicable */
	expiresAt: Date | null;
	/** Evidence ID if evidence exists */
	evidenceId: string | null;
	/** Evidence status from DB */
	evidenceStatus: string | null;
	/** Which package requires this */
	packageSlug: string;
	/** Reason the package was included */
	packageReason: string;
	/** How the evidence was obtained */
	evidenceSource: string | null;
	/** Verification level of the evidence */
	evidenceVerificationStatus: string | null;
	/** When the evidence was issued */
	evidenceIssuedAt: Date | null;
	/** When the evidence was verified */
	evidenceVerifiedAt: Date | null;
}

// ============================================
// Constants
// ============================================

/** States that require OIG/SAM checks for all placements */
const STATES_REQUIRING_OIG_SAM = new Set<string>([
	// Currently none — this is a per-deal decision in most states.
	// The set exists for future expansion.
]);

// ============================================
// OIG/SAM conditional logic
// ============================================

function requiresOigSam(context: PlacementContext): boolean {
	// Lapse deals always require OIG/SAM (tier-2 trigger)
	if (context.isLapseDeal) return true;

	// State-level mandate
	if (STATES_REQUIRING_OIG_SAM.has(context.jurisdiction)) return true;

	// Explicit state or facility flag
	if (context.stateRequiresOigSam) return true;
	if (context.facilityRequiresOigSam) return true;

	return false;
}

// ============================================
// Resolve Requirements
// ============================================

/**
 * Resolve all compliance requirements for a placement context.
 *
 * Walks the package hierarchy:
 * 1. Role packages (federal core + role-specific)
 * 2. State/jurisdiction package
 * 3. Facility package
 * 4. Conditional: exclusion checks (OIG/SAM) if required
 *
 * Returns grouped requirements with FA-handled tagging.
 */
export async function resolvePlacementRequirements(
	organisationId: string,
	context: PlacementContext,
): Promise<RequirementGroup[]> {
	const groups: RequirementGroup[] = [];
	const seenSlugs = new Set<string>();

	// Helper: resolve a package slug into its elements
	const resolvePackage = async (
		packageSlug: string,
		reason: string,
	): Promise<RequirementGroup | null> => {
		// Look up the package in the DB
		const [pkg] = await db
			.select()
			.from(compliancePackages)
			.where(
				and(
					eq(compliancePackages.organisationId, organisationId),
					eq(compliancePackages.slug, packageSlug),
				),
			)
			.limit(1);

		if (!pkg) return null;

		// Get element slugs from the static mapping
		const elementSlugs = usPackageContents[packageSlug] || [];
		if (elementSlugs.length === 0) return null;

		// Filter to jurisdiction-appropriate elements and deduplicate
		const newSlugs = elementSlugs.filter((s) => !seenSlugs.has(s));
		if (newSlugs.length === 0) return null;

		// Look up element definitions from DB
		const elements = await db
			.select()
			.from(complianceElements)
			.where(
				and(
					eq(complianceElements.organisationId, organisationId),
					inArray(complianceElements.slug, newSlugs),
				),
			);

		// Filter by jurisdiction applicability
		const applicableElements = elements.filter((el) => {
			// If element has onlyJurisdictions, check if current jurisdiction matches
			if (el.onlyJurisdictions && el.onlyJurisdictions.length > 0) {
				return el.onlyJurisdictions.includes(context.jurisdiction);
			}
			// If element has excludeJurisdictions, check if current jurisdiction is excluded
			if (el.excludeJurisdictions && el.excludeJurisdictions.length > 0) {
				return !el.excludeJurisdictions.includes(context.jurisdiction);
			}
			return true;
		});

		if (applicableElements.length === 0) return null;

		const resolved: ResolvedElement[] = applicableElements.map((el) => {
			seenSlugs.add(el.slug);
			return {
				slug: el.slug,
				name: el.name,
				description: el.description,
				category: el.category,
				scope: el.scope,
				evidenceType: el.evidenceType,
				expiryDays: el.expiryDays,
				expiryWarningDays: el.expiryWarningDays,
				faHandled: faHandledElements.has(el.slug),
			};
		});

		return {
			packageSlug,
			packageName: pkg.name,
			reason,
			elements: resolved,
		};
	};

	// 1. Role packages (federal core + role-specific + specialty)
	const rolePackageSlugs = usRolePackages[context.roleSlug] || [];
	for (const pkgSlug of rolePackageSlugs) {
		const group = await resolvePackage(pkgSlug, `role:${context.roleSlug}`);
		if (group) groups.push(group);
	}

	// 2. State/jurisdiction package
	const statePackageSlug = usStatePackages[context.jurisdiction];
	if (statePackageSlug) {
		const group = await resolvePackage(statePackageSlug, `state:${context.jurisdiction}`);
		if (group) groups.push(group);
	}

	// 3. Facility package
	const facilityPackageSlug = usFacilityPackages[context.facilityType];
	if (facilityPackageSlug) {
		const group = await resolvePackage(facilityPackageSlug, `facility:${context.facilityType}`);
		if (group) groups.push(group);
	}

	// 4. Conditional: OIG/SAM exclusion checks
	if (requiresOigSam(context)) {
		const reason = context.isLapseDeal
			? "conditional:lapse-deal"
			: context.stateRequiresOigSam
				? `conditional:state-mandate:${context.jurisdiction}`
				: "conditional:facility-requirement";
		const group = await resolvePackage("exclusion-checks-package", reason);
		if (group) groups.push(group);
	}

	return groups;
}

// ============================================
// Check Placement Compliance
// ============================================

/** Evidence status priority: higher = better */
const STATUS_PRIORITY: Record<string, number> = {
	approved: 5,
	requires_review: 4,
	pending: 3,
	processing: 2,
	expired: 1,
	rejected: 0,
};

/**
 * Check a candidate's compliance against resolved placement requirements.
 *
 * For each required element, finds the best evidence record and determines
 * status. Tags items that carry forward from previous assignments.
 */
export async function checkPlacementCompliance(
	organisationId: string,
	profileId: string,
	context: PlacementContext,
): Promise<{
	items: PlacementComplianceItem[];
	summary: {
		total: number;
		met: number;
		expiring: number;
		pending: number;
		missing: number;
		percentage: number;
		faItemsTotal: number;
		faItemsMet: number;
		faItemsPending: number;
	};
}> {
	// 1. Resolve requirements
	const groups = await resolvePlacementRequirements(organisationId, context);

	// 2. Collect all required element slugs
	const allElements: Array<{
		element: ResolvedElement;
		packageSlug: string;
		packageReason: string;
	}> = [];
	for (const group of groups) {
		for (const el of group.elements) {
			allElements.push({
				element: el,
				packageSlug: group.packageSlug,
				packageReason: group.reason,
			});
		}
	}

	if (allElements.length === 0) {
		return {
			items: [],
			summary: {
				total: 0,
				met: 0,
				expiring: 0,
				pending: 0,
				missing: 0,
				percentage: 100,
				faItemsTotal: 0,
				faItemsMet: 0,
				faItemsPending: 0,
			},
		};
	}

	// 3. Fetch all evidence for this profile in one query
	const slugs = allElements.map((e) => e.element.slug);
	const elementRows = await db
		.select()
		.from(complianceElements)
		.where(
			and(
				eq(complianceElements.organisationId, organisationId),
				inArray(complianceElements.slug, slugs),
			),
		);
	const elementIdMap = new Map(elementRows.map((e) => [e.slug, e.id]));

	const elementIds = [...elementIdMap.values()];
	const evidenceRows =
		elementIds.length > 0
			? await db
					.select()
					.from(evidence)
					.where(
						and(
							eq(evidence.organisationId, organisationId),
							eq(evidence.profileId, profileId),
							inArray(evidence.complianceElementId, elementIds),
						),
					)
				: [];

	// Index evidence by element ID, keeping the best one per element
	const bestEvidence = new Map<
		string,
		typeof evidenceRows[number]
	>();
	for (const ev of evidenceRows) {
		const existing = bestEvidence.get(ev.complianceElementId);
		if (!existing) {
			bestEvidence.set(ev.complianceElementId, ev);
			continue;
		}
		// Prefer higher status priority, then latest expiry
		const existingPriority = STATUS_PRIORITY[existing.status] ?? -1;
		const newPriority = STATUS_PRIORITY[ev.status] ?? -1;
		if (newPriority > existingPriority) {
			bestEvidence.set(ev.complianceElementId, ev);
		} else if (
			newPriority === existingPriority &&
			ev.expiresAt &&
			existing.expiresAt &&
			ev.expiresAt > existing.expiresAt
		) {
			bestEvidence.set(ev.complianceElementId, ev);
		}
	}

	// 4. Build compliance items
	const now = new Date();
	const items: PlacementComplianceItem[] = allElements.map(
		({ element, packageSlug, packageReason }) => {
			const elementId = elementIdMap.get(element.slug);
			const ev = elementId ? bestEvidence.get(elementId) : undefined;

			if (!ev) {
				return {
					slug: element.slug,
					name: element.name,
					category: element.category,
					faHandled: element.faHandled,
					status: "missing" as const,
					carryForward: false,
					expiresAt: null,
					evidenceId: null,
					evidenceStatus: null,
					packageSlug,
					packageReason,
					evidenceSource: null,
					evidenceVerificationStatus: null,
					evidenceIssuedAt: null,
					evidenceVerifiedAt: null,
				};
			}

			// Determine carry-forward: candidate-scoped items with approved evidence
			// that were created before any current placement are carry-forward
			const isCarryForward =
				element.scope === "candidate" && ev.status === "approved";

			// Determine effective status
			let status: PlacementComplianceItem["status"];
			if (ev.status === "approved") {
				if (ev.expiresAt && ev.expiresAt <= now) {
					status = "expired";
				} else if (
					ev.expiresAt &&
					element.expiryWarningDays &&
					ev.expiresAt.getTime() - now.getTime() <=
						element.expiryWarningDays * 24 * 60 * 60 * 1000
				) {
					status = "expiring";
				} else {
					status = "met";
				}
			} else if (ev.status === "expired") {
				status = "expired";
			} else if (ev.status === "requires_review") {
				status = "requires_review";
			} else if (ev.status === "pending" || ev.status === "processing") {
				status = "pending";
			} else {
				// rejected or unknown
				status = "missing";
			}

			return {
				slug: element.slug,
				name: element.name,
				category: element.category,
				faHandled: element.faHandled,
				status,
				carryForward: isCarryForward && status === "met",
				expiresAt: ev.expiresAt,
				evidenceId: ev.id,
				evidenceStatus: ev.status,
				packageSlug,
				packageReason,
				evidenceSource: ev.source,
				evidenceVerificationStatus: ev.verificationStatus,
				evidenceIssuedAt: ev.issuedAt,
				evidenceVerifiedAt: ev.verifiedAt,
			};
		},
	);

	// 5. Build summary
	const met = items.filter((i) => i.status === "met").length;
	const expiring = items.filter((i) => i.status === "expiring").length;
	const pending = items.filter(
		(i) => i.status === "pending" || i.status === "requires_review",
	).length;
	const missing = items.filter(
		(i) => i.status === "missing" || i.status === "expired",
	).length;
	const faItems = items.filter((i) => i.faHandled);
	const faItemsMet = faItems.filter((i) => i.status === "met").length;
	const faItemsPending = faItems.filter(
		(i) =>
			i.status === "pending" ||
			i.status === "requires_review" ||
			i.status === "missing" ||
			i.status === "expired",
	).length;

	return {
		items,
		summary: {
			total: items.length,
			met,
			expiring,
			pending,
			missing,
			percentage: items.length > 0 ? Math.round((met / items.length) * 100) : 100,
			faItemsTotal: faItems.length,
			faItemsMet,
			faItemsPending,
		},
	};
}
