/**
 * SkillCategory - Hierarchical skill grouping.
 *
 * @description Organise skills into logical groups
 * @purpose Clinical Skills -> Resuscitation -> BLS/ILS/ALS
 * @see DATA_MODEL.md#skillcategory
 */
import {
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { skillFrameworks } from "./skill-frameworks";

/**
 * SkillCategories organise skills hierarchically.
 *
 * Categories can be nested (parentId) to create hierarchies like:
 * Clinical Skills -> Resuscitation -> (BLS, ILS, ALS skills)
 *
 * Categories can come from a framework template or be org-defined.
 */
export const skillCategories = pgTable("skill_categories", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Organisation that owns this category (null = from framework template) */
	organisationId: uuid("organisation_id").references(() => organisations.id),

	/** Framework this category belongs to (null = org custom) */
	frameworkId: uuid("framework_id").references(() => skillFrameworks.id),

	/** Display name (e.g., "Clinical Skills", "Resuscitation") */
	name: text("name").notNull(),

	/** Description */
	description: text("description"),

	/** Parent category for nesting (null = top level) */
	parentId: uuid("parent_id"),

	/** Display order */
	displayOrder: integer("display_order").notNull().default(0),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SkillCategory = typeof skillCategories.$inferSelect;
export type NewSkillCategory = typeof skillCategories.$inferInsert;
