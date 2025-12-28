/**
 * Placement - Active assignment for a candidate.
 *
 * @description Where and when someone is working
 * @purpose Placement-scoped compliance, location-specific requirements
 * @see DATA_MODEL.md#placement
 */
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { profiles } from "./profiles";
import { workNodes } from "./work-nodes";
import { roles } from "./roles";
import { applications } from "./applications";

/**
 * Placements represent active work assignments.
 *
 * A placement is where and when a candidate is working.
 * Placement-scoped compliance elements are tracked here,
 * while candidate-scoped compliance is on the profile.
 */
export const placements = pgTable("placements", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation owns this placement */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** The candidate being placed */
	profileId: uuid("profile_id")
		.notNull()
		.references(() => profiles.id),

	/** Where the placement is */
	workNodeId: uuid("work_node_id")
		.notNull()
		.references(() => workNodes.id),

	/** What role they're filling */
	roleId: uuid("role_id")
		.notNull()
		.references(() => roles.id),

	/** Application this placement came from (if any) */
	applicationId: uuid("application_id").references(() => applications.id),

	/** Placement status */
	status: varchar("status", {
		enum: [
			"pending",
			"onboarding",
			"compliance",
			"ready",
			"active",
			"completed",
			"cancelled",
		],
	})
		.notNull()
		.default("pending"),

	/** Compliance completion percentage */
	compliancePercentage: integer("compliance_percentage").notNull().default(0),

	/** Whether placement is fully compliant */
	isCompliant: boolean("is_compliant").notNull().default(false),

	/** When the placement starts */
	startDate: timestamp("start_date"),

	/** When the placement ends (null = ongoing) */
	endDate: timestamp("end_date"),

	/** Job reference or PO number */
	reference: text("reference"),

	/** Additional notes */
	notes: text("notes"),

	/** Computed packages for this placement (cached) */
	packageIds: jsonb("package_ids").$type<string[]>(),

	/** Flexible custom fields */
	customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

	/** Whether this placement is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Placement = typeof placements.$inferSelect;
export type NewPlacement = typeof placements.$inferInsert;
