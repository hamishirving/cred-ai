/**
 * Activity - Log of AI and human actions.
 *
 * @description Track what happened
 * @purpose Audit trail, AI transparency, candidate timeline
 * @see DATA_MODEL.md#activity
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

/**
 * Activities log what the AI and humans have done.
 *
 * This provides an audit trail for compliance, transparency into AI
 * decisions, and a timeline for candidates showing what's happened.
 */
export const activities = pgTable("activities", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation this activity belongs to */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Profile this activity is about */
	profileId: uuid("profile_id").references(() => profiles.id),

	/** Placements this activity relates to */
	placementIds: jsonb("placement_ids").$type<string[]>(),

	/** Type of activity */
	activityType: varchar("activity_type", {
		enum: [
			"message_sent",
			"message_received",
			"document_uploaded",
			"document_reviewed",
			"check_initiated",
			"check_completed",
			"status_changed",
			"escalation_created",
			"escalation_resolved",
			"note_added",
			"system_action",
		],
	}).notNull(),

	/** Who/what performed the action */
	actor: varchar("actor", {
		enum: ["system", "ai", "admin", "candidate", "integration"],
	}).notNull(),

	/** User ID of the actor (if human) */
	actorUserId: uuid("actor_user_id"),

	/** Channel used (if communication) */
	channel: varchar("channel", {
		enum: ["email", "sms", "whatsapp", "voice", "portal", "api"],
	}),

	/** Brief summary of what happened */
	summary: text("summary").notNull(),

	/** Detailed activity data */
	details: jsonb("details").$type<Record<string, unknown>>(),

	/** AI reasoning (if AI actor) */
	aiReasoning: text("ai_reasoning"),

	/** Confidence score (if AI decision) */
	aiConfidence: text("ai_confidence"),

	/** Related entity type */
	relatedEntityType: varchar("related_entity_type", {
		enum: ["evidence", "compliance_element", "escalation", "message"],
	}),

	/** Related entity ID */
	relatedEntityId: uuid("related_entity_id"),

	/** Whether this activity is visible to candidates */
	visibleToCandidate: varchar("visible_to_candidate")
		.notNull()
		.default("false"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
