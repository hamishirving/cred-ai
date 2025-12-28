/**
 * ComplianceElement - Definition of a compliance requirement.
 *
 * @description Define what needs to be fulfilled
 * @purpose Configurable requirements with scope, expiry, verification rules
 * @see DATA_MODEL.md#complianceelement
 */
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

/**
 * Verification rules for a compliance element.
 */
export interface VerificationRules {
	validationMode:
		| "none"
		| "format"
		| "ai_auto"
		| "ai_human"
		| "human_required"
		| "external";
	aiConfidenceThreshold?: number;
	externalIntegration?: string;
	requiredFields?: string[];
}

/**
 * ComplianceElements define individual compliance requirements.
 *
 * Examples: DBS Check, Right to Work, NMC Registration, Passport
 *
 * Elements can be:
 * - Candidate-scoped (one per candidate, reusable across placements)
 * - Placement-scoped (one per placement)
 */
export const complianceElements = pgTable("compliance_elements", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation owns this element definition */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Display name (e.g., "DBS Certificate", "Right to Work") */
	name: text("name").notNull(),

	/** URL-friendly identifier */
	slug: text("slug").notNull(),

	/** Description for candidates/admins */
	description: text("description"),

	/** Category for grouping (e.g., "identity", "professional", "training") */
	category: text("category"),

	/** Scope: candidate (one per person) or placement (one per placement) */
	scope: varchar("scope", { enum: ["candidate", "placement"] })
		.notNull()
		.default("candidate"),

	/** Data ownership: who owns the evidence for this element */
	dataOwnership: varchar("data_ownership", {
		enum: ["candidate", "organisation", "inherit"],
	})
		.notNull()
		.default("inherit"),

	/** Evidence type expected */
	evidenceType: varchar("evidence_type", {
		enum: ["document", "form", "check", "attestation", "external"],
	}).notNull(),

	/** Expiry period in days (null = never expires) */
	expiryDays: integer("expiry_days"),

	/** Whether renewal is required when expired */
	renewalRequired: boolean("renewal_required").notNull().default(true),

	/** How many days before expiry to warn */
	expiryWarningDays: integer("expiry_warning_days").default(30),

	/** Verification rules (validation mode, confidence thresholds) */
	verificationRules: jsonb("verification_rules").$type<VerificationRules>(),

	/** Jurisdictions this element only applies to */
	onlyJurisdictions: jsonb("only_jurisdictions").$type<string[]>(),

	/** Jurisdictions this element does NOT apply to */
	excludeJurisdictions: jsonb("exclude_jurisdictions").$type<string[]>(),

	/** Whether evidence must match placement jurisdiction */
	jurisdictionRequired: boolean("jurisdiction_required").notNull().default(false),

	/** Other elements this can substitute for */
	substitutes: jsonb("substitutes").$type<string[]>(),

	/** Integration key for external checks (e.g., "nmc", "gmc", "dbs") */
	integrationKey: text("integration_key"),

	/** Skills granted when this element is compliant (micro-credentialling) */
	grantsSkillIds: jsonb("grants_skill_ids").$type<string[]>(),

	/** Flexible custom fields */
	customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

	/** Whether this element is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ComplianceElement = typeof complianceElements.$inferSelect;
export type NewComplianceElement = typeof complianceElements.$inferInsert;
