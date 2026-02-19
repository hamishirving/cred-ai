/**
 * FA Package Selector
 *
 * Determines which FA screening package to use based on deal context.
 * Medsol uses two packages:
 * - Package #1 (Standard): SSN, County, Federal, Nationwide, NSOPW, FACIS
 * - Package #2 (Standard + OIG/SAM): #1 + Statewide Criminal, OIG, SAM
 */

// Demo approximation: real OIG/SAM package pending FA configuration by Rebecca.
// Package #1 maps well to 539147. Package #2 uses 539150 as the closest available
// package -- production would use a properly configured "Standard + OIG/SAM" package.
const PACKAGE_1_ID = "539147"; // Sample Standard + FACIS -- good match
const PACKAGE_2_ID = "539150"; // Standard + D&HS -- demo stand-in for Standard + OIG/SAM

const STATES_REQUIRING_STATEWIDE_CRIMINAL = [
  "florida",
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
