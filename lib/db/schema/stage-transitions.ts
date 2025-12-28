/**
 * StageTransition - Record of a stage change.
 *
 * @description Audit trail for journey
 * @purpose History of who moved what, when, why
 * @see DATA_MODEL.md#stagetransition
 */
import {
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { pipelineStages } from "./pipeline-stages";

/**
 * StageTransitions record the history of pipeline movements.
 *
 * This provides an audit trail of who moved what entity,
 * when, and why.
 */
export const stageTransitions = pgTable("stage_transitions", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Type of entity that moved */
	entityType: varchar("entity_type", {
		enum: ["profile", "application", "placement"],
	}).notNull(),

	/** ID of the entity that moved */
	entityId: uuid("entity_id").notNull(),

	/** Stage moved from */
	fromStageId: uuid("from_stage_id").references(() => pipelineStages.id),

	/** Stage moved to */
	toStageId: uuid("to_stage_id")
		.notNull()
		.references(() => pipelineStages.id),

	/** How the transition happened */
	transitionType: varchar("transition_type", {
		enum: ["manual", "auto_advance", "escalation", "system"],
	}).notNull(),

	/** Who triggered the transition (null if automatic) */
	triggeredBy: uuid("triggered_by"),

	/** Reason for the transition */
	reason: text("reason"),

	/** When the transition occurred */
	transitionedAt: timestamp("transitioned_at").notNull().defaultNow(),

	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StageTransition = typeof stageTransitions.$inferSelect;
export type NewStageTransition = typeof stageTransitions.$inferInsert;
