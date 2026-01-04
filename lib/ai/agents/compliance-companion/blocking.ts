/**
 * Blocking Analysis Utility
 *
 * Determines who is responsible for progress on each compliance item:
 * - candidate: They need to take action (upload, resubmit)
 * - admin: We're reviewing/processing their submission
 * - third_party: External service is handling it (e.g., DBS check)
 * - complete: No blocking - item is done
 *
 * @see docs/PRD-AI-AGENTS.md#blocking-logic-design
 */

import type { ComplianceElement } from "@/lib/db/schema/compliance-elements";
import type { Evidence } from "@/lib/db/schema/evidence";
import type { BlockedBy, ComplianceItemContext } from "../types";

// ============================================
// Types
// ============================================

/**
 * Result of analyzing who is blocking a compliance item.
 */
export interface BlockingAnalysis {
	/** Who is currently blocking progress */
	blockedBy: BlockedBy;

	/** Human-readable reason for the blocking status */
	reason: string;

	/** What action is required (if blockedBy is candidate) */
	actionRequired?: string;

	/** Additional context for AI-generated messages */
	context?: {
		/** Days since status changed */
		daysSinceStatusChange?: number;
		/** Whether this is a re-submission */
		isResubmission?: boolean;
		/** External provider name if third party */
		externalProvider?: string;
	};
}

/**
 * Evidence sources that indicate external/third-party processing.
 */
const EXTERNAL_SOURCES = ["external_check"] as const;

/**
 * Evidence sources that indicate candidate-initiated uploads.
 */
const CANDIDATE_SOURCES = [
	"user_upload",
	"cv_extraction",
	"document_extraction",
	"ai_extraction",
	"attestation",
] as const;

/**
 * Evidence sources that indicate admin-initiated entries.
 */
const ADMIN_SOURCES = ["admin_entry"] as const;

// ============================================
// Main Analysis Function
// ============================================

/**
 * Analyze who is blocking progress on a compliance item.
 *
 * Uses a derived approach based on evidence status and source,
 * following the logic outlined in the PRD.
 *
 * @param element - The compliance element definition
 * @param evidence - The evidence record (or null if none exists)
 * @returns BlockingAnalysis with blockedBy, reason, and actionRequired
 */
export function analyzeBlocking(
	element: ComplianceElement,
	evidence: Evidence | null,
): BlockingAnalysis {
	// No evidence exists = candidate needs to provide
	if (!evidence) {
		return {
			blockedBy: "candidate",
			reason: "Not yet submitted",
			actionRequired: `Upload your ${element.name}`,
		};
	}

	// Analyze based on current status
	switch (evidence.status) {
		case "approved":
			return {
				blockedBy: "complete",
				reason: "Approved and verified",
			};

		case "rejected":
			return {
				blockedBy: "candidate",
				reason: evidence.rejectionReason || "Document rejected - needs resubmission",
				actionRequired: `Resubmit your ${element.name}`,
				context: {
					isResubmission: true,
				},
			};

		case "expired":
			return {
				blockedBy: "candidate",
				reason: "Document has expired",
				actionRequired: `Upload a current ${element.name}`,
				context: {
					isResubmission: true,
				},
			};

		case "requires_review":
			// Document uploaded but needs human review
			return {
				blockedBy: "admin",
				reason: "Under review by our compliance team",
			};

		case "pending":
			return analyzePendingEvidence(element, evidence);

		case "processing":
			return analyzeProcessingEvidence(element, evidence);

		default:
			// Fallback - shouldn't happen with proper enum usage
			return {
				blockedBy: "candidate",
				reason: "Action needed",
				actionRequired: `Check your ${element.name}`,
			};
	}
}

// ============================================
// Status-Specific Analysis
// ============================================

/**
 * Analyze pending evidence to determine who is blocking.
 */
function analyzePendingEvidence(
	element: ComplianceElement,
	evidence: Evidence,
): BlockingAnalysis {
	// External check initiated but awaiting result
	if (isExternalSource(evidence.source)) {
		return {
			blockedBy: "third_party",
			reason: "Awaiting external verification",
			context: {
				externalProvider: getExternalProviderName(element),
			},
		};
	}

	// Candidate uploaded, now pending our initial review
	if (isCandidateSource(evidence.source)) {
		return {
			blockedBy: "admin",
			reason: "Awaiting initial review",
		};
	}

	// Admin-entered but pending further action
	if (isAdminSource(evidence.source)) {
		return {
			blockedBy: "admin",
			reason: "Being processed by our team",
		};
	}

	// Default to candidate for unknown sources
	return {
		blockedBy: "candidate",
		reason: "Awaiting your action",
		actionRequired: `Complete your ${element.name}`,
	};
}

/**
 * Analyze processing evidence to determine who is blocking.
 */
