/**
 * FA Package Selector
 *
 * Determines which FA screening package to use based on deal context.
 * Only one real package exists (571732 "Medical Solutions Package TEST").
 * Package 587791 is SSN-only and not useful for full screening.
 *
 * For the demo, both tiers map to 571732. In production, Medsol would
 * configure a second package with additional OIG/SAM components.
 */

// Both tiers use 571732 for now (only full package available in sandbox).
// Tier distinction is preserved so the agent explains the WHY correctly.
const PACKAGE_1_ID = "571732"; // Standard: full background package
const PACKAGE_2_ID = "571732"; // Standard + OIG/SAM: same package in sandbox (already includes EXOIG/GSA)

const STATES_REQUIRING_STATEWIDE_CRIMINAL = [
	"california",
	"new_york",
	"illinois",
	"pennsylvania",
];

export interface PackageSelectionInput {
	lastAssignmentEndDate?: string;
	targetState: string;
	facilityRequiresOigSam?: boolean;
	dealType?: "standard" | "lapse" | "quickstart" | "reassignment" | "government";
}

export interface PackageSelection {
	packageId: string;
	packageName: string;
	reason: string;
	tier: 1 | 2;
}

export function selectFAPackage(input: PackageSelectionInput): PackageSelection {
	// Package #2 triggers
	if (input.dealType === "lapse") {
		return {
			packageId: PACKAGE_2_ID,
			packageName: "Standard + OIG/SAM",
			reason: "Lapse deal -- candidate was inactive, full re-screening with exclusion checks required",
			tier: 2,
		};
	}

	if (input.facilityRequiresOigSam) {
		return {
			packageId: PACKAGE_2_ID,
			packageName: "Standard + OIG/SAM",
			reason: "Facility requires OIG/SAM exclusion checks",
			tier: 2,
		};
	}

	if (STATES_REQUIRING_STATEWIDE_CRIMINAL.includes(input.targetState.toLowerCase())) {
		return {
			packageId: PACKAGE_2_ID,
			packageName: "Standard + OIG/SAM",
			reason: `${input.targetState} requires statewide criminal search`,
			tier: 2,
		};
	}

	if (input.dealType === "government") {
		return {
			packageId: PACKAGE_2_ID,
			packageName: "Standard + OIG/SAM",
			reason: "Government-adjacent placement requires exclusion list checks",
			tier: 2,
		};
	}

	// Check for lapse by date
	if (input.lastAssignmentEndDate) {
		const endDate = new Date(input.lastAssignmentEndDate);
		const daysSince = Math.floor((Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24));
		if (daysSince > 30) {
			return {
				packageId: PACKAGE_2_ID,
				packageName: "Standard + OIG/SAM",
				reason: `Candidate inactive for ${daysSince} days -- lapse re-screening with exclusion checks`,
				tier: 2,
			};
		}
	}

	// Default: Package #1
	return {
		packageId: PACKAGE_1_ID,
		packageName: "Standard",
		reason: "Standard new placement -- full background package",
		tier: 1,
	};
}
