/**
 * ComplianceGap - Missing or problematic requirement.
 *
 * @description Computed gap analysis
 * @purpose Gap-driven AI chasing, clear action items
 * @see DATA_MODEL.md#compliancegap
 *
 * Note: In production, gaps may be computed dynamically rather than stored.
 * This table supports caching/materializing gap state for performance.
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
import { placements } from "./placements";
import { complianceElements } from "./compliance-elements";

/**
 * ComplianceGaps represent missing or problematic requirements.
 *
 * Gaps drive the AI chasing system - they tell us what's missing
 * and who we're waiting on.
 */
export const complianceGaps = pgTable("compliance_gaps", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Profile this gap is for */
	profileId: uuid("profile_id")
		.notNull()
		.references(() => profiles.id),

	/** Placement this gap is for (null if candidate-scoped) */
	placementId: uuid("placement_id").references(() => placements.id),

	/** The compliance element that's missing/problematic */
	complianceElementId: uuid("compliance_element_id")
		.notNull()
		.references(() => complianceElements.id),

	/** Type of gap */
	gapType: varchar("gap_type", {
		enum: ["missing", "expired", "expiring_soon", "rejected", "pending_review"],
	}).notNull(),

	/** Who we're waiting on */
	waitingOn: varchar("waiting_on", {
		enum: ["candidate", "admin", "third_party", "system"],
	}).notNull(),

	/** Current gap status */
	status: varchar("status", {
		enum: ["open", "in_progress", "resolved", "waived"],
	})
		.notNull()
		.default("open"),

	/** Priority level */
	priority: varchar("priority", {
		enum: ["low", "medium", "high", "critical"],
	})
		.notNull()
		.default("medium"),

	/** When the gap was identified */
	identifiedAt: timestamp("identified_at").notNull().defaultNow(),

	/** When the gap should be resolved by */
	dueAt: timestamp("due_at"),

	/** When the gap was last chased */
	lastChasedAt: timestamp("last_chased_at"),

	/** Number of times this gap has been chased */
	chaseCount: text("chase_count"),

	/** When the gap was resolved */
	resolvedAt: timestamp("resolved_at"),

	/** Resolution details */
	resolution: jsonb("resolution").$type<{
		type?: "evidence_provided" | "waived" | "substituted" | "not_required";
		evidenceId?: string;
		waivedBy?: string;
		waivedReason?: string;
	}>(),

	/** AI-generated action for this gap */
	suggestedAction: text("suggested_action"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ComplianceGap = typeof complianceGaps.$inferSelect;
export type NewComplianceGap = typeof complianceGaps.$inferInsert;
