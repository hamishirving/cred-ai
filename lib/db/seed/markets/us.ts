/**
 * US Market Configuration
 *
 * Defines US-specific compliance elements, packages, and roles.
 */
import type { NewComplianceElement, NewCompliancePackage, NewRole } from "../../schema";

import type { NewAcceptableDocument } from "../../schema";

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
		fulfilmentProvider: "organisation_staff",
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
		fulfilmentProvider: "external_provider",
		expiryDays: 365,
		expiryWarningDays: 60,
		verificationRules: {
			validationMode: "external",
		},
	},
	{
		name: "Driver's Licence",
		slug: "drivers-licence",
		description: "Valid state-issued driver's licence or government photo ID",
		category: "identity",
		scope: "candidate",
		evidenceType: "document",
		fulfilmentProvider: "candidate",
		expiryDays: null, // Uses document expiry
		expiryWarningDays: 90,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 90,
		},
	},
	{
		name: "Social Security Card",
		slug: "social-security-card",
		description: "Social Security card for identity and payroll verification",
		category: "identity",
		scope: "candidate",
		evidenceType: "document",
		fulfilmentProvider: "candidate",
		expiryDays: null,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 90,
		},
	},
	{
		name: "Background Check Authorisation",
		slug: "background-auth-consent",
		description: "FCRA-compliant authorisation and consent for background screening",
		category: "identity",
		scope: "candidate",
		evidenceType: "form",
		fulfilmentProvider: "candidate",
		expiryDays: null, // One-time per screening cycle
		verificationRules: {
			validationMode: "human_required",
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
		fulfilmentProvider: "external_provider",
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
		fulfilmentProvider: "candidate",
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
		fulfilmentProvider: "candidate",
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
		fulfilmentProvider: "candidate",
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
		fulfilmentProvider: "external_provider",
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
		fulfilmentProvider: "candidate",
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
		fulfilmentProvider: "external_provider",
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
		fulfilmentProvider: "candidate",
		expiryDays: 730,
		expiryWarningDays: 90,
		onlyJurisdictions: ["florida"],
		integrationKey: "fl-bon",
		verificationRules: {
			validationMode: "external",
		},
	},

	// FACES Sanctions Screening (bundled in every FA background package)
	{
		name: "FACES Sanctions Screening",
		slug: "faces-sanctions-screening",
		description: "FACES sanctions and exclusion database screening — covers 200+ sources including OIG, SAM, GSA, state exclusion lists and FDA debarment. Bundled in every FA background package.",
		category: "identity",
		scope: "candidate",
		evidenceType: "check",
		fulfilmentProvider: "external_provider",
		expiryDays: 365,
		expiryWarningDays: 60,
		verificationRules: {
			validationMode: "external",
			externalIntegration: "first-advantage",
		},
	},
	{
		name: "Florida Level 2 Background Check",
		slug: "florida-level2-background",
		description: "Florida FDLE Level 2 fingerprint-based background check",
		category: "identity",
		scope: "candidate",
		evidenceType: "check",
		fulfilmentProvider: "external_provider",
		expiryDays: 365,
		expiryWarningDays: 60,
		onlyJurisdictions: ["florida"],
		verificationRules: {
			validationMode: "external",
			externalIntegration: "first-advantage",
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
		fulfilmentProvider: "candidate",
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
		fulfilmentProvider: "candidate",
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
		fulfilmentProvider: "candidate",
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
		fulfilmentProvider: "candidate",
		expiryDays: 1095, // 3 years
		expiryWarningDays: 90,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 85,
		},
	},
	{
		name: "CRRT Certification",
		slug: "crrt-certification",
		description: "Continuous Renal Replacement Therapy certification for ICU",
		category: "training",
		scope: "candidate",
		evidenceType: "document",
		fulfilmentProvider: "candidate",
		expiryDays: 730, // 2 years
		expiryWarningDays: 60,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 85,
		},
	},

	// Professional & Submission
	{
		name: "Resume / CV",
		slug: "resume-cv",
		description: "Current professional resume or curriculum vitae",
		category: "professional",
		scope: "candidate",
		evidenceType: "document",
		fulfilmentProvider: "candidate",
		expiryDays: 365, // Updated annually
		expiryWarningDays: 60,
		verificationRules: {
			validationMode: "none",
		},
	},
	{
		name: "Professional References",
		slug: "professional-references",
		description: "Minimum 2 professional references (1 supervisor within 12 months)",
		category: "professional",
		scope: "candidate",
		evidenceType: "external",
		fulfilmentProvider: "flexible",
		expiryDays: 365,
		expiryWarningDays: 60,
		verificationRules: {
			validationMode: "human_required",
		},
	},
	{
		name: "Skills Checklist",
		slug: "skills-checklist",
		description: "Specialty-specific self-assessment of clinical competencies",
		category: "professional",
		scope: "candidate",
		evidenceType: "form",
		fulfilmentProvider: "candidate",
		expiryDays: 365,
		expiryWarningDays: 30,
		verificationRules: {
			validationMode: "none",
		},
	},
	{
		name: "Education Verification",
		slug: "education-verification",
		description: "Nursing degree verification (ADN/BSN) via National Student Clearinghouse or equivalent",
		category: "professional",
		scope: "candidate",
		evidenceType: "check",
		fulfilmentProvider: "external_provider",
		expiryDays: null, // One-time verification
		verificationRules: {
			validationMode: "external",
		},
	},
	{
		name: "Employment Verification",
		slug: "employment-verification",
		description: "Work history verification (minimum 2 years) via The Work Number or direct contact",
		category: "professional",
		scope: "candidate",
		evidenceType: "check",
		fulfilmentProvider: "external_provider",
		expiryDays: null, // Per placement cycle
		verificationRules: {
			validationMode: "external",
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
		fulfilmentProvider: "candidate",
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
		fulfilmentProvider: "candidate",
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
		fulfilmentProvider: "candidate",
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
		fulfilmentProvider: "candidate",
		expiryDays: 365,
		expiryWarningDays: 60,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 80,
		},
	},
	{
		name: "MMR (Measles, Mumps, Rubella)",
		slug: "mmr-vaccination",
		description: "MMR vaccination series or positive titer results",
		category: "health",
		scope: "candidate",
		evidenceType: "document",
		fulfilmentProvider: "candidate",
		expiryDays: null, // Lifetime immunity once series/titer confirmed
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 80,
		},
	},
	{
		name: "Varicella (Chickenpox)",
		slug: "varicella-vaccination",
		description: "Varicella vaccination series or positive titer results",
		category: "health",
		scope: "candidate",
		evidenceType: "document",
		fulfilmentProvider: "candidate",
		expiryDays: null, // Lifetime immunity
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 80,
		},
	},
	{
		name: "TDAP Vaccination",
		slug: "tdap-vaccination",
		description: "Tetanus, diphtheria and pertussis vaccination (within 10 years)",
		category: "health",
		scope: "candidate",
		evidenceType: "document",
		fulfilmentProvider: "candidate",
		expiryDays: 3650, // 10 years
		expiryWarningDays: 90,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 80,
		},
	},
	{
		name: "COVID Vaccination",
		slug: "covid-vaccination",
		description: "COVID-19 vaccination series or approved declination",
		category: "health",
		scope: "candidate",
		evidenceType: "document",
		fulfilmentProvider: "candidate",
		expiryDays: null, // Facility-dependent, series completion
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
		fulfilmentProvider: "external_provider",
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
		fulfilmentProvider: "organisation_staff",
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
		fulfilmentProvider: "organisation_staff",
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
		fulfilmentProvider: "organisation_staff",
		expiryDays: null,
		verificationRules: {
			validationMode: "none",
		},
	},

	// SNF-specific placement elements
	{
		name: "SNF Orientation",
		slug: "snf-orientation",
		description: "Skilled nursing facility orientation and onboarding",
		category: "orientation",
		scope: "placement",
		evidenceType: "attestation",
		fulfilmentProvider: "organisation_staff",
		expiryDays: null,
		verificationRules: {
			validationMode: "none",
		},
	},
	{
		name: "CMS Compliance Training",
		slug: "cms-compliance-training",
		description: "Centers for Medicare & Medicaid Services compliance training",
		category: "training",
		scope: "placement",
		evidenceType: "document",
		fulfilmentProvider: "candidate",
		expiryDays: 365,
		expiryWarningDays: 30,
		verificationRules: {
			validationMode: "ai_human",
			aiConfidenceThreshold: 85,
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
		version: 1,
	},
	{
		name: "RN Package",
		slug: "rn-package",
		description: "Requirements for Registered Nurses",
		category: "professional",
		version: 1,
	},
	{
		name: "ICU/Critical Care Package",
		slug: "icu-package",
		description: "Additional requirements for critical care assignments",
		category: "specialty",
		version: 1,
	},
	{
		name: "California Package",
		slug: "california-package",
		description: "California-specific requirements",
		category: "jurisdiction",
		onlyJurisdictions: ["california"],
		version: 1,
	},
	{
		name: "Texas Package",
		slug: "texas-package",
		description: "Texas-specific requirements",
		category: "jurisdiction",
		onlyJurisdictions: ["texas"],
		version: 1,
	},
	{
		name: "Florida Package",
		slug: "florida-package",
		description: "Florida-specific requirements",
		category: "jurisdiction",
		onlyJurisdictions: ["florida"],
		version: 1,
	},
	{
		name: "Hospital Package",
		slug: "hospital-package",
		description: "Hospital facility requirements",
		category: "facility",
		version: 1,
	},
	{
		name: "SNF Package",
		slug: "snf-package",
		description: "Skilled nursing facility requirements",
		category: "facility",
		version: 1,
	},
	{
		name: "FACES Sanctions Package",
		slug: "exclusion-checks-package",
		description: "FACES sanctions screening (200+ sources including OIG/SAM)",
		category: "screening",
		version: 1,
	},
];

