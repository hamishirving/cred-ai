/**
 * FA Package Selector
 *
 * Determines which FA screening package to use based on deal context.
 * Three Medsol packages configured in QA (25 Feb 2026):
 *
 * - Package 1 (539146): Standard background (SSN, county, nationwide, FACIS, sex offender)
 * - Package 2 (626709): Standard + State Criminal Repository + OIG/GSA exclusion
 * - Package 3 (626711): Everything + National Wants & Warrants + OIG variant
 *
 * D&OHS items are ordered a la carte, not via packages.
 */

// Medsol packages configured in QA (25 Feb 2026)
const PACKAGE_1_ID = "539146"; // Standard: base background package
const PACKAGE_2_ID = "626709"; // Enhanced: + state criminal + OIG/GSA
const PACKAGE_3_ID = "626711"; // Full: + national wants & warrants

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
	includeDrugHealth?: boolean;
}

export interface PackageSelection {
	packageId: string;
	packageName: string;
	reason: string;
	tier: 1 | 2 | 3;
	includesDrugHealth: boolean;
}

export function selectFAPackage(input: PackageSelectionInput): PackageSelection {
	const dhs = input.includeDrugHealth ?? false;

	// Tier 3: Lapse deals and government placements get the full package
	if (input.dealType === "lapse") {
		return {
			packageId: PACKAGE_3_ID,
			packageName: "Full Screening",
			reason: "Lapse deal -- candidate was inactive, full re-screening with exclusion checks and wants & warrants required",
			tier: 3,
			includesDrugHealth: dhs,
		};
	}

	if (input.dealType === "government") {
		return {
			packageId: PACKAGE_3_ID,
			packageName: "Full Screening",
			reason: "Government-adjacent placement requires full screening with exclusion list checks and wants & warrants",
			tier: 3,
			includesDrugHealth: dhs,
		};
	}

	// Check for lapse by date
	if (input.lastAssignmentEndDate) {
		const endDate = new Date(input.lastAssignmentEndDate);
		const daysSince = Math.floor((Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24));
		if (daysSince > 30) {
			return {
				packageId: PACKAGE_3_ID,
				packageName: "Full Screening",
				reason: `Candidate inactive for ${daysSince} days -- lapse re-screening with full checks`,
				tier: 3,
				includesDrugHealth: dhs,
			};
		}
	}

	// Tier 2: State criminal + OIG/SAM triggers
	if (input.facilityRequiresOigSam) {
		return {
			packageId: PACKAGE_2_ID,
			packageName: "Enhanced Screening",
			reason: "Facility requires OIG/SAM exclusion checks and state criminal search",
			tier: 2,
			includesDrugHealth: dhs,
		};
	}

	if (STATES_REQUIRING_STATEWIDE_CRIMINAL.includes(input.targetState.toLowerCase())) {
		return {
			packageId: PACKAGE_2_ID,
			packageName: "Enhanced Screening",
			reason: `${input.targetState} requires statewide criminal search`,
			tier: 2,
			includesDrugHealth: dhs,
		};
	}

	// Tier 1: Standard background
	return {
		packageId: PACKAGE_1_ID,
		packageName: "Standard Screening",
		reason: "Standard new placement -- base background package with SSN, county, nationwide, FACIS, and sex offender checks",
		tier: 1,
		includesDrugHealth: dhs,
	};
}
