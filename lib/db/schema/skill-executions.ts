/**
 * Skill Executions — Activity log for skill runs.
 *
 * Every skill execution is recorded with full step-by-step audit trail.
 */

import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import type { SkillStep } from "@/lib/ai/skills/types";

/**
 * skill_executions table — audit trail for every skill run.
 */
export const skillExecutions = pgTable("skill_executions", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which skill ran */
	skillId: text("skill_id").notNull(),

	/** Organisation context */
	orgId: uuid("org_id"),

	/** User who triggered the execution */
	userId: uuid("user_id"),

	/** How the skill was triggered */
	triggerType: varchar("trigger_type", {
		enum: ["manual", "schedule", "event"],
		length: 10,
	})
		.notNull()
		.default("manual"),

	/** Current status */
	status: varchar("status", {
		enum: ["running", "completed", "failed", "escalated"],
		length: 15,
	})
		.notNull()
		.default("running"),

	/** Input provided to the skill */
	input: jsonb("input").$type<Record<string, unknown>>(),

	/** Steps taken during execution (full audit trail) */
	steps: jsonb("steps").$type<SkillStep[]>().default([]),

	/** Final output / summary */
	output: jsonb("output").$type<Record<string, unknown>>(),

	/** Token usage */
	tokensUsed: jsonb("tokens_used").$type<{
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	}>(),

	/** Model used */
	model: text("model"),

	/** Total execution time in ms */
	durationMs: integer("duration_ms"),

	/** When execution started */
	startedAt: timestamp("started_at").notNull().defaultNow(),

	/** When execution completed */
	completedAt: timestamp("completed_at"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SkillExecution = typeof skillExecutions.$inferSelect;
export type NewSkillExecution = typeof skillExecutions.$inferInsert;