function analyzeProcessingEvidence(
	element: ComplianceElement,
	evidence: Evidence,
): BlockingAnalysis {
	// External check actively processing
	if (isExternalSource(evidence.source)) {
		return {
			blockedBy: "third_party",
			reason: "External check in progress",
			context: {
				externalProvider: getExternalProviderName(element),
			},
		};
	}

	// AI or system processing
	return {
		blockedBy: "admin",
		reason: "Being processed",
	};
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if the source indicates an external/third-party check.
 */
function isExternalSource(source: Evidence["source"]): boolean {
	return EXTERNAL_SOURCES.some((s) => s === source);
}

/**
 * Check if the source indicates a candidate-initiated submission.
 */
function isCandidateSource(source: Evidence["source"]): boolean {
	return CANDIDATE_SOURCES.some((s) => s === source);
}

/**
 * Check if the source indicates an admin-initiated entry.
 */
function isAdminSource(source: Evidence["source"]): boolean {
	return ADMIN_SOURCES.some((s) => s === source);
}

/**
 * Get a human-readable name for the external provider.
 * Uses the element's integration key or falls back to generic name.
 */
function getExternalProviderName(element: ComplianceElement): string {
	const providers: Record<string, string> = {
		dbs: "DBS",
		nmc: "NMC",
		gmc: "GMC",
		hcpc: "HCPC",
		right_to_work: "Home Office",
	};

	if (element.integrationKey && providers[element.integrationKey]) {
		return providers[element.integrationKey];
	}

	return "external provider";
}

// ============================================
// Batch Analysis
// ============================================

/**
 * Analyze blocking status for multiple compliance items.
 * Returns items grouped by who is blocking them.
 */
export function analyzeMultipleBlockingItems(
	items: Array<{
		element: ComplianceElement;
		evidence: Evidence | null;
	}>,
): {
	blockedByCandidate: ComplianceItemContext[];
	blockedByAdmin: ComplianceItemContext[];
	blockedByThirdParty: ComplianceItemContext[];
	complete: ComplianceItemContext[];
} {
	const result = {
		blockedByCandidate: [] as ComplianceItemContext[],
		blockedByAdmin: [] as ComplianceItemContext[],
		blockedByThirdParty: [] as ComplianceItemContext[],
		complete: [] as ComplianceItemContext[],
	};

	for (const { element, evidence } of items) {
		const analysis = analyzeBlocking(element, evidence);

		const itemContext: ComplianceItemContext = {
			elementId: element.id,
			elementName: element.name,
			elementSlug: element.slug,
			status: mapEvidenceStatusToItemStatus(evidence?.status),
			blockedBy: analysis.blockedBy,
			blockingReason: analysis.reason,
			actionRequired: analysis.actionRequired,
			expiresAt: evidence?.expiresAt ?? undefined,
		};

		switch (analysis.blockedBy) {
			case "candidate":
				result.blockedByCandidate.push(itemContext);
				break;
			case "admin":
				result.blockedByAdmin.push(itemContext);
				break;
			case "third_party":
				result.blockedByThirdParty.push(itemContext);
				break;
			case "complete":
				result.complete.push(itemContext);
				break;
		}
	}

	return result;
}

/**
 * Map evidence status to a simplified item status.
 */
function mapEvidenceStatusToItemStatus(
	evidenceStatus: Evidence["status"] | undefined,
): ComplianceItemContext["status"] {
	if (!evidenceStatus) return "pending";

	switch (evidenceStatus) {
		case "approved":
			return "complete";
		case "rejected":
			return "rejected";
		case "expired":
			return "expired";
		default:
			return "pending";
	}
}

// ============================================
// Summary Generation
// ============================================

/**
 * Generate a human-readable blocking summary for AI context.
 */
export function generateBlockingSummary(analysis: {
	blockedByCandidate: ComplianceItemContext[];
	blockedByAdmin: ComplianceItemContext[];
	blockedByThirdParty: ComplianceItemContext[];
	complete: ComplianceItemContext[];
}): string {
	const parts: string[] = [];

	if (analysis.complete.length > 0) {
		parts.push(`${analysis.complete.length} item(s) complete`);
	}

	if (analysis.blockedByCandidate.length > 0) {
		const items = analysis.blockedByCandidate
			.map((i) => i.elementName)
			.join(", ");
		parts.push(`${analysis.blockedByCandidate.length} item(s) waiting on candidate: ${items}`);
	}

	if (analysis.blockedByAdmin.length > 0) {
		const items = analysis.blockedByAdmin.map((i) => i.elementName).join(", ");
		parts.push(`${analysis.blockedByAdmin.length} item(s) being reviewed: ${items}`);
	}

	if (analysis.blockedByThirdParty.length > 0) {
		const items = analysis.blockedByThirdParty
			.map((i) => i.elementName)
			.join(", ");
		parts.push(`${analysis.blockedByThirdParty.length} item(s) with external providers: ${items}`);
	}

	return parts.join(". ");
}
