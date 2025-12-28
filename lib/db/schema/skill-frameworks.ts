/**
 * SkillFramework - Standard skill taxonomy template.
 *
 * @description Provide industry frameworks as starting point
 * @purpose UK Core Skills, NHS KSF, custom frameworks
 * @see DATA_MODEL.md#skillframework
 */
import {
	boolean,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

/**
 * SkillFrameworks provide standard skill taxonomies.
 *
 * System templates (isTemplate=true) provide industry standards like
 * UK Core Skills Training Framework. Orgs can adopt these and customise.
 *
 * Examples: UK CSTF, NHS KSF, ANCC Certifications
 */
export const skillFrameworks = pgTable("skill_frameworks", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Framework code (e.g., "uk-cstf", "nhs-ksf", "us-ancc") */
	code: text("code").notNull().unique(),

	/** Display name */
	name: text("name").notNull(),

	/** Description of the framework */
	description: text("description"),

	/** Jurisdiction this framework applies to */
	jurisdiction: text("jurisdiction"),

	/** Version of the framework */
	version: text("version"),

	/** Whether this is a system-provided template */
	isTemplate: boolean("is_template").notNull().default(false),

	/** Whether this framework is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SkillFramework = typeof skillFrameworks.$inferSelect;
export type NewSkillFramework = typeof skillFrameworks.$inferInsert;
