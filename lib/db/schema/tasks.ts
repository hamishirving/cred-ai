/**
 * Tasks - In-app tasks for staff (compliance managers, recruiters).
 *
 * @description AI-generated or manual tasks for internal staff
 * @purpose Track actionable items from AI agents, enable task-based workflows
 * @see docs/PRD-AI-AGENTS.md#tasks-system
 */
import {
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { profiles } from "./profiles";

/**
 * Tasks table - actionable items for staff.
 *
 * Tasks can be:
 * - AI-generated from agent insights
 * - Manually created by staff
 * - System-generated from events
 */
export const tasks = pgTable("tasks", {
	id: uuid("id").primaryKey().defaultRandom(),

	/** Organisation this task belongs to */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	// ============================================
	// Assignee
	// ============================================

	/** Specific user assigned (optional) */
	assigneeId: uuid("assignee_id"),

	/** Role-based assignment (e.g., "compliance_manager") */
	assigneeRole: varchar("assignee_role", { length: 50 }),

	// ============================================
	// Subject (What is this task about?)
	// ============================================

	/** Type of entity this task relates to */
	subjectType: varchar("subject_type", {
		enum: ["profile", "placement", "evidence", "escalation"],
		length: 20,
	}),

	/** ID of the related entity */
	subjectId: uuid("subject_id"),

	// ============================================
	// Task Details
	// ============================================

	/** Task title (short, actionable) */
	title: text("title").notNull(),

	/** Detailed description */
	description: text("description"),

	/** Priority level */
	priority: varchar("priority", {
		enum: ["low", "medium", "high", "urgent"],
		length: 10,
	})
		.notNull()
		.default("medium"),

	/** Category of task */
	category: varchar("category", {
		enum: [
			"chase_candidate",
			"review_document",
			"follow_up",
			"escalation",
			"expiry",
			"general",
		],
		length: 20,
	}).default("general"),

	// ============================================
	// Source Tracking
	// ============================================

	/** How this task was created */
	source: varchar("source", {
		enum: ["ai_agent", "manual", "system"],
		length: 15,
	}).notNull(),

	/** Which agent created this (if source = ai_agent) */
	agentId: varchar("agent_id", { length: 50 }),

	/** Link to the insight that generated this task */
	insightId: uuid("insight_id"),

	/** AI reasoning for this task (if AI-generated) */
	aiReasoning: text("ai_reasoning"),

	// ============================================
	// Status Tracking
	// ============================================

	/** Current status */
	status: varchar("status", {
		enum: ["pending", "in_progress", "completed", "dismissed", "snoozed"],
		length: 15,
	})
		.notNull()
		.default("pending"),

	/** When this task is due */
	dueAt: timestamp("due_at"),

	/** When task was snoozed until (if snoozed) */
	snoozedUntil: timestamp("snoozed_until"),

	/** When task was completed */
	completedAt: timestamp("completed_at"),

	/** Who completed/dismissed the task */
	completedBy: uuid("completed_by"),

	/** Notes added when completing/dismissing */
	completionNotes: text("completion_notes"),

	// ============================================
	// Timestamps
	// ============================================

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

/**
 * Task status enum for type safety.
 */
export const TaskStatus = {
	PENDING: "pending",
	IN_PROGRESS: "in_progress",
	COMPLETED: "completed",
	DISMISSED: "dismissed",
	SNOOZED: "snoozed",
} as const;

/**
 * Task priority enum for type safety.
 */
export const TaskPriority = {
	LOW: "low",
	MEDIUM: "medium",
	HIGH: "high",
	URGENT: "urgent",
} as const;

/**
 * Task source enum for type safety.
 */
export const TaskSource = {
	AI_AGENT: "ai_agent",
	MANUAL: "manual",
	SYSTEM: "system",
} as const;

/**
 * Task category enum for type safety.
 */
export const TaskCategory = {
	CHASE_CANDIDATE: "chase_candidate",
	REVIEW_DOCUMENT: "review_document",
	FOLLOW_UP: "follow_up",
	ESCALATION: "escalation",
	EXPIRY: "expiry",
	GENERAL: "general",
} as const;
