/**
 * Skill - Individual skill definition.
 *
 * @description Define what capabilities to track
 * @purpose Granular skill tracking with verification type and expiry
 * @see DATA_MODEL.md#skill
 */
import {
	boolean,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { skillCategories } from "./skill-categories";

/**
 * Skills define individual capabilities that can be tracked.
 *
 * Skills are verified via compliance elements - when a candidate
 * completes training, they gain the associated skills.
 *
 * Examples: Basic Life Support, IV Cannulation, Ventilator Management
 */
export const skills = pgTable("skills", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Category this skill belongs to */
	categoryId: uuid("category_id")
		.notNull()
		.references(() => skillCategories.id),

	/** Organisation that owns this skill (null = from framework template) */
	organisationId: uuid("organisation_id").references(() => organisations.id),

	/** Standard code if from a framework */
	code: text("code"),

	/** Display name (e.g., "IV Cannulation", "Basic Life Support") */
	name: text("name").notNull(),

	/** Description */
	description: text("description"),

	/** How this skill is verified */
	verificationType: varchar("verification_type", {
		enum: ["evidence", "assessment", "self_declared", "attestation"],
	})
		.notNull()
		.default("evidence"),

	/** Proficiency levels if applicable (e.g., ["Foundation", "Competent", "Expert"]) */
	proficiencyLevels: jsonb("proficiency_levels").$type<string[]>(),

	/** Validity period in ISO 8601 duration (e.g., "P1Y" = 1 year) */
	validityPeriod: text("validity_period"),

	/** Whether this skill is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;
