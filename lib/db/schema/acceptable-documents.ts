/**
 * AcceptableDocument - Defines what document types satisfy a compliance element.
 *
 * @description Each compliance element can accept multiple document types,
 * each with its own acceptance criteria (facility instructions).
 * This is the key model for instruction-based verification.
 */
import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { complianceElements } from "./compliance-elements";

export const acceptableDocuments = pgTable("acceptable_documents", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which compliance element this document type satisfies */
	complianceElementId: uuid("compliance_element_id")
		.notNull()
		.references(() => complianceElements.id),

	/** Display name (e.g. "MMR Titer Lab Result") */
	name: text("name").notNull(),

	/** Category of document */
	documentType: varchar("document_type", {
		enum: [
			"vaccination_record",
			"titer_result",
			"declination_form",
			"certificate",
			"clearance_letter",
			"screening_result",
			"consent_form",
			"other",
		],
	}).notNull(),

	/** Specialist instructions for verifying this document type */
	acceptanceCriteria: text("acceptance_criteria"),

	/** Guidance text to show the clinician/candidate */
	clinicianGuidance: text("clinician_guidance"),

	/** Whether this is the preferred, alternative, or conditional acceptance path */
	status: varchar("status", {
		enum: ["preferred", "alternative", "conditional"],
	})
		.notNull()
		.default("preferred"),

	/** Display order (lower = higher priority) */
	priority: integer("priority").notNull().default(1),

	/** Whether this document type is currently accepted */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AcceptableDocument = typeof acceptableDocuments.$inferSelect;
export type NewAcceptableDocument = typeof acceptableDocuments.$inferInsert;
