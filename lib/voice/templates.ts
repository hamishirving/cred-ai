/**
 * Voice Templates
 *
 * Defines reusable call configurations. Each template specifies:
 * - VAPI assistant to use
 * - Context fields (caller provides)
 * - Capture fields (agent extracts)
 *
 * For MVP, templates are defined in code.
 * Future: dynamic template creation via database.
 */

import type { FieldSchema, VoiceTemplate } from "./types";

// ============================================
// Employment Verification Template
// ============================================

const employmentVerificationContextSchema: FieldSchema[] = [
	{
		key: "candidateName",
		label: "Candidate Name",
		type: "string",
		required: true,
		description: "Full name of the candidate being verified",
	},
	{
		key: "jobTitle",
		label: "Job Title",
		type: "string",
		required: true,
		description: "The job title to verify",
	},
	{
		key: "companyName",
		label: "Company",
		type: "string",
		required: true,
		description: "Company where the candidate worked",
	},
	{
		key: "startDate",
		label: "Start Date",
		type: "date",
		description: "When the candidate started (YYYY-MM)",
	},
	{
		key: "endDate",
		label: "End Date",
		type: "date",
		description: "When the candidate left (YYYY-MM)",
	},
	{
		key: "employmentType",
		label: "Employment Type",
		type: "select",
		options: ["full-time", "part-time", "contract", "intern"],
		description: "Type of employment",
	},
];

const employmentVerificationCaptureSchema: FieldSchema[] = [
	{
		key: "confirmed_jobTitle",
		label: "Confirmed Job Title",
		type: "string",
	},
	{
		key: "confirmed_companyName",
		label: "Confirmed Company",
		type: "string",
	},
	{
		key: "confirmed_startDate",
		label: "Confirmed Start Date",
		type: "date",
	},
	{
		key: "confirmed_endDate",
		label: "Confirmed End Date",
		type: "date",
	},
	{
		key: "confirmed_employmentType",
		label: "Confirmed Employment Type",
		type: "string",
	},
	{
		key: "eligible_for_rehire",
		label: "Eligible for Rehire",
		type: "boolean",
	},
	{
		key: "additional_notes",
		label: "Additional Notes",
		type: "string",
	},
];

const employmentVerificationTemplate: VoiceTemplate = {
	slug: "employment-verification",
	name: "Employment Verification",
	description:
		"Verify employment history with a previous employer. The AI agent will call the reference contact and confirm job title, dates, and other employment details.",
	vapiAssistantId: process.env.VAPI_ASSISTANT_ID || "",

	contextSchema: employmentVerificationContextSchema,
	captureSchema: employmentVerificationCaptureSchema,

	ui: {
		buttonLabel: "Initiate Reference Call",
		successMessage: "Employment verification complete",
		icon: "phone",
	},
};

// ============================================
// Reference Check Template
// ============================================

const referenceCheckContextSchema: FieldSchema[] = [
	{
		key: "candidateName",
		label: "Candidate Name",
		type: "string",
		required: true,
		description: "Full name of the candidate being referenced",
	},
	{
		key: "refereeName",
		label: "Referee Name",
		type: "string",
		required: true,
		description: "Name of the referee being called",
	},
	{
		key: "candidateJobTitle",
		label: "Job Title",
		type: "string",
		required: true,
		description: "Job title the candidate held",
	},
	{
		key: "companyName",
		label: "Company",
		type: "string",
		required: true,
		description: "Organisation where the candidate worked",
	},
	{
		key: "startDate",
		label: "Start Date",
		type: "date",
		description: "When the candidate started (YYYY-MM)",
	},
	{
		key: "endDate",
		label: "End Date",
		type: "date",
		description: "When the candidate left (YYYY-MM)",
	},
];

const referenceCheckCaptureSchema: FieldSchema[] = [
	{
		key: "confirmed_jobTitle",
		label: "Confirmed Job Title",
		type: "string",
	},
	{
		key: "confirmed_startDate",
		label: "Confirmed Start Date",
		type: "date",
	},
	{
		key: "confirmed_endDate",
		label: "Confirmed End Date",
		type: "date",
	},
	{
		key: "eligible_for_rehire",
		label: "Eligible for Rehire",
		type: "boolean",
	},
	{
		key: "would_recommend",
		label: "Would Recommend",
		type: "boolean",
	},
	{
		key: "performance_summary",
		label: "Performance Summary",
		type: "string",
	},
	{
		key: "additional_notes",
		label: "Additional Notes",
		type: "string",
	},
];

const referenceCheckTemplate: VoiceTemplate = {
	slug: "reference-check",
	name: "Reference Check",
	description:
		"Conduct a reference check with a previous employer or colleague. The AI agent will call the referee and gather employment details, performance feedback, and rehire eligibility.",
	vapiAssistantId: process.env.VAPI_ASSISTANT_ID || "",

	contextSchema: referenceCheckContextSchema,
	captureSchema: referenceCheckCaptureSchema,

	ui: {
		buttonLabel: "Initiate Reference Check",
		successMessage: "Reference check complete",
		icon: "phone",
	},
};

// ============================================
// Template Registry
// ============================================

export const templates: Record<string, VoiceTemplate> = {
	"employment-verification": employmentVerificationTemplate,
	"reference-check": referenceCheckTemplate,
};

// ============================================
// Template Helpers
// ============================================

/**
 * Get a template by slug
 */
export function getTemplate(slug: string): VoiceTemplate | undefined {
	return templates[slug];
}

/**
 * List all available templates
 */
export function listTemplates(): VoiceTemplate[] {
	return Object.values(templates);
}

/**
 * Check if a template exists
 */
export function templateExists(slug: string): boolean {
	return slug in templates;
}

/**
 * Validate context against a template's schema
 * Returns an array of validation errors (empty if valid)
 */
export function validateContext(
	template: VoiceTemplate,
	context: Record<string, unknown>,
): string[] {
	const errors: string[] = [];

	for (const field of template.contextSchema) {
		const value = context[field.key];

		// Check required fields
		if (field.required && (value === undefined || value === "")) {
			errors.push(`${field.label} is required`);
			continue;
		}

		// Skip validation if field is empty and not required
		if (value === undefined || value === "") {
			continue;
		}

		// Type-specific validation
		switch (field.type) {
			case "email":
				if (typeof value !== "string" || !value.includes("@")) {
					errors.push(`${field.label} must be a valid email`);
				}
				break;

			case "phone":
				if (typeof value !== "string" || !/^\+[1-9]\d{1,14}$/.test(value)) {
					errors.push(`${field.label} must be a valid E.164 phone number`);
				}
				break;

			case "select":
				if (field.options && !field.options.includes(value as string)) {
					errors.push(
						`${field.label} must be one of: ${field.options.join(", ")}`,
					);
				}
				break;

			case "date":
				// Accept YYYY-MM or YYYY-MM-DD format
				if (
					typeof value !== "string" ||
					!/^\d{4}-\d{2}(-\d{2})?$/.test(value)
				) {
					errors.push(`${field.label} must be in YYYY-MM or YYYY-MM-DD format`);
				}
				break;

			case "boolean":
				if (typeof value !== "boolean") {
					errors.push(`${field.label} must be true or false`);
				}
				break;
		}
	}

	return errors;
}
