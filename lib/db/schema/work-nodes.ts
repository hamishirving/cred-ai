/**
 * WorkNode - Where work happens.
 *
 * @description Unified entity replacing Client/Facility/OrgUnit
 * @purpose Customer-defined structures, jurisdiction-based compliance, multi-org visibility
 * @see DATA_MODEL.md#worknode
 */
import {
	boolean,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { workNodeTypes } from "./work-node-types";

/**
 * WorkNodes are the "where work happens" entity.
 *
 * Replaces the rigid Client/Facility/OrgUnit hierarchy with a flexible
 * user-defined structure. The type determines what level this node is.
 *
 * Examples:
 * - A "Hospital" WorkNode of type "Hospital"
 * - A "Ward A" WorkNode of type "Ward" with parent = the Hospital
 */
export const workNodes = pgTable("work_nodes", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation owns this node */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** What type/level this node is */
	typeId: uuid("type_id")
		.notNull()
		.references(() => workNodeTypes.id),

	/** Display name */
	name: text("name").notNull(),

	/** Parent node for hierarchy (null = root node) */
	parentId: uuid("parent_id"),

	/** Regulatory jurisdiction (e.g., "england", "scotland", "california") */
	jurisdiction: text("jurisdiction"),

	/** Other orgs that can see this node (MSP scenarios) */
	visibleToOrgIds: jsonb("visible_to_org_ids").$type<string[]>(),

	/** Address or location info */
	address: text("address"),

	/** Flexible custom fields */
	customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

	/** Whether this node is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WorkNode = typeof workNodes.$inferSelect;
export type NewWorkNode = typeof workNodes.$inferInsert;
