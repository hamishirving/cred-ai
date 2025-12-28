/**
 * EntityStagePosition - Where an entity is in its pipeline.
 *
 * @description Track current position
 * @purpose Pipeline views, stage history
 * @see DATA_MODEL.md#entitystageposition
 */
import {
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { pipelines } from "./pipelines";
import { pipelineStages } from "./pipeline-stages";

/**
 * EntityStagePosition tracks where an entity is in its pipeline.
 *
 * This enables pipeline views (kanban boards) and tracks how long
 * entities have been in each stage.
 */
export const entityStagePositions = pgTable("entity_stage_positions", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Type of entity (profile, application, placement) */
	entityType: varchar("entity_type", {
		enum: ["profile", "application", "placement"],
	}).notNull(),

	/** ID of the entity */
	entityId: uuid("entity_id").notNull(),

	/** Which pipeline the entity is in */
	pipelineId: uuid("pipeline_id")
		.notNull()
		.references(() => pipelines.id),

	/** Current stage in the pipeline */
	currentStageId: uuid("current_stage_id")
		.notNull()
		.references(() => pipelineStages.id),

	/** When the entity entered the current stage */
	enteredStageAt: timestamp("entered_stage_at").notNull().defaultNow(),

	/** Who moved the entity to this stage */
	movedBy: uuid("moved_by"),

	/** Expected completion date for this stage */
	dueAt: timestamp("due_at"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type EntityStagePosition = typeof entityStagePositions.$inferSelect;
export type NewEntityStagePosition = typeof entityStagePositions.$inferInsert;
