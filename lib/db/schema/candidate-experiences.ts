/**
 * CandidateExperience - Environment/context experience.
 *
 * @description Track where candidate has worked
 * @purpose ER vs ICU vs Ward experience for matching
 * @see DATA_MODEL.md#candidateexperience
 */
import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

/**
 * CandidateExperience tracks environment/context experience.
 *
 * Can be derived from placement history or explicitly declared.
 * Used for workforce matching - rostering systems query candidates
 * by experience in specific environments.
 *
 * Examples: "Emergency Department", "ICU", "Cardiac Surgery"
 */
export const candidateExperiences = pgTable("candidate_experiences", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** The candidate with this experience */
	profileId: uuid("profile_id")
		.notNull()
		.references(() => profiles.id),

	/** Type of experience */
	type: varchar("type", {
		enum: ["environment", "speciality", "procedure"],
	}).notNull(),

	/** Name of the experience (e.g., "Emergency Department", "Cardiac Surgery") */
	name: text("name").notNull(),

	/** Description */
	description: text("description"),

	/** Placements that contributed to this experience (future - rostering feedback) */
	derivedFromPlacementIds: jsonb("derived_from_placement_ids").$type<string[]>(),

	// Experience metrics (for matching)

	/** Last worked in this context */
	recency: timestamp("recency"),

	/** Total time in this context (ISO 8601 duration) */
	duration: text("duration"),

	/** Procedure count if applicable */
	volume: integer("volume"),

	/** How this experience was verified */
	verificationStatus: varchar("verification_status", {
		enum: ["unverified", "placement_derived", "reference_verified"],
	})
		.notNull()
		.default("unverified"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CandidateExperience = typeof candidateExperiences.$inferSelect;
export type NewCandidateExperience = typeof candidateExperiences.$inferInsert;
