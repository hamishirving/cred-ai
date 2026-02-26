/**
 * FA Screenings - Persistent First Advantage screening records.
 *
 * @description Stores background screening state from First Advantage.
 * Replaces agent memory and mock client in-memory store as the
 * source of truth for screening status.
 */
import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { profiles } from "./profiles";
import { placements } from "./placements";
import type { FAReportItem } from "@/lib/api/first-advantage/types";

export const faScreenings = pgTable("fa_screenings", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Organisation this screening belongs to */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Candidate being screened */
	profileId: uuid("profile_id")
		.notNull()
		.references(() => profiles.id),

	/** Placement context (nullable — screening may not be placement-linked) */
	placementId: uuid("placement_id").references(() => placements.id),

	/** FA's numeric string screening ID (unique — drives upsert) */
	faScreeningId: text("fa_screening_id").notNull().unique(),

	/** FA candidate ID */
	faCandidateId: text("fa_candidate_id").notNull(),

	/** FA package ID */
	faPackageId: text("fa_package_id").notNull(),

	/** Overall screening status */
	status: varchar("status", {
		enum: ["Pending", "In Progress", "Complete"],
	})
		.notNull()
		.default("Pending"),

	/** Overall screening result */
	result: varchar("result", {
		enum: ["Pending", "Clear", "Consider", "Adverse"],
	})
		.notNull()
		.default("Pending"),

	/** Per-component breakdown from FA */
	reportItems: jsonb("report_items").$type<FAReportItem[]>().default([]),

	/** Sterling portal link */
	portalUrl: text("portal_url"),

	/** When submitted to FA */
	submittedAt: timestamp("submitted_at"),

	/** FA's estimated completion time */
	estimatedCompletionAt: timestamp("estimated_completion_at"),

	/** Full FA response for audit */
	rawResponse: jsonb("raw_response").$type<Record<string, unknown>>(),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type FAScreeningRecord = typeof faScreenings.$inferSelect;
export type NewFAScreeningRecord = typeof faScreenings.$inferInsert;
