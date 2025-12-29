/**
 * US Market Configuration
 *
 * Defines US-specific compliance elements, packages, and roles.
 */
import type { NewComplianceElement, NewCompliancePackage, NewRole } from "../../schema";

/**
 * US Compliance Element definitions.
 */
export const usComplianceElements: Omit<NewComplianceElement, "organisationId">[] = [
	// Federal Identity & Employment
	{
		name: "I-9 Verification",
		slug: "i9-verification",
		description: "Employment Eligibility Verification (Form I-9)",
		category: "identity",
		scope: "candidate",
		evidenceType: "form",
		expiryDays: null, // One-time per employer
		verificationRules: {
			validationMode: "human_required",
			requiredFields: ["documentType", "documentNumber", "expiryDate"],
		},
	},
	{
		name: "Federal Background Check",
		slug: "federal-background-check",
		description: "FBI/national criminal background check",
		category: "identity",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 365,
		expiryWarningDays: 60,
		verificationRules: {
			validationMode: "external",
		},
	},

	// State-specific elements (templates - jurisdiction set at seed time)
	{
		name: "State Background Check",
		slug: "state-background-check",
		description: "State-level criminal background check",
		category: "identity",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 365,
		expiryWarningDays: 60,
		jurisdictionRequired: true,
		verificationRules: {
			validationMode: "external",
		},
	},
	{
		name: "State RN License",
		slug: "state-rn-license",
		description: "State Registered Nurse license",
		category: "professional",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 730, // 2 years (varies by state)
		expiryWarningDays: 90,
		jurisdictionRequired: true,
		verificationRules: {
			validationMode: "external",
			externalIntegration: "nursys",
		},
	},
	{
		name: "Compact Nursing License (NLC)",
		slug: "compact-nursing-license",
		description: "Multi-state Nurse Licensure Compact license",
		category: "professional",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 730,
		expiryWarningDays: 90,
		verificationRules: {
			validationMode: "external",
			externalIntegration: "nursys",
		},
	},

	// California-specific (non-compact state)
	{
		name: "California RN License",
		slug: "california-rn-license",
		description: "California Board of Registered Nursing license",
		category: "professional",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 730,
		expiryWarningDays: 90,
		onlyJurisdictions: ["california"],
		integrationKey: "ca-brn",
		verificationRules: {
			validationMode: "external",
			externalIntegration: "ca-brn",
		},
	},
	{
		name: "California Background Check",
		slug: "california-background-check",
		description: "California DOJ LiveScan background check",
		category: "identity",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 365,
		expiryWarningDays: 60,
		onlyJurisdictions: ["california"],
		verificationRules: {
			validationMode: "external",
		},
	},

	// Texas-specific
	{
		name: "Texas RN License",
		slug: "texas-rn-license",
		description: "Texas Board of Nursing license",
		category: "professional",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 730,
		expiryWarningDays: 90,
		onlyJurisdictions: ["texas"],
		integrationKey: "tx-bon",
		verificationRules: {
			validationMode: "external",
			externalIntegration: "tx-bon",
		},
	},
	{
		name: "Texas Background Check",
		slug: "texas-background-check",
		description: "Texas DPS background check",
		category: "identity",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 365,
		expiryWarningDays: 60,
		onlyJurisdictions: ["texas"],
		verificationRules: {
			validationMode: "external",
		},
	},

	// Florida-specific
	{
		name: "Florida RN License",
		slug: "florida-rn-license",
		description: "Florida Board of Nursing license",
		category: "professional",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 730,
		expiryWarningDays: 90,
		onlyJurisdictions: ["florida"],
		integrationKey: "fl-bon",
		verificationRules: {
			validationMode: "external",
		},
	},

	// Training & Certifications
	{
		name: "BLS Certification",
		slug: "bls-certification",
		description: "Basic Life Support certification (AHA or equivalent)",
		category: "training",
		scope: "candidate",
		evidenceType: "document",
		expiryDays: 730, // 2 years
		expiryWarningDays: 60,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 85,
			requiredFields: ["issueDate", "expiryDate", "providerName"],
		},
	},
	{
		name: "ACLS Certification",
		slug: "acls-certification",
		description: "Advanced Cardiac Life Support certification",
		category: "training",
		scope: "candidate",
		evidenceType: "document",
		expiryDays: 730,
		expiryWarningDays: 60,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 85,
		},
	},
	{
		name: "PALS Certification",
		slug: "pals-certification",
		description: "Pediatric Advanced Life Support certification",
		category: "training",
		scope: "candidate",
		evidenceType: "document",
		expiryDays: 730,
		expiryWarningDays: 60,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 85,
		},
	},
	{
		name: "Critical Care Certification",
		slug: "critical-care-cert",
		description: "CCRN or equivalent critical care certification",
		category: "training",
		scope: "candidate",
		evidenceType: "document",
		expiryDays: 1095, // 3 years
		expiryWarningDays: 90,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 85,
		},
	},

	// Health Requirements
	{
		name: "TB Test",
		slug: "tb-test",
		description: "Tuberculosis screening (PPD or chest X-ray)",
		category: "health",
		scope: "candidate",
		evidenceType: "document",
		expiryDays: 365,
		expiryWarningDays: 30,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 80,
		},
	},
	{
		name: "Hepatitis B Vaccination",
		slug: "hep-b-vaccination",
		description: "Hepatitis B vaccination series or declination",
		category: "health",
		scope: "candidate",
		evidenceType: "document",
		expiryDays: null, // Lifetime immunity
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 80,
		},
	},
	{
		name: "Flu Vaccination",
		slug: "flu-vaccination",
		description: "Annual influenza vaccination",
		category: "health",
		scope: "candidate",
		evidenceType: "document",
		expiryDays: 365,
		expiryWarningDays: 30,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 80,
		},
	},
	{
		name: "Physical Examination",
		slug: "physical-examination",
		description: "Annual physical examination clearance",
		category: "health",
		scope: "candidate",
		evidenceType: "document",
		expiryDays: 365,
		expiryWarningDays: 60,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 80,
		},
	},
	{
		name: "Drug Screen",
		slug: "drug-screen",
		description: "Pre-employment or annual drug screening",
		category: "health",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 365,
		expiryWarningDays: 30,
		verificationRules: {
			validationMode: "external",
		},
	},

	// Placement-scoped
	{
		name: "Hospital Credentialing",
		slug: "hospital-credentialing",
		description: "Facility-specific credentialing and privileging",
		category: "orientation",
		scope: "placement",
		evidenceType: "form",
		expiryDays: null,
		verificationRules: {
			validationMode: "human_required",
		},
	},
	{
		name: "Unit Competency Assessment",
		slug: "unit-competency",
		description: "Unit/department specific competency validation",
		category: "orientation",
		scope: "placement",
		evidenceType: "attestation",
		expiryDays: null,
		verificationRules: {
			validationMode: "none",
		},
	},
	{
		name: "Hospital Orientation",
		slug: "hospital-orientation",
		description: "Facility orientation and onboarding",
		category: "orientation",
		scope: "placement",
		evidenceType: "attestation",
		expiryDays: null,
		verificationRules: {
			validationMode: "none",
		},
	},
];

