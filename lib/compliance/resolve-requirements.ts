/**
 * Placement Requirements Engine
 *
 * Resolves the full set of compliance requirements for a placement by walking
 * the package hierarchy: federal -> state -> role -> facility + conditional OIG/SAM.
 *
 * Then checks a candidate's evidence against those requirements, with
 * carry-forward tagging for items that transfer between assignments.
 */

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
	assignmentRules,
	complianceElements,
	compliancePackages,
	evidence,
	packageElements,
	roles,
	workNodeTypes,
	workNodes,
} from "@/lib/db/schema";
import type { SatisfactionLogic } from "@/lib/db/schema/compliance-elements";
import {
	ukFacilityPackages,
	ukJurisdictionPackages,
	ukPackageContents,
	ukRolePackages,
} from "@/lib/db/seed/markets/uk";
import {
	usFacilityPackages,
	usPackageContents,
	usRolePackages,
	usStatePackages,
} from "@/lib/db/seed/markets/us";

// Merged mappings — slugs don't overlap between markets
const allRolePackages: Record<string, string[]> = {
	...usRolePackages,
	...ukRolePackages,
};
const allStatePackages: Record<string, string> = {
	...usStatePackages,
	...ukJurisdictionPackages,
};
const allFacilityPackages: Record<string, string> = {
	...usFacilityPackages,
	...ukFacilityPackages,
};
const allPackageContents: Record<string, string[]> = {
	...usPackageContents,
	...ukPackageContents,
};

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
	/** Specific work node id for the placement (enables facility-layer rules) */
	workNodeId?: string | null;
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
	/** Who is expected to fulfil this requirement */
	fulfilmentProvider: string;
	/** Optional boolean tree of alternative satisfaction paths */
	satisfactionLogic?: SatisfactionLogic | null;
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
	/** Who is expected to fulfil this requirement */
	fulfilmentProvider: string;
	/** Current status */
	status:
		| "met"
		| "expiring"
		| "expired"
		| "pending"
		| "requires_review"
		| "missing";
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
	/** Storage path for document file */
	evidenceFilePath: string | null;
	/** Original filename */
	evidenceFileName: string | null;
	/** MIME type of file */
	evidenceMimeType: string | null;
	/** Extracted data including AI verification results */
	evidenceExtractedData: Record<string, unknown> | null;
	/** Structured external-check results (e.g. registry lookups) */
	evidenceCheckResult: Record<string, unknown> | null;
	/** The satisfaction tree (if this element uses AND/OR logic) */
	satisfactionLogic?: SatisfactionLogic | null;
	/** The branch that was matched to produce the status (if a tree was evaluated) */
	matchedPath?: SatisfactionLogic | null;
	/** Per-leaf status map for UI to colour individual leaves in the tree */
	leafStatuses?: Record<string, PlacementComplianceItem["status"]>;
	/** Per-leaf display name so the UI can label leaves in the tree */
	leafNames?: Record<string, string>;
	/**
	 * Full per-leaf details so the UI can wire leaves to the document dialog
	 * (status, best evidence record, file path, stored verification data, …).
	 */
	leaves?: Array<{
		slug: string;
		name: string;
		status: PlacementComplianceItem["status"];
		evidenceId: string | null;
		evidenceFilePath: string | null;
		evidenceFileName: string | null;
		evidenceMimeType: string | null;
		evidenceExtractedData: Record<string, unknown> | null;
		evidenceCheckResult: Record<string, unknown> | null;
	}>;
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
	const normalise = (value: string | null | undefined) =>
		(value || "").trim().toLowerCase().replace(/\s+/g, "-");

	const resolveDynamicPackageSelections = async (): Promise<
		Array<{ packageSlug: string; reason: string }>
	> => {
		const [roleRow, nodeTypeRows, rules] = await Promise.all([
			db
				.select({ id: roles.id })
				.from(roles)
				.where(
					and(
						eq(roles.organisationId, organisationId),
						eq(roles.slug, context.roleSlug),
					),
				)
				.limit(1)
				.then((rows) => rows[0] ?? null),
			db
				.select({
					id: workNodeTypes.id,
					name: workNodeTypes.name,
					slug: workNodeTypes.slug,
				})
				.from(workNodeTypes)
				.where(eq(workNodeTypes.organisationId, organisationId)),
			db
				.select({
					name: assignmentRules.name,
					packageId: assignmentRules.packageId,
					roleId: assignmentRules.roleId,
					workNodeTypeId: assignmentRules.workNodeTypeId,
					specificWorkNodeId: assignmentRules.specificWorkNodeId,
					jurisdictions: assignmentRules.jurisdictions,
				})
				.from(assignmentRules)
				.where(
					and(
						eq(assignmentRules.organisationId, organisationId),
						eq(assignmentRules.isActive, true),
					),
				),
		]);

		const roleId = roleRow?.id ?? null;
		const normalisedFacilityType = normalise(context.facilityType);
		const normalisedJurisdiction = normalise(context.jurisdiction);

		const matchingWorkNodeTypeIds = new Set(
			nodeTypeRows
				.filter(
					(row) =>
						normalise(row.slug) === normalisedFacilityType ||
						normalise(row.name) === normalisedFacilityType,
				)
				.map((row) => row.id),
		);

		// Walk parentId chain up from the placement's workNode so a rule bound to
		// "Trinity Health" also applies to "Trinity Health Dallas".
		const ancestorWorkNodeIds = new Set<string>();
		if (context.workNodeId) {
			const nodeRows = await db
				.select({
					id: workNodes.id,
					parentId: workNodes.parentId,
				})
				.from(workNodes)
				.where(eq(workNodes.organisationId, organisationId));
			const parentById = new Map(nodeRows.map((n) => [n.id, n.parentId]));
			let current: string | null = context.workNodeId;
			const guard = new Set<string>();
			while (current && !guard.has(current)) {
				ancestorWorkNodeIds.add(current);
				guard.add(current);
				current = parentById.get(current) ?? null;
			}
		}

		const matchedRules = rules.filter((rule) => {
			if (rule.roleId && (!roleId || rule.roleId !== roleId)) return false;
			if (
				rule.workNodeTypeId &&
				!matchingWorkNodeTypeIds.has(rule.workNodeTypeId)
			) {
				return false;
			}
			if (
				rule.specificWorkNodeId &&
				!ancestorWorkNodeIds.has(rule.specificWorkNodeId)
			) {
				return false;
			}
			const jurisdictions = (rule.jurisdictions ?? []).map((j) => normalise(j));
			if (
				jurisdictions.length > 0 &&
				!jurisdictions.includes(normalisedJurisdiction)
			) {
				return false;
			}
			return true;
		});

		if (matchedRules.length === 0) return [];

		const packageIds = [...new Set(matchedRules.map((rule) => rule.packageId))];
		if (packageIds.length === 0) return [];

		const matchedPackages = await db
			.select({
				id: compliancePackages.id,
				slug: compliancePackages.slug,
				isActive: compliancePackages.isActive,
			})
			.from(compliancePackages)
			.where(
				and(
					eq(compliancePackages.organisationId, organisationId),
					inArray(compliancePackages.id, packageIds),
				),
			);

		const slugByPackageId = new Map(
			matchedPackages
				.filter(
					(pkg) => pkg.isActive && pkg.slug !== "exclusion-checks-package",
				)
				.map((pkg) => [pkg.id, pkg.slug]),
		);

		return matchedRules
			.map((rule) => {
				const packageSlug = slugByPackageId.get(rule.packageId);
				if (!packageSlug) return null;
				return {
					packageSlug,
					reason: `assignment:${rule.name}`,
				};
			})
			.filter((entry): entry is { packageSlug: string; reason: string } =>
				Boolean(entry),
			);
	};

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
					eq(compliancePackages.isActive, true),
				),
			)
			.limit(1);

		if (!pkg) return null;
		const normalisedContextJurisdiction = normalise(context.jurisdiction);
		const packageJurisdictionGuard = (pkg.onlyJurisdictions ?? []).map((j) =>
			normalise(j),
		);
		if (
			packageJurisdictionGuard.length > 0 &&
			!packageJurisdictionGuard.includes(normalisedContextJurisdiction)
		) {
			return null;
		}

		// Primary source: DB package->elements composition
		let elements = await db
			.select({
				id: complianceElements.id,
				slug: complianceElements.slug,
				name: complianceElements.name,
				description: complianceElements.description,
				category: complianceElements.category,
				scope: complianceElements.scope,
				evidenceType: complianceElements.evidenceType,
				expiryDays: complianceElements.expiryDays,
				expiryWarningDays: complianceElements.expiryWarningDays,
				fulfilmentProvider: complianceElements.fulfilmentProvider,
				onlyJurisdictions: complianceElements.onlyJurisdictions,
				excludeJurisdictions: complianceElements.excludeJurisdictions,
				satisfactionLogic: complianceElements.satisfactionLogic,
			})
			.from(packageElements)
			.innerJoin(
				complianceElements,
				eq(complianceElements.id, packageElements.elementId),
			)
			.where(
				and(
					eq(packageElements.packageId, pkg.id),
					eq(complianceElements.organisationId, organisationId),
				),
			)
			.orderBy(asc(packageElements.displayOrder), asc(complianceElements.name));

		// Fallback: static package contents map for backward compatibility
		if (elements.length === 0) {
			const elementSlugs = allPackageContents[packageSlug] || [];
			if (elementSlugs.length === 0) return null;
			const newSlugs = elementSlugs.filter((s) => !seenSlugs.has(s));
			if (newSlugs.length === 0) return null;
			elements = await db
				.select({
					id: complianceElements.id,
					slug: complianceElements.slug,
					name: complianceElements.name,
					description: complianceElements.description,
					category: complianceElements.category,
					scope: complianceElements.scope,
					evidenceType: complianceElements.evidenceType,
					expiryDays: complianceElements.expiryDays,
					expiryWarningDays: complianceElements.expiryWarningDays,
					fulfilmentProvider: complianceElements.fulfilmentProvider,
					onlyJurisdictions: complianceElements.onlyJurisdictions,
					excludeJurisdictions: complianceElements.excludeJurisdictions,
					satisfactionLogic: complianceElements.satisfactionLogic,
				})
				.from(complianceElements)
				.where(
					and(
						eq(complianceElements.organisationId, organisationId),
						inArray(complianceElements.slug, newSlugs),
					),
				);
		}

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
				faHandled: el.fulfilmentProvider === "external_provider",
				fulfilmentProvider: el.fulfilmentProvider,
				satisfactionLogic: el.satisfactionLogic ?? null,
			};
		});

		return {
			packageSlug,
			packageName: pkg.name,
			reason,
			elements: resolved,
		};
	};

	const packageSelections: Array<{ packageSlug: string; reason: string }> = [];

	// 1. Role packages (federal core + role-specific + specialty)
	const rolePackageSlugs = allRolePackages[context.roleSlug] || [];
	for (const pkgSlug of rolePackageSlugs) {
		packageSelections.push({
			packageSlug: pkgSlug,
			reason: `role:${context.roleSlug}`,
		});
	}

	// 2. State/jurisdiction package
	const normalisedJurisdictionKey = normalise(context.jurisdiction).replace(
		/\s+/g,
		"-",
	);
	const statePackageSlug =
		allStatePackages[context.jurisdiction] ||
		allStatePackages[normalisedJurisdictionKey];
	if (statePackageSlug) {
		packageSelections.push({
			packageSlug: statePackageSlug,
			reason: `state:${context.jurisdiction}`,
		});
	}

	// 3. Facility package
	const normalisedFacilityKey = normalise(context.facilityType).replace(
		/\s+/g,
		"-",
	);
	const facilityPackageSlug =
		allFacilityPackages[context.facilityType] ||
		allFacilityPackages[normalisedFacilityKey];
	if (facilityPackageSlug) {
		packageSelections.push({
			packageSlug: facilityPackageSlug,
			reason: `facility:${context.facilityType}`,
		});
	}

	// 3b. Dynamic assignment rules (admin-managed package mappings)
	const dynamicSelections = await resolveDynamicPackageSelections();
	for (const selection of dynamicSelections) {
		packageSelections.push(selection);
	}

	// 4. Conditional: OIG/SAM exclusion checks
	if (requiresOigSam(context)) {
		const reason = context.isLapseDeal
			? "conditional:lapse-deal"
			: context.stateRequiresOigSam
				? `conditional:state-mandate:${context.jurisdiction}`
				: "conditional:facility-requirement";
		packageSelections.push({
			packageSlug: "exclusion-checks-package",
			reason,
		});
	}

	const processedPackages = new Set<string>();
	for (const selection of packageSelections) {
		if (processedPackages.has(selection.packageSlug)) continue;
		processedPackages.add(selection.packageSlug);
		const group = await resolvePackage(selection.packageSlug, selection.reason);
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
 * Collapse the full item-status set to the three-state vocabulary used by the
 * boolean-tree evaluator: met / pending / missing.
 */
type TreeLeafStatus = "met" | "pending" | "missing";
function collapseStatus(
	status: PlacementComplianceItem["status"],
): TreeLeafStatus {
	if (status === "met") return "met";
	if (status === "missing" || status === "expired") return "missing";
	// pending | requires_review | expiring all count as "in progress"
	return "pending";
}

/** Walk a satisfaction tree and collect all ELEMENT leaf slugs. */
function collectLeafSlugs(node: SatisfactionLogic, out: Set<string>): void {
	if (node.op === "ELEMENT") {
		out.add(node.slug);
		return;
	}
	for (const child of node.children) collectLeafSlugs(child, out);
}

/**
 * Recursively evaluate a satisfaction tree against a per-slug status map.
 *
 * Returns the overall status plus the subtree that most directly satisfies
 * (or fails to satisfy) the requirement — used by the UI to highlight the
 * branch the candidate's evidence is on.
 */
function evaluateSatisfactionLogic(
	node: SatisfactionLogic,
	leafStatusBySlug: Map<string, TreeLeafStatus>,
): { status: TreeLeafStatus; matchedBranch: SatisfactionLogic } {
	if (node.op === "ELEMENT") {
		const status = leafStatusBySlug.get(node.slug) ?? "missing";
		return { status, matchedBranch: node };
	}

	const childResults = node.children.map((child) =>
		evaluateSatisfactionLogic(child, leafStatusBySlug),
	);

	if (node.op === "ALL") {
		const missing = childResults.some((r) => r.status === "missing");
		const pending = childResults.some((r) => r.status === "pending");
		const status: TreeLeafStatus = missing
			? "missing"
			: pending
				? "pending"
				: "met";
		return { status, matchedBranch: node };
	}

	// ANY: prefer a met child, else the most-advanced pending child, else fail.
	const met = childResults.find((r) => r.status === "met");
	if (met) return { status: "met", matchedBranch: met.matchedBranch };
	const pending = childResults.find((r) => r.status === "pending");
	if (pending) return { status: "pending", matchedBranch: pending.matchedBranch };
	return { status: "missing", matchedBranch: node };
}

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

	// 3. Fetch all evidence for this profile in one query.
	// Expand the slug set to include leaf slugs referenced by any
	// satisfactionLogic tree so we can evaluate them against evidence too.
	const slugSet = new Set<string>(allElements.map((e) => e.element.slug));
	for (const { element } of allElements) {
		if (element.satisfactionLogic) {
			collectLeafSlugs(element.satisfactionLogic, slugSet);
		}
	}
	const slugs = [...slugSet];
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
	const elementBySlug = new Map(elementRows.map((e) => [e.slug, e]));

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
	const bestEvidence = new Map<string, (typeof evidenceRows)[number]>();
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

	// Compute status for a single (element, evidence) pair. Pulled out so tree
	// leaves can reuse the same logic as package-level elements.
	const computeStatus = (
		expiryWarningDays: number | null,
		ev: (typeof evidenceRows)[number] | undefined,
	): PlacementComplianceItem["status"] => {
		if (!ev) return "missing";
		if (ev.status === "approved") {
			if (ev.expiresAt && ev.expiresAt <= now) return "expired";
			if (
				ev.expiresAt &&
				expiryWarningDays &&
				ev.expiresAt.getTime() - now.getTime() <=
					expiryWarningDays * 24 * 60 * 60 * 1000
			) {
				return "expiring";
			}
			return "met";
		}
		if (ev.status === "expired") return "expired";
		if (ev.status === "requires_review") return "requires_review";
		if (ev.status === "pending" || ev.status === "processing") return "pending";
		return "missing";
	};

	// Per-slug leaf status for tree evaluation.
	const leafStatusBySlug = new Map<string, TreeLeafStatus>();
	for (const slug of slugs) {
		const row = elementBySlug.get(slug);
		const id = elementIdMap.get(slug);
		const ev = id ? bestEvidence.get(id) : undefined;
		const status = computeStatus(row?.expiryWarningDays ?? null, ev);
		leafStatusBySlug.set(slug, collapseStatus(status));
	}

	const items: PlacementComplianceItem[] = allElements.map(
		({ element, packageSlug, packageReason }) => {
			const elementId = elementIdMap.get(element.slug);
			const ev = elementId ? bestEvidence.get(elementId) : undefined;

			// Base item (flat element, no tree). Status derives from the element's
			// own evidence.
			let status = computeStatus(element.expiryWarningDays, ev);
			let matchedPath: SatisfactionLogic | null = null;
			let leafStatuses: Record<string, PlacementComplianceItem["status"]> | undefined;
			let leafNames: Record<string, string> | undefined;
			let leaves: PlacementComplianceItem["leaves"];

			// If the element declares a satisfaction tree, evaluate it and let the
			// tree drive the overall status. The element's own evidence is ignored
			// in this path — the tree's leaf elements are what matter.
			if (element.satisfactionLogic) {
				const leafSlugs = new Set<string>();
				collectLeafSlugs(element.satisfactionLogic, leafSlugs);
				leafStatuses = {};
				leafNames = {};
				leaves = [];
				for (const leafSlug of leafSlugs) {
					const leafRow = elementBySlug.get(leafSlug);
					const leafId = elementIdMap.get(leafSlug);
					const leafEv = leafId ? bestEvidence.get(leafId) : undefined;
					const leafStatus = computeStatus(
						leafRow?.expiryWarningDays ?? null,
						leafEv,
					);
					leafStatuses[leafSlug] = leafStatus;
					if (leafRow?.name) leafNames[leafSlug] = leafRow.name;
					leaves.push({
						slug: leafSlug,
						name: leafRow?.name ?? leafSlug,
						status: leafStatus,
						evidenceId: leafEv?.id ?? null,
						evidenceFilePath: leafEv?.filePath ?? null,
						evidenceFileName: leafEv?.fileName ?? null,
						evidenceMimeType: leafEv?.mimeType ?? null,
						evidenceExtractedData:
							(leafEv?.extractedData as Record<string, unknown> | null) ??
							null,
						evidenceCheckResult:
							(leafEv?.checkResult as Record<string, unknown> | null) ?? null,
					});
				}
				const result = evaluateSatisfactionLogic(
					element.satisfactionLogic,
					leafStatusBySlug,
				);
				matchedPath = result.matchedBranch;
				status =
					result.status === "met"
						? "met"
						: result.status === "pending"
							? "pending"
							: "missing";
			}

			if (!ev && !element.satisfactionLogic) {
				return {
					slug: element.slug,
					name: element.name,
					category: element.category,
					faHandled: element.faHandled,
					fulfilmentProvider: element.fulfilmentProvider,
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
					evidenceFilePath: null,
					evidenceFileName: null,
					evidenceMimeType: null,
					evidenceExtractedData: null,
					evidenceCheckResult: null,
					satisfactionLogic: null,
					matchedPath: null,
				};
			}

			const isCarryForward =
				element.scope === "candidate" && ev?.status === "approved";

			return {
				slug: element.slug,
				name: element.name,
				category: element.category,
				faHandled: element.faHandled,
				fulfilmentProvider: element.fulfilmentProvider,
				status,
				carryForward: isCarryForward && status === "met",
				expiresAt: ev?.expiresAt ?? null,
				evidenceId: ev?.id ?? null,
				evidenceStatus: ev?.status ?? null,
				packageSlug,
				packageReason,
				evidenceSource: ev?.source ?? null,
				evidenceVerificationStatus: ev?.verificationStatus ?? null,
				evidenceIssuedAt: ev?.issuedAt ?? null,
				evidenceVerifiedAt: ev?.verifiedAt ?? null,
				evidenceFilePath: ev?.filePath ?? null,
				evidenceFileName: ev?.fileName ?? null,
				evidenceMimeType: ev?.mimeType ?? null,
				evidenceExtractedData:
					(ev?.extractedData as Record<string, unknown> | null) ?? null,
				evidenceCheckResult:
					(ev?.checkResult as Record<string, unknown> | null) ?? null,
				satisfactionLogic: element.satisfactionLogic ?? null,
				matchedPath,
				leafStatuses,
				leafNames,
				leaves,
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
			percentage:
				items.length > 0 ? Math.round((met / items.length) * 100) : 100,
			faItemsTotal: faItems.length,
			faItemsMet,
			faItemsPending,
		},
	};
}
