import "server-only";

import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	gte,
	inArray,
	lt,
	lte,
	sql,
	type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import { generateUUID } from "../utils";
import {
	type Chat,
	chat,
	type DBMessage,
	document,
	message,
	type Suggestion,
	stream,
	suggestion,
	type User,
	users,
	vote,
	type VoiceCall,
	voiceCall,
	// Credentially tables
	organisations,
	type Organisation,
	profiles,
	type Profile,
	placements,
	type Placement,
	pipelines,
	type Pipeline,
	pipelineStages,
	type PipelineStage,
	entityStagePositions,
	type EntityStagePosition,
	tasks,
	type Task,
	type NewTask,
	activities,
	type Activity,
	agents,
	type Agent,
	type NewAgent,
	agentExecutions,
	type AgentExecution,
	type NewAgentExecution,
	agentMemory,
	type AgentMemory,
	referenceContacts,
	type ReferenceContact,
} from "./schema";
import type {
	TranscriptMessage,
	VoiceCallStatus,
	VoiceCallOutcome,
} from "../voice/types";

// biome-ignore lint: Forbidden non-null assertion.
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

export async function saveChat({
	id,
	userId,
	title,
	visibility,
}: {
	id: string;
	userId: string;
	title: string;
	visibility: VisibilityType;
}) {
	try {
		return await db.insert(chat).values({
			id,
			createdAt: new Date(),
			userId,
			title,
			visibility,
		});
	} catch (error) {
		console.error("Failed to save chat:", error);
		throw new ChatSDKError(
			"bad_request:database",
			`Failed to save chat: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export async function deleteChatById({ id }: { id: string }) {
	try {
		await db.delete(vote).where(eq(vote.chatId, id));
		await db.delete(message).where(eq(message.chatId, id));
		await db.delete(stream).where(eq(stream.chatId, id));

		const [chatsDeleted] = await db
			.delete(chat)
			.where(eq(chat.id, id))
			.returning();
		return chatsDeleted;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete chat by id",
		);
	}
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
	try {
		const userChats = await db
			.select({ id: chat.id })
			.from(chat)
			.where(eq(chat.userId, userId));

		if (userChats.length === 0) {
			return { deletedCount: 0 };
		}

		const chatIds = userChats.map((c) => c.id);

		await db.delete(vote).where(inArray(vote.chatId, chatIds));
		await db.delete(message).where(inArray(message.chatId, chatIds));
		await db.delete(stream).where(inArray(stream.chatId, chatIds));

		const deletedChats = await db
			.delete(chat)
			.where(eq(chat.userId, userId))
			.returning();

		return { deletedCount: deletedChats.length };
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete all chats by user id",
		);
	}
}

export async function getChatsByUserId({
	id,
	limit,
	startingAfter,
	endingBefore,
}: {
	id: string;
	limit: number;
	startingAfter: string | null;
	endingBefore: string | null;
}) {
	try {
		const extendedLimit = limit + 1;

		const query = (whereCondition?: SQL<any>) =>
			db
				.select()
				.from(chat)
				.where(
					whereCondition
						? and(whereCondition, eq(chat.userId, id))
						: eq(chat.userId, id),
				)
				.orderBy(desc(chat.createdAt))
				.limit(extendedLimit);

		let filteredChats: Chat[] = [];

		if (startingAfter) {
			const [selectedChat] = await db
				.select()
				.from(chat)
				.where(eq(chat.id, startingAfter))
				.limit(1);

			if (!selectedChat) {
				throw new ChatSDKError(
					"not_found:database",
					`Chat with id ${startingAfter} not found`,
				);
			}

			filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
		} else if (endingBefore) {
			const [selectedChat] = await db
				.select()
				.from(chat)
				.where(eq(chat.id, endingBefore))
				.limit(1);

			if (!selectedChat) {
				throw new ChatSDKError(
					"not_found:database",
					`Chat with id ${endingBefore} not found`,
				);
			}

			filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
		} else {
			filteredChats = await query();
		}

		const hasMore = filteredChats.length > limit;

		return {
			chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
			hasMore,
		};
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get chats by user id",
		);
	}
}

export async function getChatById({ id }: { id: string }) {
	try {
		const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
		if (!selectedChat) {
			return null;
		}

		return selectedChat;
	} catch (_error) {
		throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
	}
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
	try {
		return await db.insert(message).values(messages);
	} catch (_error) {
		throw new ChatSDKError("bad_request:database", "Failed to save messages");
	}
}

export async function getMessagesByChatId({ id }: { id: string }) {
	try {
		return await db
			.select()
			.from(message)
			.where(eq(message.chatId, id))
			.orderBy(asc(message.createdAt));
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get messages by chat id",
		);
	}
}

export async function voteMessage({
	chatId,
	messageId,
	type,
}: {
	chatId: string;
	messageId: string;
	type: "up" | "down";
}) {
	try {
		const [existingVote] = await db
			.select()
			.from(vote)
			.where(and(eq(vote.messageId, messageId)));

		if (existingVote) {
			return await db
				.update(vote)
				.set({ isUpvoted: type === "up" })
				.where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
		}
		return await db.insert(vote).values({
			chatId,
			messageId,
			isUpvoted: type === "up",
		});
	} catch (_error) {
		throw new ChatSDKError("bad_request:database", "Failed to vote message");
	}
}

export async function getVotesByChatId({ id }: { id: string }) {
	try {
		return await db.select().from(vote).where(eq(vote.chatId, id));
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get votes by chat id",
		);
	}
}

export async function saveDocument({
	id,
	title,
	kind,
	content,
	userId,
}: {
	id: string;
	title: string;
	kind: ArtifactKind;
	content: string;
	userId: string;
}) {
	try {
		return await db
			.insert(document)
			.values({
				id,
				title,
				kind,
				content,
				userId,
				createdAt: new Date(),
			})
			.returning();
	} catch (_error) {
		throw new ChatSDKError("bad_request:database", "Failed to save document");
	}
}

export async function getDocumentsById({ id }: { id: string }) {
	try {
		const documents = await db
			.select()
			.from(document)
			.where(eq(document.id, id))
			.orderBy(asc(document.createdAt));

		return documents;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get documents by id",
		);
	}
}

export async function getDocumentById({ id }: { id: string }) {
	try {
		const [selectedDocument] = await db
			.select()
			.from(document)
			.where(eq(document.id, id))
			.orderBy(desc(document.createdAt));

		return selectedDocument;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get document by id",
		);
	}
}

export async function deleteDocumentsByIdAfterTimestamp({
	id,
	timestamp,
}: {
	id: string;
	timestamp: Date;
}) {
	try {
		await db
			.delete(suggestion)
			.where(
				and(
					eq(suggestion.documentId, id),
					gt(suggestion.documentCreatedAt, timestamp),
				),
			);

		return await db
			.delete(document)
			.where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
			.returning();
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete documents by id after timestamp",
		);
	}
}

export async function saveSuggestions({
	suggestions,
}: {
	suggestions: Suggestion[];
}) {
	try {
		return await db.insert(suggestion).values(suggestions);
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to save suggestions",
		);
	}
}

export async function getSuggestionsByDocumentId({
	documentId,
}: {
	documentId: string;
}) {
	try {
		return await db
			.select()
			.from(suggestion)
			.where(eq(suggestion.documentId, documentId));
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get suggestions by document id",
		);
	}
}

export async function getMessageById({ id }: { id: string }) {
	try {
		return await db.select().from(message).where(eq(message.id, id));
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get message by id",
		);
	}
}

export async function deleteMessagesByChatIdAfterTimestamp({
	chatId,
	timestamp,
}: {
	chatId: string;
	timestamp: Date;
}) {
	try {
		const messagesToDelete = await db
			.select({ id: message.id })
			.from(message)
			.where(
				and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
			);

		const messageIds = messagesToDelete.map(
			(currentMessage) => currentMessage.id,
		);

		if (messageIds.length > 0) {
			await db
				.delete(vote)
				.where(
					and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
				);

			return await db
				.delete(message)
				.where(
					and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
				);
		}
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete messages by chat id after timestamp",
		);
	}
}

export async function updateChatVisibilityById({
	chatId,
	visibility,
}: {
	chatId: string;
	visibility: "private" | "public";
}) {
	try {
		return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update chat visibility by id",
		);
	}
}

export async function updateChatLastContextById({
	chatId,
	context,
}: {
	chatId: string;
	// Store merged server-enriched usage object
	context: AppUsage;
}) {
	try {
		return await db
			.update(chat)
			.set({ lastContext: context })
			.where(eq(chat.id, chatId));
	} catch (error) {
		console.warn("Failed to update lastContext for chat", chatId, error);
		return;
	}
}

export async function getMessageCountByUserId({
	id,
	differenceInHours,
}: {
	id: string;
	differenceInHours: number;
}) {
	try {
		const twentyFourHoursAgo = new Date(
			Date.now() - differenceInHours * 60 * 60 * 1000,
		);

		const [stats] = await db
			.select({ count: count(message.id) })
			.from(message)
			.innerJoin(chat, eq(message.chatId, chat.id))
			.where(
				and(
					eq(chat.userId, id),
					gte(message.createdAt, twentyFourHoursAgo),
					eq(message.role, "user"),
				),
			)
			.execute();

		return stats?.count ?? 0;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get message count by user id",
		);
	}
}

export async function createStreamId({
	streamId,
	chatId,
}: {
	streamId: string;
	chatId: string;
}) {
	try {
		await db
			.insert(stream)
			.values({ id: streamId, chatId, createdAt: new Date() });
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to create stream id",
		);
	}
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
	try {
		const streamIds = await db
			.select({ id: stream.id })
			.from(stream)
			.where(eq(stream.chatId, chatId))
			.orderBy(asc(stream.createdAt))
			.execute();

		return streamIds.map(({ id }) => id);
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get stream ids by chat id",
		);
	}
}

// ============================================
// Voice Call Queries
// ============================================

export interface CreateVoiceCallParams {
	userId: string;
	templateSlug: string;
	phoneNumber: string;
	recipientName?: string;
	context: Record<string, unknown>;
	vapiAssistantId?: string;
}

export async function createVoiceCall(
	params: CreateVoiceCallParams,
): Promise<VoiceCall> {
	try {
		const [result] = await db
			.insert(voiceCall)
			.values({
				userId: params.userId,
				templateSlug: params.templateSlug,
				phoneNumber: params.phoneNumber,
				recipientName: params.recipientName,
				context: params.context,
				vapiAssistantId: params.vapiAssistantId,
				status: "pending",
			})
			.returning();

		return result;
	} catch (error) {
		console.error("Failed to create voice call:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to create voice call",
		);
	}
}

export async function getVoiceCallById({
	id,
	userId,
}: {
	id: string;
	userId: string;
}): Promise<VoiceCall | null> {
	try {
		const [result] = await db
			.select()
			.from(voiceCall)
			.where(and(eq(voiceCall.id, id), eq(voiceCall.userId, userId)));

		return result || null;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get voice call by id",
		);
	}
}

export async function getVoiceCallByVapiId({
	vapiCallId,
}: {
	vapiCallId: string;
}): Promise<VoiceCall | null> {
	try {
		const [result] = await db
			.select()
			.from(voiceCall)
			.where(eq(voiceCall.vapiCallId, vapiCallId));

		return result || null;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get voice call by VAPI id",
		);
	}
}

export interface UpdateVoiceCallParams {
	vapiCallId?: string;
	status?: VoiceCallStatus;
	outcome?: VoiceCallOutcome;
	recordingUrl?: string;
	transcript?: TranscriptMessage[];
	capturedData?: Record<string, unknown>;
	duration?: number;
	startedAt?: Date;
	endedAt?: Date;
}

export async function updateVoiceCall({
	id,
	...data
}: UpdateVoiceCallParams & { id: string }): Promise<VoiceCall | null> {
	try {
		const [result] = await db
			.update(voiceCall)
			.set(data)
			.where(eq(voiceCall.id, id))
			.returning();

		return result || null;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update voice call",
		);
	}
}

export interface ListVoiceCallsParams {
	userId: string;
	templateSlug?: string;
	status?: VoiceCallStatus;
	from?: Date;
	to?: Date;
	limit?: number;
	offset?: number;
}

export interface ListVoiceCallsResult {
	calls: VoiceCall[];
	total: number;
}

export async function listVoiceCalls(
	params: ListVoiceCallsParams,
): Promise<ListVoiceCallsResult> {
	try {
		const { userId, templateSlug, status, from, to, limit = 20, offset = 0 } = params;

		// Build where conditions
		const conditions: SQL<unknown>[] = [eq(voiceCall.userId, userId)];

		if (templateSlug) {
			conditions.push(eq(voiceCall.templateSlug, templateSlug));
		}
		if (status) {
			conditions.push(eq(voiceCall.status, status));
		}
		if (from) {
			conditions.push(gte(voiceCall.createdAt, from));
		}
		if (to) {
			conditions.push(lte(voiceCall.createdAt, to));
		}

		const whereClause = and(...conditions);

		// Get total count
		const [countResult] = await db
			.select({ count: count() })
			.from(voiceCall)
			.where(whereClause);

		// Get paginated results
		const calls = await db
			.select()
			.from(voiceCall)
			.where(whereClause)
			.orderBy(desc(voiceCall.createdAt))
			.limit(limit)
			.offset(offset);

		return {
			calls,
			total: countResult?.count ?? 0,
		};
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to list voice calls",
		);
	}
}

export async function getRecentVoiceCalls({
	userId,
	limit = 5,
}: {
	userId: string;
	limit?: number;
}): Promise<VoiceCall[]> {
	try {
		return await db
			.select()
			.from(voiceCall)
			.where(eq(voiceCall.userId, userId))
			.orderBy(desc(voiceCall.createdAt))
			.limit(limit);
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get recent voice calls",
		);
	}
}

export async function getVoiceCallStats({
	userId,
}: {
	userId: string;
}): Promise<{
	total: number;
	completed: number;
	failed: number;
	inProgress: number;
}> {
	try {
		const [stats] = await db
			.select({
				total: count(),
			})
			.from(voiceCall)
			.where(eq(voiceCall.userId, userId));

		const [completed] = await db
			.select({ count: count() })
			.from(voiceCall)
			.where(
				and(
					eq(voiceCall.userId, userId),
					eq(voiceCall.status, "ended"),
					eq(voiceCall.outcome, "completed"),
				),
			);

		const [failed] = await db
			.select({ count: count() })
			.from(voiceCall)
			.where(
				and(
					eq(voiceCall.userId, userId),
					eq(voiceCall.outcome, "failed"),
				),
			);

		const [inProgress] = await db
			.select({ count: count() })
			.from(voiceCall)
			.where(
				and(
					eq(voiceCall.userId, userId),
					inArray(voiceCall.status, ["pending", "queued", "ringing", "in-progress"]),
				),
			);

		return {
			total: stats?.total ?? 0,
			completed: completed?.count ?? 0,
			failed: failed?.count ?? 0,
			inProgress: inProgress?.count ?? 0,
		};
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get voice call stats",
		);
	}
}

// ============================================
// Pipeline Queries
// ============================================

export interface PipelineStageInfo {
	id: string;
	name: string;
	stageOrder: number;
	isTerminal: boolean;
}

export interface PipelineWithStages {
	id: string;
	name: string;
	stages: PipelineStageInfo[];
}

/**
 * Get the default profile pipeline for an organisation with its stages.
 */
export async function getDefaultProfilePipeline({
	organisationId,
}: {
	organisationId: string;
}): Promise<PipelineWithStages | null> {
	try {
		// Get the default profile pipeline for this org
		const [pipeline] = await db
			.select()
			.from(pipelines)
			.where(
				and(
					eq(pipelines.organisationId, organisationId),
					eq(pipelines.appliesTo, "profile"),
					eq(pipelines.isDefault, true),
				),
			)
			.limit(1);

		if (!pipeline) {
			return null;
		}

		// Get all stages for this pipeline
		const stages = await db
			.select({
				id: pipelineStages.id,
				name: pipelineStages.name,
				stageOrder: pipelineStages.stageOrder,
				isTerminal: pipelineStages.isTerminal,
			})
			.from(pipelineStages)
			.where(eq(pipelineStages.pipelineId, pipeline.id))
			.orderBy(asc(pipelineStages.stageOrder));

		return {
			id: pipeline.id,
			name: pipeline.name,
			stages,
		};
	} catch (error) {
		console.error("Failed to get default pipeline:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get default pipeline",
		);
	}
}

// ============================================
// Candidate/Profile Queries
// ============================================

export type CandidateAlertStatus = "on_track" | "overdue" | "action_required";

export interface CandidateWithStage {
	id: string;
	name: string;
	email: string;
	stageId: string | null;
	stageName: string | null;
	alertStatus: CandidateAlertStatus;
	enteredStageAt: Date;
	compliancePercentage: number;
}

/**
 * Derive candidate alert status based on compliance data and time in stage.
 */
function deriveCandidateAlertStatus(
	compliancePercentage: number,
	enteredStageAt: Date,
	isTerminalStage: boolean,
): CandidateAlertStatus {
	// If fully compliant (terminal stage), they're on track
	if (isTerminalStage || compliancePercentage >= 100) {
		return "on_track";
	}

	// Check how long they've been in the current stage
	const daysInStage = Math.floor(
		(Date.now() - enteredStageAt.getTime()) / (1000 * 60 * 60 * 24),
	);

	// Overdue if low compliance and been in stage > 7 days
	if (compliancePercentage < 50 && daysInStage > 7) {
		return "overdue";
	}

	// Action required if moderate compliance but stalled > 5 days
	if (compliancePercentage < 75 && daysInStage > 5) {
		return "action_required";
	}

	return "on_track";
}

/**
 * Get candidates for an organisation with their pipeline stage.
 */
export async function getCandidatesByOrganisationId({
	organisationId,
}: {
	organisationId: string;
}): Promise<CandidateWithStage[]> {
	try {
		// Get profiles with their stage position and placement compliance
		const results = await db
			.select({
				profileId: profiles.id,
				email: profiles.email,
				firstName: profiles.firstName,
				lastName: profiles.lastName,
				profileCreatedAt: profiles.createdAt,
				stageId: entityStagePositions.currentStageId,
				stageName: pipelineStages.name,
				stageOrder: pipelineStages.stageOrder,
				isTerminal: pipelineStages.isTerminal,
				enteredStageAt: entityStagePositions.enteredStageAt,
				compliancePercentage: placements.compliancePercentage,
			})
			.from(profiles)
			.leftJoin(
				entityStagePositions,
				and(
					eq(entityStagePositions.entityId, profiles.id),
					eq(entityStagePositions.entityType, "profile"),
				),
			)
			.leftJoin(
				pipelineStages,
				eq(pipelineStages.id, entityStagePositions.currentStageId),
			)
			.leftJoin(
				placements,
				and(
					eq(placements.profileId, profiles.id),
					eq(placements.organisationId, profiles.organisationId),
				),
			)
			.where(eq(profiles.organisationId, organisationId))
			.orderBy(asc(pipelineStages.stageOrder), asc(profiles.lastName));

		// Group by profile (take first placement's compliance if multiple)
		const profileMap = new Map<string, CandidateWithStage>();

		for (const row of results) {
			if (!profileMap.has(row.profileId)) {
				const enteredStageAt = row.enteredStageAt ?? row.profileCreatedAt;

				profileMap.set(row.profileId, {
					id: row.profileId,
					name: `${row.firstName} ${row.lastName}`,
					email: row.email,
					stageId: row.stageId,
					stageName: row.stageName,
					alertStatus: deriveCandidateAlertStatus(
						row.compliancePercentage ?? 0,
						enteredStageAt,
						row.isTerminal ?? false,
					),
					enteredStageAt,
					compliancePercentage: row.compliancePercentage ?? 0,
				});
			}
		}

		return Array.from(profileMap.values());
	} catch (error) {
		console.error("Failed to get candidates:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get candidates by organisation id",
		);
	}
}

/**
 * Get all organisations (for org switcher).
 */
export async function getAllOrganisations(): Promise<Organisation[]> {
	try {
		return await db.select().from(organisations).orderBy(asc(organisations.name));
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get organisations",
		);
	}
}

/**
 * Get organisation by ID.
 */
export async function getOrganisationById({
	id,
}: { id: string }): Promise<Organisation | null> {
	try {
		const [org] = await db
			.select()
			.from(organisations)
			.where(eq(organisations.id, id));
		return org || null;
	} catch (_error) {
		return null;
	}
}

// ============================================
// Tasks
// ============================================

/**
 * Create a new task.
 */
export async function createTask({
	title,
	description,
	assigneeId,
	priority,
	category,
	dueAt,
	subjectType,
	subjectId,
	organisationId,
}: {
	title: string;
	description?: string;
	assigneeId: string;
	priority?: "low" | "medium" | "high" | "urgent";
	category?:
		| "chase_candidate"
		| "review_document"
		| "follow_up"
		| "escalation"
		| "expiry"
		| "general";
	dueAt?: Date;
	subjectType?: "profile" | "placement" | "evidence" | "escalation";
	subjectId?: string;
	organisationId?: string;
}): Promise<Task> {
	try {
		// Use a default org ID for demo purposes if not provided
		const orgId =
			organisationId ?? "00000000-0000-0000-0000-000000000001";

		const [task] = await db
			.insert(tasks)
			.values({
				organisationId: orgId,
				title,
				description,
				assigneeId,
				priority: priority ?? "medium",
				category: category ?? "general",
				dueAt,
				subjectType,
				subjectId,
				source: "ai_agent",
				agentId: "chat-companion",
				status: "pending",
			})
			.returning();

		return task;
	} catch (error) {
		console.error("Failed to create task:", error);
		throw new ChatSDKError("bad_request:database", "Failed to create task");
	}
}

// =============================================================================
// ACTIVITIES / TIMELINE
// =============================================================================

export type TimelineData = {
	activities: Activity[];
	startDate: Date;
	endDate: Date;
};

/**
 * Get activities for a profile for timeline display.
 * Returns individual activities with their exact timestamps.
 */
export async function getProfileTimeline({
	profileId,
	days = 30,
}: {
	profileId: string;
	days?: number;
}): Promise<TimelineData> {
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);
	startDate.setHours(0, 0, 0, 0);

	const results = await db
		.select()
		.from(activities)
		.where(
			and(
				eq(activities.profileId, profileId),
				gte(activities.createdAt, startDate)
			)
		)
		.orderBy(asc(activities.createdAt));

	return {
		activities: results,
		startDate,
		endDate,
	};
}

// ============================================
// Agent Execution Queries
// ============================================

export async function createAgentExecution({
	agentId,
	orgId,
	userId,
	triggerType,
	input,
	model,
}: {
	agentId: string;
	orgId?: string;
	userId?: string;
	triggerType?: "manual" | "schedule" | "event";
	input?: Record<string, unknown>;
	model?: string;
}): Promise<AgentExecution> {
	const [result] = await db
		.insert(agentExecutions)
		.values({
			agentId,
			orgId: orgId || undefined,
			userId: userId || undefined,
			triggerType: triggerType || "manual",
			status: "running",
			input,
			steps: [],
			model,
		})
		.returning();
	return result;
}

export async function updateAgentExecution({
	id,
	status,
	steps,
	output,
	tokensUsed,
	durationMs,
}: {
	id: string;
	status?: "running" | "completed" | "failed" | "escalated";
	steps?: import("@/lib/ai/agents/types").AgentStep[];
	output?: Record<string, unknown>;
	tokensUsed?: { inputTokens: number; outputTokens: number; totalTokens: number };
	durationMs?: number;
}): Promise<void> {
	const updates: Partial<NewAgentExecution> = {};
	if (status) updates.status = status;
	if (steps) updates.steps = steps;
	if (output) updates.output = output;
	if (tokensUsed) updates.tokensUsed = tokensUsed;
	if (durationMs !== undefined) updates.durationMs = durationMs;
	if (status === "completed" || status === "failed" || status === "escalated") {
		updates.completedAt = new Date();
	}

	await db
		.update(agentExecutions)
		.set(updates)
		.where(eq(agentExecutions.id, id));
}

export async function getAgentExecution({
	id,
}: {
	id: string;
}): Promise<AgentExecution | null> {
	const [result] = await db
		.select()
		.from(agentExecutions)
		.where(eq(agentExecutions.id, id));
	return result || null;
}

export async function getAgentExecutionsByAgentId({
	agentId,
	limit = 20,
}: {
	agentId: string;
	limit?: number;
}): Promise<AgentExecution[]> {
	return db
		.select()
		.from(agentExecutions)
		.where(eq(agentExecutions.agentId, agentId))
		.orderBy(desc(agentExecutions.createdAt))
		.limit(limit);
}

// ============================================
// Agent Definition Queries
// ============================================

export async function getAgentById({
	id,
}: {
	id: string;
}): Promise<Agent | null> {
	const [result] = await db
		.select()
		.from(agents)
		.where(eq(agents.id, id));
	return result || null;
}

export async function getAgentByCode({
	code,
}: {
	code: string;
}): Promise<Agent | null> {
	const [result] = await db
		.select()
		.from(agents)
		.where(eq(agents.code, code));
	return result || null;
}

export async function getAllAgents({
	orgId,
}: {
	orgId?: string;
} = {}): Promise<Agent[]> {
	if (orgId) {
		return db
			.select()
			.from(agents)
			.where(eq(agents.isActive, true))
			.orderBy(asc(agents.name));
	}
	return db
		.select()
		.from(agents)
		.where(eq(agents.isActive, true))
		.orderBy(asc(agents.name));
}

export async function createAgentDefinition(
	data: NewAgent,
): Promise<Agent> {
	const [result] = await db
		.insert(agents)
		.values(data)
		.returning();
	return result;
}

export async function updateAgentDefinition({
	id,
	...data
}: Partial<NewAgent> & { id: string }): Promise<Agent | null> {
	const [result] = await db
		.update(agents)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(agents.id, id))
		.returning();
	return result || null;
}

// ============================================
// Agent Memory
// ============================================

/**
 * Get agent memory by composite key (agentId + subjectId + orgId).
 */
export async function getAgentMemory({
	agentId,
	subjectId,
	orgId,
}: {
	agentId: string;
	subjectId: string;
	orgId: string;
}): Promise<AgentMemory | null> {
	const [result] = await db
		.select()
		.from(agentMemory)
		.where(
			and(
				eq(agentMemory.agentId, agentId),
				eq(agentMemory.subjectId, subjectId),
				eq(agentMemory.orgId, orgId),
			),
		);
	return result || null;
}

/**
 * Upsert agent memory — insert or update on conflict.
 * Increments runCount and updates lastRunAt on each call.
 */
export async function upsertAgentMemory({
	agentId,
	subjectId,
	orgId,
	memory,
}: {
	agentId: string;
	subjectId: string;
	orgId: string;
	memory: Record<string, unknown>;
}): Promise<AgentMemory> {
	const now = new Date();
	const [result] = await db
		.insert(agentMemory)
		.values({
			agentId,
			subjectId,
			orgId,
			memory,
			lastRunAt: now,
			runCount: 1,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: [agentMemory.agentId, agentMemory.subjectId, agentMemory.orgId],
			set: {
				memory,
				lastRunAt: now,
				runCount: sql`${agentMemory.runCount} + 1`,
				updatedAt: now,
			},
		})
		.returning();
	return result;
}

// ============================================
// Email Activity Logging
// ============================================

/**
 * Log a drafted email as an activity for audit trail.
 */
export async function logEmailActivity({
	organisationId,
	profileId,
	subject,
	body,
	recipientEmail,
	recipientName,
	reasoning,
}: {
	organisationId: string;
	profileId: string;
	subject: string;
	body: string;
	recipientEmail: string;
	recipientName: string;
	reasoning?: string;
}): Promise<void> {
	await db.insert(activities).values({
		organisationId,
		profileId,
		activityType: "message_sent",
		actor: "ai",
		channel: "email",
		summary: `Email drafted: ${subject}`,
		details: {
			recipientEmail,
			recipientName,
			subject,
			body,
			status: "drafted",
		},
		aiReasoning: reasoning,
		visibleToCandidate: "true",
	});
}

// ============================================
// Reference Contacts
// ============================================

/**
 * Get all reference contacts for a profile within an organisation.
 */
export async function getReferenceContactsForProfile({
	profileId,
	organisationId,
}: {
	profileId: string;
	organisationId: string;
}): Promise<ReferenceContact[]> {
	return db
		.select()
		.from(referenceContacts)
		.where(
			and(
				eq(referenceContacts.profileId, profileId),
				eq(referenceContacts.organisationId, organisationId),
			),
		);
}

/**
 * Update a reference contact's status and captured data.
 */
export async function updateReferenceContact({
	id,
	status,
	capturedData,
}: {
	id: string;
	status?: "pending" | "contacted" | "completed" | "failed";
	capturedData?: Record<string, unknown>;
}): Promise<ReferenceContact> {
	const updates: Record<string, unknown> = {
		updatedAt: new Date(),
	};
	if (status) updates.status = status;
	if (capturedData) updates.capturedData = capturedData;

	const [result] = await db
		.update(referenceContacts)
		.set(updates as Partial<typeof referenceContacts.$inferInsert>)
		.where(eq(referenceContacts.id, id))
		.returning();
	return result;
}

/**
 * Get a sample candidate for an organisation.
 * Used for pre-populating agent test inputs.
 */
export async function getSampleCandidate({
	organisationId,
}: {
	organisationId: string;
}): Promise<{ name: string; email: string } | null> {
	const [result] = await db
		.select({
			firstName: profiles.firstName,
			lastName: profiles.lastName,
			email: profiles.email,
		})
		.from(profiles)
		.where(eq(profiles.organisationId, organisationId))
		.limit(1);

	if (!result) return null;
	return {
		name: `${result.firstName} ${result.lastName}`,
		email: result.email,
	};
}
