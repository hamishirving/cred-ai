/**
 * Agent Memory - Persistent memory for AI agents.
 *
 * @description Key-value memory store scoped per agent + subject + org
 * @purpose Allow agents to remember context across runs (tone, progress, history)
 * @see PLAN-AGENT-HARNESS-ARCHITECTURE.md
 */
import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

/**
 * Agent memory stores persistent state for agents across executions.
 *
 * Keyed by (agentId, subjectId, orgId) so each agent maintains
 * separate memory per candidate per organisation.
 */
export const agentMemory = pgTable(
	"agent_memory",
	{
		id: uuid("id").primaryKey().notNull().defaultRandom(),

		/** Agent identifier (e.g. "onboarding-companion") */
		agentId: text("agent_id").notNull(),

		/** Subject this memory relates to (usually a profile ID) */
		subjectId: uuid("subject_id").notNull(),

		/** Organisation scope */
		orgId: uuid("org_id").notNull(),

		/** Flexible memory payload */
		memory: jsonb("memory")
			.$type<Record<string, unknown>>()
			.notNull()
			.default({}),

		/** When the agent last ran for this subject */
		lastRunAt: timestamp("last_run_at").notNull().defaultNow(),

		/** How many times the agent has run for this subject */
		runCount: integer("run_count").notNull().default(0),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("agent_memory_composite_idx").on(
			table.agentId,
			table.subjectId,
			table.orgId,
		),
	],
);

export type AgentMemory = typeof agentMemory.$inferSelect;
export type NewAgentMemory = typeof agentMemory.$inferInsert;
