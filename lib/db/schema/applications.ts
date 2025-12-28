/**
 * Application - Candidate applying to a job.
 *
 * @description Track application journey
 * @purpose Pre-placement compliance, application pipeline
 * @see DATA_MODEL.md#application
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
import { jobs } from "./jobs";

/**
 * Applications track candidates applying to jobs.
 *
 * Part of the ATS expansion path (Job -> Application -> Placement).
 * Pre-placement compliance can begin during the application phase.
 * When accepted, an Application creates a Placement.
 */
export const applications = pgTable("applications", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** The candidate applying */
	profileId: uuid("profile_id")
		.notNull()
		.references(() => profiles.id),

	/** The job being applied for */
	jobId: uuid("job_id")
		.notNull()
		.references(() => jobs.id),

	/** Application status */
	status: varchar("status", {
		enum: [
			"applied",
			"screening",
			"interview",
			"offered",
			"accepted",
			"rejected",
			"withdrawn",
		],
	})
		.notNull()
		.default("applied"),

	/** Cover letter or application notes */
	coverLetter: text("cover_letter"),

	/** Withdrawal reason if withdrawn */
	withdrawalReason: text("withdrawal_reason"),

	/** Rejection reason if rejected */
	rejectionReason: text("rejection_reason"),

	/** When the application was submitted */
	appliedAt: timestamp("applied_at").notNull().defaultNow(),

	/** When the status last changed */
	statusChangedAt: timestamp("status_changed_at"),

	/** Flexible custom fields */
	customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
