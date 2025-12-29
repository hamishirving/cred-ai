/**
 * UK Market Configuration
 *
 * Defines UK-specific compliance elements, packages, and roles.
 */
import type { NewComplianceElement, NewCompliancePackage, NewRole } from "../../schema";

/**
 * UK Compliance Element definitions.
 * These are templates - organisationId is added at seed time.
 */
export const ukComplianceElements: Omit<NewComplianceElement, "organisationId">[] = [
	// Identity & Right to Work
	{
		name: "Enhanced DBS",
		slug: "enhanced-dbs",
		description: "Enhanced Disclosure and Barring Service check for working with vulnerable groups",
		category: "identity",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 1095, // 3 years
		expiryWarningDays: 90,
		integrationKey: "dbs",
		verificationRules: {
			validationMode: "external",
			externalIntegration: "dbs-update-service",
		},
	},
	{
		name: "PVG Scheme",
		slug: "pvg-scheme",
		description: "Protecting Vulnerable Groups scheme membership (Scotland)",
		category: "identity",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: null, // Continuous monitoring
		expiryWarningDays: null,
		integrationKey: "pvg",
		onlyJurisdictions: ["scotland"],
		substitutes: ["enhanced-dbs"],
		verificationRules: {
			validationMode: "external",
			externalIntegration: "pvg-scotland",
		},
	},
	{
		name: "Right to Work",
		slug: "right-to-work",
		description: "Proof of legal right to work in the UK",
		category: "identity",
		scope: "candidate",
		evidenceType: "document",
		expiryDays: null, // Varies by visa type
		expiryWarningDays: 90,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 85,
			requiredFields: ["documentType", "expiryDate"],
		},
	},
	{
		name: "Passport or ID",
		slug: "passport-id",
		description: "Valid passport or national identity document",
		category: "identity",
		scope: "candidate",
		evidenceType: "document",
		expiryDays: null, // Uses document expiry
		expiryWarningDays: 90,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 90,
			requiredFields: ["documentNumber", "expiryDate", "fullName"],
		},
	},

	// Professional Registration
	{
		name: "NMC Registration",
		slug: "nmc-registration",
		description: "Nursing and Midwifery Council registration for nurses and midwives",
		category: "professional",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 365, // Annual renewal
		expiryWarningDays: 60,
		integrationKey: "nmc",
		verificationRules: {
			validationMode: "external",
			externalIntegration: "nmc-online",
		},
	},
	{
		name: "GMC Registration",
		slug: "gmc-registration",
		description: "General Medical Council registration for doctors",
		category: "professional",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 365,
		expiryWarningDays: 60,
		integrationKey: "gmc",
		verificationRules: {
			validationMode: "external",
			externalIntegration: "gmc-online",
		},
	},
	{
		name: "HCPC Registration",
		slug: "hcpc-registration",
		description: "Health and Care Professions Council registration for allied health professionals",
		category: "professional",
		scope: "candidate",
		evidenceType: "check",
		expiryDays: 730, // 2 years
		expiryWarningDays: 60,
		integrationKey: "hcpc",
		verificationRules: {
			validationMode: "external",
			externalIntegration: "hcpc-online",
		},
	},

	// Mandatory Training
	{
		name: "Information Governance",
		slug: "information-governance",
		description: "Data protection and information security training",
		category: "training",
		scope: "candidate",
		evidenceType: "attestation",
		expiryDays: 365,
		expiryWarningDays: 30,
		verificationRules: {
			validationMode: "none",
		},
	},
	{
		name: "Fire Safety",
		slug: "fire-safety",
		description: "Fire safety awareness training",
		category: "training",
		scope: "candidate",
		evidenceType: "attestation",
		expiryDays: 365,
		expiryWarningDays: 30,
		verificationRules: {
			validationMode: "none",
		},
	},
	{
		name: "Manual Handling",
		slug: "manual-handling",
		description: "Manual handling and lifting techniques training",
		category: "training",
		scope: "candidate",
		evidenceType: "attestation",
		expiryDays: 1095, // 3 years
		expiryWarningDays: 30,
		verificationRules: {
			validationMode: "none",
		},
	},
	{
		name: "Basic Life Support",
		slug: "bls-uk",
		description: "BLS/CPR training and certification",
		category: "training",
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
		name: "Safeguarding Adults",
		slug: "safeguarding-adults",
		description: "Adult safeguarding awareness training",
		category: "training",
		scope: "candidate",
		evidenceType: "attestation",
		expiryDays: 1095, // 3 years
		expiryWarningDays: 30,
		verificationRules: {
			validationMode: "none",
		},
	},
	{
		name: "Safeguarding Children",
		slug: "safeguarding-children",
		description: "Child safeguarding awareness training",
		category: "training",
		scope: "candidate",
		evidenceType: "attestation",
		expiryDays: 1095, // 3 years
		expiryWarningDays: 30,
		verificationRules: {
			validationMode: "none",
		},
	},
	{
		name: "Infection Control",
		slug: "infection-control",
		description: "Infection prevention and control training",
		category: "training",
		scope: "candidate",
		evidenceType: "attestation",
		expiryDays: 365,
		expiryWarningDays: 30,
		verificationRules: {
			validationMode: "none",
		},
	},
	{
		name: "Care Certificate",
		slug: "care-certificate",
		description: "Care Certificate standards for care workers",
		category: "training",
		scope: "candidate",
		evidenceType: "document",
		expiryDays: null, // One-time
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 80,
		},
	},

	// Verification
	{
		name: "Employment References",
		slug: "employment-references",
		description: "Two employment references covering last 3 years",
		category: "verification",
		scope: "candidate",
		evidenceType: "form",
		expiryDays: null, // One-time
		verificationRules: {
			validationMode: "human_required",
		},
	},

	// Placement-scoped items
	{
		name: "NHS Trust Induction",
		slug: "nhs-trust-induction",
		description: "Trust-specific induction and orientation",
		category: "orientation",
		scope: "placement",
		evidenceType: "attestation",
		expiryDays: null, // Per placement
		verificationRules: {
			validationMode: "none",
		},
	},
	{
		name: "Ward Orientation",
		slug: "ward-orientation",
		description: "Ward/unit specific orientation",
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
 * UK Compliance Package templates.
 */
export const ukPackageTemplates: Omit<NewCompliancePackage, "organisationId">[] = [
	{
		name: "Core Package",
		slug: "core-package",
		description: "Essential requirements for all candidates",
		category: "core",
		isDefault: true,
	},
	{
		name: "Nursing Package",
		slug: "nursing-package",
		description: "Additional requirements for registered nurses",
		category: "professional",
	},
	{
		name: "Healthcare Assistant Package",
		slug: "hca-package",
		description: "Requirements for healthcare assistants",
		category: "professional",
	},
	{
		name: "Care Worker Package",
		slug: "care-worker-package",
		description: "Requirements for domiciliary care workers",
		category: "professional",
	},
	{
		name: "NHS Trust Package",
		slug: "nhs-trust-package",
		description: "NHS Trust specific requirements",
		category: "client",
	},
	{
		name: "Scotland Package",
		slug: "scotland-package",
		description: "Scotland-specific requirements (PVG instead of DBS)",
		category: "jurisdiction",
		onlyJurisdictions: ["scotland"],
	},
];

/**
 * Which elements go in which package.
 */
export const ukPackageContents: Record<string, string[]> = {
	"core-package": [
		"enhanced-dbs",
		"right-to-work",
		"passport-id",
		"information-governance",
		"fire-safety",
		"employment-references",
	],
	"nursing-package": [
		"nmc-registration",
		"bls-uk",
		"manual-handling",
		"infection-control",
		"safeguarding-adults",
		"safeguarding-children",
	],
	"hca-package": [
		"bls-uk",
		"manual-handling",
		"infection-control",
		"safeguarding-adults",
		"safeguarding-children",
	],
	"care-worker-package": [
		"care-certificate",
		"manual-handling",
		"safeguarding-adults",
		"safeguarding-children",
		"infection-control",
	],
	"nhs-trust-package": [
		"nhs-trust-induction",
		"ward-orientation",
	],
	"scotland-package": [
		"pvg-scheme",
	],
};

/**
 * UK Role templates.
 */
export const ukRoles: Omit<NewRole, "organisationId">[] = [
	{
		name: "Band 5 Nurse",
		slug: "band-5-nurse",
		description: "Registered Nurse at NHS Band 5",
		professionalBody: "nmc",
	},
	{
		name: "Band 6 Nurse",
		slug: "band-6-nurse",
		description: "Senior Registered Nurse at NHS Band 6",
		professionalBody: "nmc",
	},
	{
		name: "Healthcare Assistant",
		slug: "healthcare-assistant",
		description: "Healthcare Assistant / Clinical Support Worker",
	},
	{
		name: "Care Worker",
		slug: "care-worker",
		description: "Domiciliary care worker",
	},
	{
		name: "Senior Care Worker",
		slug: "senior-care-worker",
		description: "Senior carer with supervisory responsibilities",
	},
	{
		name: "Doctor",
		slug: "doctor",
		description: "Medical Doctor",
		professionalBody: "gmc",
	},
];