/**
 * Which elements go in which package.
 */
export const usPackageContents: Record<string, string[]> = {
	"federal-core-package": [
		"i9-verification",
		"federal-background-check",
		"drivers-licence",
		"social-security-card",
		"background-auth-consent",
		"bls-certification",
		"tb-test",
		"hep-b-vaccination",
		"flu-vaccination",
		"mmr-vaccination",
		"varicella-vaccination",
		"tdap-vaccination",
		"covid-vaccination",
	],
	"rn-package": [
		"state-rn-license",
		"acls-certification",
		"drug-screen",
		"physical-examination",
		"resume-cv",
		"professional-references",
		"skills-checklist",
		"education-verification",
		"employment-verification",
	],
	"icu-package": [
		"pals-certification",
		"critical-care-cert",
		"crrt-certification",
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
		"florida-level2-background",
	],
	"exclusion-checks-package": [
		"faces-sanctions-screening",
	],
	"hospital-package": [
		"hospital-credentialing",
		"hospital-orientation",
		"unit-competency",
	],
	"snf-package": [
		"snf-orientation",
		"cms-compliance-training",
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

/**
 * Which packages a role requires (role slug -> package slugs).
 */
export const usRolePackages: Record<string, string[]> = {
	"travel-rn": ["federal-core-package", "rn-package"],
	"travel-icu-rn": ["federal-core-package", "rn-package", "icu-package"],
	"travel-er-rn": ["federal-core-package", "rn-package"],
	"staff-rn": ["federal-core-package", "rn-package"],
	"charge-nurse": ["federal-core-package", "rn-package"],
	"clinical-nurse-specialist": ["federal-core-package", "rn-package"],
};

/**
 * Which package a state requires (jurisdiction -> package slug).
 */
export const usStatePackages: Record<string, string> = {
	california: "california-package",
	texas: "texas-package",
	florida: "florida-package",
};

/**
 * Which package a facility type requires (facility type -> package slug).
 */
export const usFacilityPackages: Record<string, string> = {
	hospital: "hospital-package",
	"skilled-nursing": "snf-package",
};

/**
 * Acceptable document definitions for health compliance elements.
 *
 * Keyed by compliance element slug. Each element lists the document types
 * that can satisfy it, with facility-specific acceptance criteria (Medsol instructions).
 */
export const usAcceptableDocuments: Record<
	string,
	Omit<NewAcceptableDocument, "complianceElementId">[]
> = {
	"mmr-vaccination": [
		{
			name: "MMR Vaccination Record",
			documentType: "vaccination_record",
			status: "preferred",
			priority: 1,
			acceptanceCriteria:
				"TWO VACCINES at least 28 days apart. Must include name, clinic information, and dates of administration. Both doses must be clearly documented. If only one dose is present, the record is incomplete and cannot be accepted.",
			clinicianGuidance:
				"Please upload your MMR vaccination record showing both doses with dates and clinic details.",
		},
		{
			name: "MMR Titer Lab Result",
			documentType: "titer_result",
			status: "alternative",
			priority: 2,
			acceptanceCriteria:
				"POSITIVE IGG titer for all three components. Must be listed individually — Measles, Mumps, and Rubella — each showing Positive or Reactive result. Reactive = Positive. Equivocal or Negative results do not satisfy this requirement. Lab name and date must be visible.",
			clinicianGuidance:
				"Upload your titer results showing positive IGG for Measles, Mumps, and Rubella individually.",
		},
		{
			name: "MMR Declination Form",
			documentType: "declination_form",
			status: "conditional",
			priority: 3,
			acceptanceCriteria:
				"Signed Medical Solutions MMR declination form. Only accepted if titer results are Negative or Equivocal for one or more components AND vaccination is medically contraindicated. Must include clinician signature, date, and reason for declination.",
			clinicianGuidance:
				"A declination form is only accepted when titer results are negative/equivocal and vaccination is medically contraindicated.",
		},
	],
	"varicella-vaccination": [
		{
			name: "Varicella Vaccination Record",
			documentType: "vaccination_record",
			status: "preferred",
			priority: 1,
			acceptanceCriteria:
				"Documentation of complete vaccination series (two doses). Must include patient name, dates of each dose, and administering clinic. Both doses must be present for acceptance.",
			clinicianGuidance:
				"Upload your varicella vaccination record showing both doses.",
		},
		{
			name: "Varicella Titer Lab Result",
			documentType: "titer_result",
			status: "alternative",
			priority: 2,
			acceptanceCriteria:
				"Positive Varicella IGG titer result. Must show Positive or Reactive status. Lab name and collection date required. Equivocal results are not accepted — repeat testing or vaccination is required.",
			clinicianGuidance:
				"Upload your varicella titer result showing positive IGG.",
		},
	],
	"tdap-vaccination": [
		{
			name: "TDAP Vaccination Record",
			documentType: "vaccination_record",
			status: "preferred",
			priority: 1,
			acceptanceCriteria:
				"TDAP vaccination within 10 years of assignment start date. Must show vaccine name (TDAP, not TD alone), date of administration, and clinic information. TD (tetanus-diphtheria only) does NOT satisfy this requirement — the pertussis component is required.",
			clinicianGuidance:
				"Upload your TDAP vaccination record. Must be within 10 years — TD alone is not accepted.",
		},
		{
			name: "TDAP Declination Form",
			documentType: "declination_form",
			status: "conditional",
			priority: 2,
			acceptanceCriteria:
				"Signed facility-specific TDAP declination form. Only accepted if vaccination is medically contraindicated. Must include clinician signature and documented medical reason for declination.",
			clinicianGuidance:
				"A TDAP declination is only accepted with documented medical contraindication.",
		},
	],
	"tb-test": [
		{
			name: "TB QuantiFERON Gold Result",
			documentType: "screening_result",
			status: "preferred",
			priority: 1,
			acceptanceCriteria:
				"TB QuantiFERON Gold blood test result. Negative = cleared. Positive = requires chest X-ray follow-up and clearance letter. Indeterminate results require repeat testing. Lab name, collection date, and result interpretation must be clearly stated.",
			clinicianGuidance:
				"Upload your TB QuantiFERON Gold test result. If positive, you will also need a chest X-ray clearance letter.",
		},
		{
			name: "TB Clearance Letter",
			documentType: "clearance_letter",
			status: "conditional",
			priority: 2,
			acceptanceCriteria:
				"Required only if TB screening is positive. Must include: chest X-ray result, physician clearance statement confirming no active TB, physician signature, and date. The clearance letter must be dated within 12 months. Must also provide the original positive TB screening result alongside this letter.",
			clinicianGuidance:
				"If your TB test was positive, upload a chest X-ray clearance letter from your physician.",
		},
	],
	"hep-b-vaccination": [
		{
			name: "Hepatitis B Titer Result",
			documentType: "titer_result",
			status: "preferred",
			priority: 1,
			acceptanceCriteria:
				"Positive Hepatitis B Surface Antibody (HBsAb) titer result, also known as anti-HBs. Must show Positive or Reactive status with a quantitative value ≥ 10 mIU/mL. Lab name and collection date required.",
			clinicianGuidance:
				"Upload your Hepatitis B surface antibody titer result showing positive immunity.",
		},
		{
			name: "Hepatitis B Declination Form",
			documentType: "declination_form",
			status: "conditional",
			priority: 2,
			acceptanceCriteria:
				"Facility-specific Hepatitis B declination form. Accepted if titer is negative or equivocal, indicating non-immunity. Must include candidate signature acknowledging the risk, date, and witnessed by facility representative. Candidate must understand they may be required to begin the vaccination series.",
			clinicianGuidance:
				"A Hep B declination is accepted if your titer shows you are not immune. You may be asked to start the vaccination series.",
		},
	],
	"drug-screen": [
		{
			name: "13-Panel Drug Screen Result",
			documentType: "screening_result",
			status: "preferred",
			priority: 1,
			acceptanceCriteria:
				"Drug screen must test for all 13 required analytes: Amphetamines (including Methamphetamine), Barbiturates, Benzodiazepines, Cocaine Metabolites, Marijuana, Methadone, Opiates (Codeine, Morphine), Phencyclidine, Propoxyphene, Fentanyl, Meperidine, Oxycodone, and Tramadol. Result must show Negative for all analytes. Any non-negative result (Positive, Dilute, or Invalid) requires review. Negative Dilute results require immediate recollection. Lab name, collection date, and MRO certification must be visible. FA product code DHS90007 covers all 13 analytes.",
			clinicianGuidance:
				"Your drug screen will be ordered through First Advantage and routed to a clinic near you. The test covers 13 substances. You'll receive clinic details via email.",
		},
	],
	"covid-vaccination": [
		{
			name: "COVID-19 Vaccination Record",
			documentType: "vaccination_record",
			status: "preferred",
			priority: 1,
			acceptanceCriteria:
				"Documentation of complete COVID-19 vaccination series. CDC vaccination card or official vaccination record accepted. Must show patient name, vaccine manufacturer, lot number, and dates for each dose. Series completion is defined by the manufacturer's recommended schedule.",
			clinicianGuidance:
				"Upload your COVID-19 vaccination card or official record showing the complete series.",
		},
		{
			name: "COVID-19 Declination Form",
			documentType: "declination_form",
			status: "conditional",
			priority: 2,
			acceptanceCriteria:
				"Signed COVID-19 vaccination declination form. Must be the facility-specific form. Requires candidate signature, date, and acknowledgement of facility policies regarding unvaccinated staff (which may include regular testing requirements). Medical or religious exemption documentation may be required depending on facility policy.",
			clinicianGuidance:
				"A COVID declination must be on the facility-specific form. You may be subject to regular testing requirements.",
		},
	],
};

