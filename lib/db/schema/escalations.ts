/**
 * Escalation - Decision requiring human input.
 *
 * @description Route exceptions to humans
 * @purpose AI escalations, approval workflows, HITL
 * @see DATA_MODEL.md#escalation
 */
import {
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { profiles } from "./profiles";
import { complianceElements } from "./compliance-elements";

/**
 * Escalations route exceptions to humans for decisions.
 *
 * When the AI encounters something it can't handle confidently,
 * or when human approval is required, it creates an escalation.
 */
export const escalations = pgTable("escalations", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation this escalation belongs to */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Profile this escalation is about */
	profileId: uuid("profile_id")
		.notNull()
		.references(() => profiles.id),

	/** Compliance element that triggered this (if applicable) */
	complianceElementId: uuid("compliance_element_id").references(
		() => complianceElements.id
	),

	/** Type of escalation */
	escalationType: varchar("escalation_type", {
		enum: [
			"low_confidence",
			"approval_required",
			"exception_request",
			"discrepancy",
			"verification_failed",
			"candidate_request",
		],
	}).notNull(),

	/** Current status */
	status: varchar("status", {
		enum: ["pending", "in_progress", "resolved", "expired"],
	})
		.notNull()
		.default("pending"),

	/** Priority level */
	priority: varchar("priority", {
		enum: ["low", "medium", "high", "critical"],
	})
		.notNull()
		.default("medium"),

	/** What the AI is asking about */
	question: text("question").notNull(),

	/** AI's reasoning for escalating */
	aiReasoning: text("ai_reasoning"),

	/** AI's confidence score */
	aiConfidence: text("ai_confidence"),

	/** AI's recommended action */
	aiRecommendation: text("ai_recommendation"),

	/** Assigned to user ID */
	assignedTo: uuid("assigned_to"),

	/** When the escalation should be resolved by */
	dueAt: timestamp("due_at"),

	/** The resolution chosen */
	resolution: varchar("resolution"),

	/** Notes from the resolver */
	resolutionNotes: text("resolution_notes"),

	/** Who resolved it */
	resolvedBy: uuid("resolved_by"),

	/** When it was resolved */
	resolvedAt: timestamp("resolved_at"),

	/** Additional context data */
	context: jsonb("context").$type<Record<string, unknown>>(),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Escalation = typeof escalations.$inferSelect;
export type NewEscalation = typeof escalations.$inferInsert;
