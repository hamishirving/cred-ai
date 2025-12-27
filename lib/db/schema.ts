import type { InferSelectModel } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	integer,
	json,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import type { AppUsage } from "../usage";
import type {
	TranscriptMessage,
	VoiceCallOutcome,
	VoiceCallStatus,
	FieldSchema,
} from "../voice/types";

export const user = pgTable("User", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	email: varchar("email", { length: 64 }).notNull(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	createdAt: timestamp("createdAt").notNull(),
	title: text("title").notNull(),
	userId: uuid("userId")
		.notNull()
		.references(() => user.id),
	visibility: varchar("visibility", { enum: ["public", "private"] })
		.notNull()
		.default("private"),
	lastContext: jsonb("lastContext").$type<AppUsage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	chatId: uuid("chatId")
		.notNull()
		.references(() => chat.id),
	role: varchar("role").notNull(),
	content: json("content").notNull(),
	createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	chatId: uuid("chatId")
		.notNull()
		.references(() => chat.id),
	role: varchar("role").notNull(),
	parts: json("parts").notNull(),
	attachments: json("attachments").notNull(),
	createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
	"Vote",
	{
		chatId: uuid("chatId")
			.notNull()
			.references(() => chat.id),
		messageId: uuid("messageId")
			.notNull()
			.references(() => messageDeprecated.id),
		isUpvoted: boolean("isUpvoted").notNull(),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.chatId, table.messageId] }),
		};
	},
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
	"Vote_v2",
	{
		chatId: uuid("chatId")
			.notNull()
			.references(() => chat.id),
		messageId: uuid("messageId")
			.notNull()
			.references(() => message.id),
		isUpvoted: boolean("isUpvoted").notNull(),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.chatId, table.messageId] }),
		};
	},
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
	"Document",
	{
		id: uuid("id").notNull().defaultRandom(),
		createdAt: timestamp("createdAt").notNull(),
		title: text("title").notNull(),
		content: text("content"),
		kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
			.notNull()
			.default("text"),
		userId: uuid("userId")
			.notNull()
			.references(() => user.id),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.id, table.createdAt] }),
		};
	},
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
	"Suggestion",
	{
		id: uuid("id").notNull().defaultRandom(),
		documentId: uuid("documentId").notNull(),
		documentCreatedAt: timestamp("documentCreatedAt").notNull(),
		originalText: text("originalText").notNull(),
		suggestedText: text("suggestedText").notNull(),
		description: text("description"),
		isResolved: boolean("isResolved").notNull().default(false),
		userId: uuid("userId")
			.notNull()
			.references(() => user.id),
		createdAt: timestamp("createdAt").notNull(),
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
	"Stream",
	{
		id: uuid("id").notNull().defaultRandom(),
		chatId: uuid("chatId").notNull(),
		createdAt: timestamp("createdAt").notNull(),
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
export const voiceTemplate = pgTable("VoiceTemplate", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	slug: text("slug").notNull().unique(),
	name: text("name").notNull(),
	description: text("description"),

	// Agent configuration
	systemPrompt: text("systemPrompt"),
	vapiAssistantId: text("vapiAssistantId"),

	// Schema definitions (JSON)
	contextSchema: jsonb("contextSchema").$type<FieldSchema[]>(),
	captureSchema: jsonb("captureSchema").$type<FieldSchema[]>(),

	// Ownership & status
	userId: uuid("userId").references(() => user.id),
	isActive: boolean("isActive").notNull().default(true),

	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type VoiceTemplate = InferSelectModel<typeof voiceTemplate>;

/**
 * Voice calls represent individual call instances.
 * Generic structure supports any template/use case.
 */
export const voiceCall = pgTable("VoiceCall", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	// Relationships
	userId: uuid("userId")
		.notNull()
		.references(() => user.id),
	templateId: uuid("templateId").references(() => voiceTemplate.id),
	templateSlug: text("templateSlug").notNull(),

	// Call target
	phoneNumber: text("phoneNumber").notNull(),
	recipientName: text("recipientName"),

	// Dynamic data (schema defined by template)
	context: jsonb("context").$type<Record<string, unknown>>().notNull(),
	capturedData: jsonb("capturedData").$type<Record<string, unknown>>(),

	// VAPI integration
	vapiCallId: text("vapiCallId").unique(),
	vapiAssistantId: text("vapiAssistantId"),

	// Status tracking
	status: text("status").$type<VoiceCallStatus>().notNull().default("pending"),

	// Results (populated when call ends)
	recordingUrl: text("recordingUrl"),
	transcript: jsonb("transcript").$type<TranscriptMessage[]>(),
	duration: integer("duration"),
	outcome: text("outcome").$type<VoiceCallOutcome>(),

	// Timestamps
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	scheduledAt: timestamp("scheduledAt"),
	startedAt: timestamp("startedAt"),
	endedAt: timestamp("endedAt"),
});

export type VoiceCall = InferSelectModel<typeof voiceCall>;
