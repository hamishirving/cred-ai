/**
 * Reference Contacts - People who can provide references for candidates.
 *
 * @description Stores referee details and captured reference data
 * @purpose Voice reference checks, employment verification
 * @see PLAN-AGENT-HARNESS-ARCHITECTURE.md
 */
import {
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { organisations } from "./organisations";

/**
 * Reference contacts hold details of people who can verify
 * a candidate's employment history and suitability.
 */
export const referenceContacts = pgTable("reference_contacts", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Candidate this reference is for */
	profileId: uuid("profile_id")
		.notNull()
		.references(() => profiles.id),

	/** Organisation context */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Referee's full name */
	refereeName: text("referee_name").notNull(),

	/** Referee's email address */
	refereeEmail: text("referee_email"),

	/** Referee's phone number (E.164 format) */
	refereePhone: text("referee_phone").notNull(),

	/** Referee's job title */
	refereeJobTitle: text("referee_job_title"),

	/** Organisation the referee works at */
	refereeOrganisation: text("referee_organisation").notNull(),

	/** Relationship to candidate */
	relationship: varchar("relationship", {
		enum: ["line_manager", "colleague", "hr_department", "other"],
	})
		.notNull()
		.default("line_manager"),

	/** Job title the candidate held */
	candidateJobTitle: text("candidate_job_title"),

	/** When the candidate started (YYYY-MM format) */
	candidateStartDate: text("candidate_start_date"),

	/** When the candidate left (YYYY-MM format) */
	candidateEndDate: text("candidate_end_date"),

	/** Current reference check status */
	status: varchar("status", {
		enum: ["pending", "contacted", "completed", "failed"],
	})
		.notNull()
		.default("pending"),

	/** Data captured during the reference check */
	capturedData: jsonb("captured_data").$type<Record<string, unknown>>(),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ReferenceContact = typeof referenceContacts.$inferSelect;
export type NewReferenceContact = typeof referenceContacts.$inferInsert;
