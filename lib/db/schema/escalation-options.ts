/**
 * EscalationOption - Available action for an escalation.
 *
 * @description Present choices to human
 * @purpose Structured decision-making, recommendation highlighting
 * @see DATA_MODEL.md#escalationoption
 */
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	uuid,
	timestamp,
} from "drizzle-orm/pg-core";
import { escalations } from "./escalations";

/**
 * EscalationOptions define the available actions for an escalation.
 *
 * This structures the decision-making process and allows the AI
 * to highlight its recommended action.
 */
export const escalationOptions = pgTable("escalation_options", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which escalation this option belongs to */
	escalationId: uuid("escalation_id")
		.notNull()
		.references(() => escalations.id, { onDelete: "cascade" }),

	/** Option label (e.g., "Approve", "Reject", "Request more info") */
	label: text("label").notNull(),

	/** Description of what this option does */
	description: text("description"),

	/** Display order */
	displayOrder: integer("display_order").notNull().default(0),

	/** Whether this is the AI's recommended option */
	isRecommended: boolean("is_recommended").notNull().default(false),

	/** Action to take if this option is selected */
	action: jsonb("action").$type<{
		type: "approve" | "reject" | "request_info" | "waive" | "escalate" | "custom";
		config?: Record<string, unknown>;
	}>(),

	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EscalationOption = typeof escalationOptions.$inferSelect;
export type NewEscalationOption = typeof escalationOptions.$inferInsert;
