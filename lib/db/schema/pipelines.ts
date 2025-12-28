/**
 * Pipeline - Configurable multi-stage journey.
 *
 * @description Replace hardcoded status fields
 * @purpose Custom pipelines per entity type, stage ownership
 * @see DATA_MODEL.md#pipeline
 */
import {
	boolean,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

/**
 * Pipelines define multi-stage journeys that entities go through.
 *
 * Different teams can own different stages, enabling clear handoffs
 * and accountability. Pipelines replace hardcoded status fields.
 *
 * Examples: "Agency Onboarding", "Client Compliance Check", "Renewal Process"
 */
export const pipelines = pgTable("pipelines", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation owns this pipeline */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Pipeline name */
	name: text("name").notNull(),

	/** Description */
	description: text("description"),

	/** What entity type this pipeline applies to */
	appliesTo: varchar("applies_to", {
		enum: ["profile", "application", "placement"],
	}).notNull(),

	/** Whether this is the default pipeline for its entity type */
	isDefault: boolean("is_default").notNull().default(false),

	/** Whether this pipeline is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Pipeline = typeof pipelines.$inferSelect;
export type NewPipeline = typeof pipelines.$inferInsert;
