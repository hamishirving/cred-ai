/**
 * Evidence - Proof that a requirement is fulfilled.
 *
 * @description Store documents, check results, attestations
 * @purpose Multi-source evidence, ownership tracking, jurisdiction support
 * @see DATA_MODEL.md#evidence
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
import { profiles } from "./profiles";
import { placements } from "./placements";
import { complianceElements } from "./compliance-elements";

/**
 * Evidence represents proof that a compliance requirement is fulfilled.
 *
 * Evidence can come from multiple sources (document upload, external check,
 * form completion, attestation) and tracks ownership for portability.
 */
export const evidence = pgTable("evidence", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation holds this evidence */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** The compliance element this evidence is for */
	complianceElementId: uuid("compliance_element_id")
		.notNull()
		.references(() => complianceElements.id),

	/** Profile this evidence is for (candidate-scoped) */
	profileId: uuid("profile_id").references(() => profiles.id),

	/** Placement this evidence is for (placement-scoped, null if candidate-scoped) */
	placementId: uuid("placement_id").references(() => placements.id),

	/** Type of evidence */
	evidenceType: varchar("evidence_type", {
		enum: ["document", "form", "check", "attestation", "external"],
	}).notNull(),

	/** Source of the evidence */
	source: varchar("source", {
		enum: [
			"user_upload",
			"cv_extraction",
			"document_extraction",
			"external_check",
			"ai_extraction",
			"admin_entry",
			"attestation",
		],
	}).notNull(),

	/** Current status */
	status: varchar("status", {
		enum: [
			"pending",
			"processing",
			"requires_review",
			"approved",
			"rejected",
			"expired",
		],
	})
		.notNull()
		.default("pending"),

	/** Verification status */
	verificationStatus: varchar("verification_status", {
		enum: ["unverified", "auto_verified", "human_verified", "external_verified"],
	})
		.notNull()
		.default("unverified"),

	/** AI confidence score (0-100) */
	aiConfidence: integer("ai_confidence"),

	// Data ownership & portability

	/** Who owns this evidence */
	dataOwnership: varchar("data_ownership", {
		enum: ["candidate", "organisation"],
	})
		.notNull()
		.default("organisation"),

	/** Whether candidate has consented to sharing */
	consentedToShare: boolean("consented_to_share").notNull().default(false),

	/** Jurisdiction this evidence is valid in */
	jurisdiction: text("jurisdiction"),

	// Document/file info

	/** Storage path for document */
	filePath: text("file_path"),

	/** Original filename */
	fileName: text("file_name"),

	/** MIME type */
	mimeType: text("mime_type"),

	/** File size in bytes */
	fileSize: integer("file_size"),

	// Dates

	/** When the evidence was issued/created (e.g., certificate date) */
	issuedAt: timestamp("issued_at"),

	/** When the evidence expires */
	expiresAt: timestamp("expires_at"),

	/** When the evidence was verified */
	verifiedAt: timestamp("verified_at"),

	/** Who verified the evidence */
	verifiedBy: uuid("verified_by"),

	// Extracted/captured data

	/** Structured data extracted from the evidence */
	extractedData: jsonb("extracted_data").$type<Record<string, unknown>>(),

	/** Form responses if evidence type is form */
	formResponses: jsonb("form_responses").$type<Record<string, unknown>>(),

	/** External check results */
	checkResult: jsonb("check_result").$type<Record<string, unknown>>(),

	/** Rejection reason if rejected */
	rejectionReason: text("rejection_reason"),

	/** Admin notes */
	notes: text("notes"),

	/** Flexible custom fields */
	customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;
