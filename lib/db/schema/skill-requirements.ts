/**
 * SkillRequirement - Skills required for job/shift.
 *
 * @description Define what skills are needed
 * @purpose Workforce matching, rostering integration
 * @see DATA_MODEL.md#skillrequirement
 */
import {
	boolean,
	jsonb,
	pgTable,
	text,
	uuid,
	varchar,
	timestamp,
} from "drizzle-orm/pg-core";
import { skills } from "./skills";

/**
 * SkillRequirements define what skills are needed for entities.
 *
 * Used for workforce matching - rostering systems can define
 * skill requirements for shifts/jobs and query candidates
 * who meet those requirements.
 */
export const skillRequirements = pgTable("skill_requirements", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** What type of entity requires this skill */
	entityType: varchar("entity_type", {
		enum: ["job", "shift", "procedure", "work_node"],
	}).notNull(),

	/** ID of the entity that requires this skill */
	entityId: uuid("entity_id").notNull(),

	/** The skill required */
	skillId: uuid("skill_id")
		.notNull()
		.references(() => skills.id),

	/** Whether this skill is required (true) or preferred (false) */
	isRequired: boolean("is_required").notNull().default(true),

	/** Minimum proficiency level if skill has levels */
	minimumProficiency: varchar("minimum_proficiency"),

	/** Context required (e.g., must have skill in paediatric setting) */
	contextRequired: jsonb("context_required").$type<string[]>(),

	/** How recently skill must have been used (ISO 8601 duration) */
	recencyRequired: text("recency_required"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SkillRequirement = typeof skillRequirements.$inferSelect;
export type NewSkillRequirement = typeof skillRequirements.$inferInsert;
