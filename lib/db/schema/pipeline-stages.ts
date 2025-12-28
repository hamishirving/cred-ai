/**
 * PipelineStage - Single stage in a pipeline.
 *
 * @description Define journey steps
 * @purpose Stage ownership, auto-advance rules, SLAs
 * @see DATA_MODEL.md#pipelinestage
 */
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { pipelines } from "./pipelines";
import { roles } from "./roles";

/**
 * Auto-advance conditions for stages.
 */
export interface AutoAdvanceCondition {
	type: "compliance_complete" | "time_elapsed" | "manual_trigger";
	threshold?: number;
	durationDays?: number;
}

/**
 * Actions triggered on stage enter/exit.
 */
export interface StageAction {
	trigger: "enter" | "exit";
	type: "notification" | "assignment" | "webhook";
	config: Record<string, unknown>;
}

/**
 * PipelineStages define the steps in a pipeline journey.
 *
 * Each stage can have:
 * - An owner team/role responsible for entities in that stage
 * - Auto-advance conditions (e.g., move when compliance = 100%)
 * - SLA/escalation timing
 * - Actions triggered on enter/exit
 */
export const pipelineStages = pgTable("pipeline_stages", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which pipeline this stage belongs to */
	pipelineId: uuid("pipeline_id")
		.notNull()
		.references(() => pipelines.id, { onDelete: "cascade" }),

	/** Stage name (e.g., "Onboarding", "Compliance", "QA Review") */
	name: text("name").notNull(),

	/** Description */
	description: text("description"),

	/** Order in the pipeline (0 = first) */
	stageOrder: integer("stage_order").notNull().default(0),

	/** Role that owns this stage */
	ownerRoleId: uuid("owner_role_id").references(() => roles.id),

	/** Target days to complete this stage */
	targetDays: integer("target_days"),

	/** Days after which to escalate */
	escalateAfterDays: integer("escalate_after_days"),

	/** Role to escalate to */
	escalateToRoleId: uuid("escalate_to_role_id").references(() => roles.id),

	/** Conditions that trigger automatic advancement */
	autoAdvanceConditions: jsonb("auto_advance_conditions").$type<
		AutoAdvanceCondition[]
	>(),

	/** Actions triggered on enter/exit */
	actions: jsonb("actions").$type<StageAction[]>(),

	/** Whether entities can move backwards from this stage */
	allowBackward: boolean("allow_backward").notNull().default(true),

	/** Whether this is a terminal stage (end of pipeline) */
	isTerminal: boolean("is_terminal").notNull().default(false),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PipelineStage = typeof pipelineStages.$inferSelect;
export type NewPipelineStage = typeof pipelineStages.$inferInsert;
