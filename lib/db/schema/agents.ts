/**
 * Agents — DB-backed agent definitions.
 *
 * Stores agent configuration including trigger, conditions, and oversight.
 * Code-defined agents are seeded into this table on first run.
 */

import {
	boolean,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

/**
 * Trigger configuration for when an agent should run.
 */
export type AgentTrigger = {
	type: "manual" | "schedule" | "event";
	/** Cron expression (when type = 'schedule') */
	cron?: string;
	/** Timezone for cron (when type = 'schedule') */
	timezone?: string;
	/** Event name (when type = 'event') */
	eventName?: string;
	/** Human-readable description */
	description?: string;
};

/**
 * A single filter condition.
 */
export type Condition = {
	property: string;
	operator: "equals" | "not_equals" | "contains" | "in" | "not_in";
	value: string | string[];
};

/**
 * A group of conditions joined by AND or OR.
 */
export type ConditionGroup = {
	operator: "AND" | "OR";
	conditions: Condition[];
};

/**
 * Top-level conditions: array of groups joined by OR.
 * Within each group, conditions are joined by AND.
 */
export type AgentConditions = ConditionGroup[];

/**
 * Oversight configuration.
 */
export type AgentOversight = {
	mode: "auto" | "review-before" | "notify-after";
};

/**
 * Execution constraints.
 */
export type AgentConstraints = {
	maxSteps: number;
	maxExecutionTime: number;
};

/**
 * Input field metadata.
 */
export type AgentInputField = {
	key: string;
	label: string;
	description: string;
	required: boolean;
	defaultValue?: string;
};

/**
 * agents table — persistent agent definitions.
 */
export const agents = pgTable("agents", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Unique code identifier (e.g. "verify-bls-certificate") */
	code: text("code").unique().notNull(),

	/** Human-readable name */
	name: text("name").notNull(),

	/** What this agent does */
	description: text("description").notNull(),

	/** Agent version */
	version: text("version").notNull().default("1.0"),

	/** Layer 3 prompt — agent-specific instructions */
	systemPrompt: text("system_prompt").notNull(),

	/** Tool names this agent can access */
	tools: text("tools").array().notNull().default([]),

	/** Input field metadata */
	inputFields: jsonb("input_fields").$type<AgentInputField[]>().notNull().default([]),

	/** Execution constraints */
	constraints: jsonb("constraints").$type<AgentConstraints>().notNull().default({
		maxSteps: 10,
		maxExecutionTime: 60000,
	}),

	/** Trigger configuration */
	trigger: jsonb("trigger").$type<AgentTrigger>().notNull().default({
		type: "manual",
	}),

	/** Oversight configuration */
	oversight: jsonb("oversight").$type<AgentOversight>().notNull().default({
		mode: "auto",
	}),

	/** PostHog-style condition filter groups */
	conditions: jsonb("conditions").$type<AgentConditions>(),

	/** Organisation ID (NULL = global agent) */
	orgId: uuid("org_id"),

	/** Whether this agent is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
