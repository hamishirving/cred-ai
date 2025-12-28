/**
 * Job - Position/opening to be filled.
 *
 * @description ATS-style job postings
 * @purpose Future CRM expansion, requirement preview at application time
 * @see DATA_MODEL.md#job
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
import { workNodes } from "./work-nodes";
import { roles } from "./roles";

/**
 * Jobs represent positions/openings to be filled.
 *
 * Part of the ATS expansion path (Job -> Application -> Placement).
 * When a candidate applies, the system can immediately resolve
 * what compliance is needed based on role + workNode + job-specific packages.
 */
export const jobs = pgTable("jobs", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation owns this job */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Where this job is located */
	workNodeId: uuid("work_node_id")
		.notNull()
		.references(() => workNodes.id),

	/** What role this job is for */
	roleId: uuid("role_id")
		.notNull()
		.references(() => roles.id),

	/** Job title */
	title: text("title").notNull(),

	/** Job description */
	description: text("description"),

	/** Job status */
	status: varchar("status", {
		enum: ["draft", "open", "filled", "closed", "cancelled"],
	})
		.notNull()
		.default("draft"),

	/** Number of positions available */
	positionsAvailable: integer("positions_available").notNull().default(1),

	/** Number of positions filled */
	positionsFilled: integer("positions_filled").notNull().default(0),

	/** When the job was posted */
	postedAt: timestamp("posted_at"),

	/** Application deadline */
	closingDate: timestamp("closing_date"),

	/** When the job starts */
	startDate: timestamp("start_date"),

	/** Expected duration (ISO 8601 duration) */
	duration: text("duration"),

	/** Rate/salary information */
	compensation: jsonb("compensation").$type<{
		type?: "hourly" | "daily" | "salary";
		amount?: number;
		currency?: string;
	}>(),

	/** Additional packages specific to this job */
	additionalPackageIds: jsonb("additional_package_ids").$type<string[]>(),

	/** Flexible custom fields */
	customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

	/** Whether this job is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
