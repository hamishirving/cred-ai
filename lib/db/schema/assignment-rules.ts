/**
 * AssignmentRule - When a package applies.
 *
 * @description Automatic package assignment
 * @purpose Role-based, location-based, job-based requirement assignment
 * @see DATA_MODEL.md#assignmentrule
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
import { compliancePackages } from "./compliance-packages";
import { roles } from "./roles";
import { workNodeTypes } from "./work-node-types";

/**
 * AssignmentRules determine when a CompliancePackage applies.
 *
 * Rules are evaluated when a placement is created to determine
 * which packages (and therefore elements) are required.
 *
 * Example: "NHS Band 5 Nurse at any Hospital requires NHS Nurse Package"
 */
export const assignmentRules = pgTable("assignment_rules", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation owns this rule */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** The package to assign when conditions match */
	packageId: uuid("package_id")
		.notNull()
		.references(() => compliancePackages.id),

	/** Rule name for admin reference */
	name: text("name").notNull(),

	/** Description of when this rule applies */
	description: text("description"),

	// Matching conditions (all must match if set)

	/** Match specific role (e.g., assign to all Nurses) */
	roleId: uuid("role_id").references(() => roles.id),

	/** Match specific work node type (e.g., assign to all Hospital placements) */
	workNodeTypeId: uuid("work_node_type_id").references(() => workNodeTypes.id),

	/** Match specific jurisdictions */
	jurisdictions: jsonb("jurisdictions").$type<string[]>(),

	/** Scope of org hierarchy matching */
	orgScope: varchar("org_scope", {
		enum: ["exact", "children", "all"],
	})
		.notNull()
		.default("all"),

	/** Priority when multiple rules match (higher = applied first) */
	priority: uuid("priority").notNull().defaultRandom(),

	/** Whether this rule is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AssignmentRule = typeof assignmentRules.$inferSelect;
export type NewAssignmentRule = typeof assignmentRules.$inferInsert;