/**
 * US Compliance Package templates.
 */
export const usPackageTemplates: Omit<NewCompliancePackage, "organisationId">[] = [
	{
		name: "Federal Core Package",
		slug: "federal-core-package",
		description: "Federal requirements for all healthcare workers",
		category: "core",
		isDefault: true,
	},
	{
		name: "RN Package",
		slug: "rn-package",
		description: "Requirements for Registered Nurses",
		category: "professional",
	},
	{
		name: "ICU/Critical Care Package",
		slug: "icu-package",
		description: "Additional requirements for critical care assignments",
		category: "specialty",
	},
	{
		name: "California Package",
		slug: "california-package",
		description: "California-specific requirements",
		category: "jurisdiction",
		onlyJurisdictions: ["california"],
	},
	{
		name: "Texas Package",
		slug: "texas-package",
		description: "Texas-specific requirements",
		category: "jurisdiction",
		onlyJurisdictions: ["texas"],
	},
	{
		name: "Florida Package",
		slug: "florida-package",
		description: "Florida-specific requirements",
		category: "jurisdiction",
		onlyJurisdictions: ["florida"],
	},
	{
		name: "Hospital Package",
		slug: "hospital-package",
		description: "Hospital facility requirements",
		category: "facility",
	},
];

/**
 * Which elements go in which package.
 */
export const usPackageContents: Record<string, string[]> = {
	"federal-core-package": [
		"i9-verification",
		"federal-background-check",
		"bls-certification",
		"tb-test",
		"hep-b-vaccination",
		"flu-vaccination",
	],
	"rn-package": [
		"state-rn-license",
		"acls-certification",
		"drug-screen",
		"physical-examination",
	],
	"icu-package": [
		"pals-certification",
		"critical-care-cert",
	],
	"california-package": [
		"california-rn-license",
		"california-background-check",
	],
	"texas-package": [
		"texas-rn-license",
		"texas-background-check",
	],
	"florida-package": [
		"florida-rn-license",
	],
	"hospital-package": [
		"hospital-credentialing",
		"hospital-orientation",
		"unit-competency",
	],
};

/**
 * US Role templates.
 */
export const usRoles: Omit<NewRole, "organisationId">[] = [
	{
		name: "Travel RN",
		slug: "travel-rn",
		description: "Travel Registered Nurse",
	},
	{
		name: "Travel ICU RN",
		slug: "travel-icu-rn",
		description: "Travel ICU/Critical Care Registered Nurse",
	},
	{
		name: "Travel ER RN",
		slug: "travel-er-rn",
		description: "Travel Emergency Room Registered Nurse",
	},
	{
		name: "Staff RN",
		slug: "staff-rn",
		description: "Staff Registered Nurse (permanent)",
	},
	{
		name: "Charge Nurse",
		slug: "charge-nurse",
		description: "Charge Nurse / Unit Supervisor",
	},
	{
		name: "Clinical Nurse Specialist",
		slug: "clinical-nurse-specialist",
		description: "Advanced Practice Nurse - CNS",
	},
];
