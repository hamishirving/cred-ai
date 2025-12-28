/**
 * Chat & Voice tables - existing playground functionality.
 *
 * These tables support the AI chat and voice call features
 * of the playground application.
 */
import type { InferSelectModel } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	json,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
	varchar,
	integer,
} from "drizzle-orm/pg-core";
import type { AppUsage } from "../../usage";
import type {
	TranscriptMessage,
	VoiceCallOutcome,
	VoiceCallStatus,
	FieldSchema,
} from "../../voice/types";

export const user = pgTable("users", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	email: varchar("email", { length: 64 }).notNull(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("chats", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	createdAt: timestamp("created_at").notNull(),
	title: text("title").notNull(),
	userId: uuid("user_id")
		.notNull()
		.references(() => user.id),
	visibility: varchar("visibility", { enum: ["public", "private"] })
		.notNull()
		.default("private"),
	lastContext: jsonb("last_context").$type<AppUsage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("messages", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	chatId: uuid("chat_id")
		.notNull()
		.references(() => chat.id),
	role: varchar("role").notNull(),
	parts: json("parts").notNull(),
	attachments: json("attachments").notNull(),
	createdAt: timestamp("created_at").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
	"votes",
	{
		chatId: uuid("chat_id")
			.notNull()
			.references(() => chat.id),
		messageId: uuid("message_id")
			.notNull()
			.references(() => message.id),
		isUpvoted: boolean("is_upvoted").notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.chatId, table.messageId] }),
	}),
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
	"documents",
	{
		id: uuid("id").notNull().defaultRandom(),
		createdAt: timestamp("created_at").notNull(),
		title: text("title").notNull(),
		content: text("content"),
		kind: varchar("kind", { enum: ["text", "code", "image", "sheet"] })
			.notNull()
			.default("text"),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.id, table.createdAt] }),
	}),
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
	"suggestions",
	{
		id: uuid("id").notNull().defaultRandom(),
		documentId: uuid("document_id").notNull(),
		documentCreatedAt: timestamp("document_created_at").notNull(),
		originalText: text("original_text").notNull(),
		suggestedText: text("suggested_text").notNull(),
		description: text("description"),
		isResolved: boolean("is_resolved").notNull().default(false),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id),
		createdAt: timestamp("created_at").notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.id] }),
		documentRef: foreignKey({
			columns: [table.documentId, table.documentCreatedAt],
			foreignColumns: [document.id, document.createdAt],
		}),
	}),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
	"streams",
	{
		id: uuid("id").notNull().defaultRandom(),
		chatId: uuid("chat_id").notNull(),
		createdAt: timestamp("created_at").notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.id] }),
		chatRef: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
		}),
	}),
);

export type Stream = InferSelectModel<typeof stream>;

// ============================================
// Voice Tables
// ============================================

/**
 * Voice call templates define reusable call configurations.
 * Each template specifies the agent behavior, data to capture,
 * and can be associated with a VAPI assistant.
 *
 * For MVP, templates are defined in code (lib/voice/templates.ts).
 * This table supports future dynamic template creation.
 */
export const voiceTemplate = pgTable("voice_templates", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	slug: text("slug").notNull().unique(),
	name: text("name").notNull(),
	description: text("description"),

	// Agent configuration
	systemPrompt: text("system_prompt"),
	vapiAssistantId: text("vapi_assistant_id"),

	// Schema definitions (JSON)
	contextSchema: jsonb("context_schema").$type<FieldSchema[]>(),
	captureSchema: jsonb("capture_schema").$type<FieldSchema[]>(),

	// Ownership & status
	userId: uuid("user_id").references(() => user.id),
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VoiceTemplate = InferSelectModel<typeof voiceTemplate>;

/**
 * Voice calls represent individual call instances.
 * Generic structure supports any template/use case.
 */
export const voiceCall = pgTable("voice_calls", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	// Relationships
	userId: uuid("user_id")
		.notNull()
		.references(() => user.id),
	templateId: uuid("template_id").references(() => voiceTemplate.id),
	templateSlug: text("template_slug").notNull(),

	// Call target
	phoneNumber: text("phone_number").notNull(),
	recipientName: text("recipient_name"),

	// Dynamic data (schema defined by template)
	context: jsonb("context").$type<Record<string, unknown>>().notNull(),
	capturedData: jsonb("captured_data").$type<Record<string, unknown>>(),

	// VAPI integration
	vapiCallId: text("vapi_call_id").unique(),
	vapiAssistantId: text("vapi_assistant_id"),

	// Status tracking
	status: text("status").$type<VoiceCallStatus>().notNull().default("pending"),

	// Results (populated when call ends)
	recordingUrl: text("recording_url"),
	transcript: jsonb("transcript").$type<TranscriptMessage[]>(),
	duration: integer("duration"),
	outcome: text("outcome").$type<VoiceCallOutcome>(),

	// Timestamps
	createdAt: timestamp("created_at").notNull().defaultNow(),
	scheduledAt: timestamp("scheduled_at"),
	startedAt: timestamp("started_at"),
	endedAt: timestamp("ended_at"),
});

export type VoiceCall = InferSelectModel<typeof voiceCall>;
