/**
 * WorkNodeType - User-defined hierarchy level type.
 *
 * @description Flexible location hierarchy where customers define their own levels
 * @purpose Customers define their own levels (Trust, Hospital, Ward, State, etc.)
 * @see DATA_MODEL.md#worknodetype
 */
import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

/**
 * WorkNodeTypes define the hierarchy levels an org uses.
 *
 * Examples:
 * - NHS: Trust (level 0) → Hospital (level 1) → Ward (level 2)
 * - US: State (level 0) → Health System (level 1) → Facility (level 2) → Unit (level 3)
 */
export const workNodeTypes = pgTable("work_node_types", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation this type belongs to */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Display name (e.g., "Hospital", "Ward", "Trust") */
	name: text("name").notNull(),

	/** URL-friendly identifier */
	slug: text("slug").notNull(),

	/** Level in hierarchy (0 = top level) */
	level: integer("level").notNull().default(0),

	/** Description for admins */
	description: text("description"),

	/** Whether nodes of this type can have children */
	allowsChildren: boolean("allows_children").notNull().default(true),

	/** Whether this type is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WorkNodeType = typeof workNodeTypes.$inferSelect;
export type NewWorkNodeType = typeof workNodeTypes.$inferInsert;
