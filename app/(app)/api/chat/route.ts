import { cookies } from "next/headers";
import { geolocation } from "@vercel/functions";
import { withTracing } from "@posthog/ai";
import {
	convertToModelMessages,
	createUIMessageStream,
	JsonToSseTransformStream,
	smoothStream,
	stepCountIs,
	streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { auth, type UserType } from "@/lib/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModel } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { createForm } from "@/lib/ai/tools/create-form";
import { draftEmail } from "@/lib/ai/tools/draft-email";
import { getCompliancePackages } from "@/lib/ai/tools/get-compliance-packages";
import { getMetadata } from "@/lib/ai/tools/get-org-metadata";
import { getProfile } from "@/lib/ai/tools/get-profile";
import { getDocuments } from "@/lib/ai/tools/get-profile-documents";
import { manageProfile } from "@/lib/ai/tools/manage-profile";
import { queryDataAgent } from "@/lib/ai/tools/query-data-agent";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { searchKnowledge } from "@/lib/ai/tools/search-knowledge";
import { createTaskTool } from "@/lib/ai/tools/create-task";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import { getPostHogClient } from "@/lib/posthog-server";
import {
	createStreamId,
	deleteChatById,
	getChatById,
	getMessageCountByUserId,
	getMessagesByChatId,
	getOrganisationById,
	saveChat,
	saveMessages,
	updateChatLastContextById,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

const getTokenlensCatalog = cache(
	async (): Promise<ModelCatalog | undefined> => {
		try {
			return await fetchModels();
		} catch (err) {
			console.warn(
				"TokenLens: catalog fetch failed, using default catalog",
				err,
			);
			return; // tokenlens helpers will fall back to defaultCatalog
		}
	},
	["tokenlens-catalog"],
	{ revalidate: 24 * 60 * 60 }, // 24 hours
);

export async function POST(request: Request) {
	let requestBody: PostRequestBody;

	try {
		const json = await request.json();
		requestBody = postRequestBodySchema.parse(json);
	} catch (error) {
		console.error("[Chat API] Request validation failed:", error);
		return new ChatSDKError("bad_request:api").toResponse();
	}

	try {
		const {
			id,
			message,
			selectedChatModel,
			selectedVisibilityType,
		}: {
			id: string;
			message: ChatMessage;
			selectedChatModel: ChatModel["id"];
			selectedVisibilityType: VisibilityType;
		} = requestBody;

		const session = await auth();

		if (!session?.user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const userType: UserType = session.user.type;

		const messageCount = await getMessageCountByUserId({
			id: session.user.id,
			differenceInHours: 24,
		});

		if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
			return new ChatSDKError("rate_limit:chat").toResponse();
		}

		const chat = await getChatById({ id });
		let messagesFromDb: DBMessage[] = [];

		if (chat) {
			if (chat.userId !== session.user.id) {
				return new ChatSDKError("forbidden:chat").toResponse();
			}
			// Only fetch messages if chat already exists
			messagesFromDb = await getMessagesByChatId({ id });
		} else {
			const title = await generateTitleFromUserMessage({
				message,
			});

			await saveChat({
				id,
				userId: session.user.id,
				title,
				visibility: selectedVisibilityType,
			});
			// New chat - no need to fetch messages, it's empty
		}

		const uiMessages = [...convertToUIMessages(messagesFromDb), message].map(
			(msg) => {
				// Ensure assistant messages have text content to avoid API errors
				if (msg.role === "assistant") {
					const hasText = msg.parts.some(
						(part) => part.type === "text" && part.text?.trim(),
					);
					if (!hasText) {
						// Add minimal text to tool-only messages
						return {
							...msg,
							parts: [{ type: "text" as const, text: "." }, ...msg.parts],
						};
					}
				}
				return msg;
			},
		);

		const { longitude, latitude, city, country } = geolocation(request);

		const requestHints: RequestHints = {
			longitude,
			latitude,
			city,
			country,
		};

		// Fetch org settings for custom AI instructions (from cookie set by org switcher)
		const cookieStore = await cookies();
		const selectedOrgId = cookieStore.get("selectedOrgId")?.value || session.user.currentOrgId;
		const org = selectedOrgId
			? await getOrganisationById({ id: selectedOrgId })
			: null;
		const orgInstructions = org?.settings?.aiCompanion?.orgPrompt;

		await saveMessages({
			messages: [
				{
					chatId: id,
					id: message.id,
					role: "user",
					parts: message.parts,
					attachments: [],
					createdAt: new Date(),
				},
			],
		});

		const streamId = generateUUID();
		await createStreamId({ streamId, chatId: id });

		let finalMergedUsage: AppUsage | undefined;

		const stream = createUIMessageStream({
			execute: async ({ writer: dataStream }) => {
				// Wrap model with PostHog tracing for LLM analytics
				const tracedModel = withTracing(
					myProvider.languageModel(selectedChatModel),
					getPostHogClient(),
					{
						posthogDistinctId: session.user.id,
						posthogProperties: { chatId: id },
					},
				);

				const result = streamText({
					model: tracedModel,
					system: systemPrompt({ selectedChatModel, requestHints, orgInstructions }),
					messages: await convertToModelMessages(uiMessages),
					stopWhen: stepCountIs(5),
					experimental_activeTools:
						selectedChatModel === "chat-model-reasoning"
							? []
							: [
									"queryDataAgent",
									"getProfile",
									"getDocuments",
									"getCompliancePackages",
									"getMetadata",
									"manageProfile",
									"createForm",
									"draftEmail",
									"createDocument",
									"updateDocument",
									"requestSuggestions",
									"searchKnowledge",
									"createTask",
								],
					experimental_transform: smoothStream({ chunking: "word" }),
					tools: {
						queryDataAgent,
						getProfile,
						getDocuments,
						getCompliancePackages,
						getMetadata,
						manageProfile,
						createForm,
						draftEmail,
						createDocument: createDocument({ session, dataStream }),
						updateDocument: updateDocument({ session, dataStream }),
						requestSuggestions: requestSuggestions({
							session,
							dataStream,
						}),
						searchKnowledge,
						createTask: createTaskTool,
					},
					experimental_telemetry: {
						isEnabled: isProductionEnvironment,
						functionId: "stream-text",
					},
					onFinish: async ({ usage }) => {
						try {
							const providers = await getTokenlensCatalog();
							const modelId =
								myProvider.languageModel(selectedChatModel).modelId;
							if (!modelId) {
								finalMergedUsage = usage;
								dataStream.write({
									type: "data-usage",
									data: finalMergedUsage,
								});
								return;
							}

							if (!providers) {
								finalMergedUsage = usage;
								dataStream.write({
									type: "data-usage",
									data: finalMergedUsage,
								});
								return;
							}

							const summary = getUsage({ modelId, usage, providers });
							finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
							dataStream.write({ type: "data-usage", data: finalMergedUsage });
						} catch (err) {
							console.warn("TokenLens enrichment failed", err);
							finalMergedUsage = usage;
							dataStream.write({ type: "data-usage", data: finalMergedUsage });
						}
					},
				});

				result.consumeStream();

				dataStream.merge(
					result.toUIMessageStream({
						sendReasoning: true,
					}),
				);
			},
			generateId: generateUUID,
			onFinish: async ({ messages }) => {
				await saveMessages({
					messages: messages.map((currentMessage) => ({
						id: currentMessage.id,
						role: currentMessage.role,
						parts: currentMessage.parts,
						createdAt: new Date(),
						attachments: [],
						chatId: id,
					})),
				});

				if (finalMergedUsage) {
					try {
						await updateChatLastContextById({
							chatId: id,
							context: finalMergedUsage,
						});
					} catch (err) {
						console.warn("Unable to persist last usage for chat", id, err);
					}
				}
			},
			onError: () => {
				return "Oops, an error occurred!";
			},
		});

		return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
	} catch (error) {
		const vercelId = request.headers.get("x-vercel-id");

		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}

		console.error("Unhandled error in chat API:", error, { vercelId });
		return new ChatSDKError("offline:chat").toResponse();
	}
}

export async function DELETE(request: Request) {
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");

	if (!id) {
		return new ChatSDKError("bad_request:api").toResponse();
	}

	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError("unauthorized:chat").toResponse();
	}

	const chat = await getChatById({ id });

	if (chat?.userId !== session.user.id) {
		return new ChatSDKError("forbidden:chat").toResponse();
	}

	const deletedChat = await deleteChatById({ id });

	return Response.json(deletedChat, { status: 200 });
}
