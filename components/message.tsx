"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";
import { memo, useState } from "react";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { useDataStream } from "./data-stream-provider";
import { MessageContent } from "./elements/message";
import { Response } from "./elements/response";
import { SparklesIcon } from "./icons";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { hasToolHandler, renderTool } from "./tool-handlers";

const PurePreviewMessage = ({
	chatId,
	message,
	vote,
	isLoading,
	setMessages,
	regenerate,
	isReadonly,
	requiresScrollPadding,
}: {
	chatId: string;
	message: ChatMessage;
	vote: Vote | undefined;
	isLoading: boolean;
	setMessages: UseChatHelpers<ChatMessage>["setMessages"];
	regenerate: UseChatHelpers<ChatMessage>["regenerate"];
	isReadonly: boolean;
	requiresScrollPadding: boolean;
}) => {
	const [mode, setMode] = useState<"view" | "edit">("view");

	const attachmentsFromMessage = message.parts.filter(
		(part) => part.type === "file",
	);
	const completedToolCallIds = new Set(
		message.parts
			.filter(
				(part) =>
					Boolean(part) &&
					typeof part === "object" &&
					"type" in part &&
					typeof (part as { type?: unknown }).type === "string" &&
					((part as { type: string }).type.startsWith("tool-") ||
						(part as { type: string }).type === "dynamic-tool"),
			)
			.flatMap((part) => {
				const toolPart = part as {
					toolCallId?: string;
					output?: unknown;
					state?: string;
				};
				if (!toolPart.toolCallId) return [];
				const hasOutput = toolPart.output !== undefined;
				const isCompletedState =
					toolPart.state === "result" ||
					toolPart.state === "output-available" ||
					toolPart.state === "output-error" ||
					toolPart.state === "output-denied";
				return hasOutput || isCompletedState ? [toolPart.toolCallId] : [];
			}),
	);

	useDataStream();

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="group/message w-full"
			data-role={message.role}
			data-testid={`message-${message.role}`}
			initial={{ opacity: 0 }}
		>
			<div
				className={cn("flex w-full items-start gap-2 md:gap-3", {
					"justify-end": message.role === "user" && mode !== "edit",
					"justify-start": message.role === "assistant",
				})}
			>
				{message.role === "assistant" && (
					<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
						<SparklesIcon size={14} />
					</div>
				)}

				<div
					className={cn("flex flex-col", {
						"gap-2 md:gap-4": message.parts?.some(
							(p) => p.type === "text" && p.text?.trim(),
						),
						"min-h-96": message.role === "assistant" && requiresScrollPadding,
						"w-full":
							(message.role === "assistant" &&
								message.parts?.some(
									(p) => p.type === "text" && p.text?.trim(),
								)) ||
							mode === "edit",
						"max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
							message.role === "user" && mode !== "edit",
					})}
				>
					{attachmentsFromMessage.length > 0 && (
						<div
							className="flex flex-row justify-end gap-2"
							data-testid={"message-attachments"}
						>
							{attachmentsFromMessage.map((attachment) => (
								<PreviewAttachment
									attachment={{
										name: attachment.filename ?? "file",
										contentType: attachment.mediaType,
										url: attachment.url,
									}}
									key={attachment.url}
								/>
							))}
						</div>
					)}

						{message.parts?.map((part, index) => {
							if (
								!part ||
								typeof part !== "object" ||
								!("type" in part) ||
								typeof (part as { type?: unknown }).type !== "string"
							) {
								return null;
							}

							const { type } = part as { type: string };
							const key = `message-${message.id}-part-${index}`;

							if (type === "reasoning") {
								const reasoningPart = part as { text?: string };
								if (!reasoningPart.text?.trim().length) {
									return null;
								}
								return (
									<MessageReasoning
										isLoading={isLoading}
										key={key}
										reasoning={reasoningPart.text}
									/>
								);
							}

							if (type === "text") {
								const textPart = part as { text?: string };
								if (mode === "view") {
									return (
										<div key={key}>
										<MessageContent
											className={cn({
												"w-fit break-words rounded-2xl px-3 py-2 text-right text-white":
													message.role === "user",
												"bg-transparent px-0 py-0 text-left":
													message.role === "assistant",
											})}
											data-testid="message-content"
												style={
													message.role === "user"
														? { backgroundColor: "var(--primary)" }
														: undefined
												}
											>
												<Response>{sanitizeText(textPart.text ?? "")}</Response>
											</MessageContent>
										</div>
									);
							}

							if (mode === "edit") {
								return (
									<div
										className="flex w-full flex-row items-start gap-3"
										key={key}
									>
										<div className="size-8" />
										<div className="min-w-0 flex-1">
											<MessageEditor
												key={message.id}
												message={message}
												regenerate={regenerate}
												setMessages={setMessages}
												setMode={setMode}
											/>
										</div>
									</div>
								);
							}
						}

						// Handle all tool types through the registry
							const toolPart = part as {
								toolCallId?: string;
								toolName?: string;
								state?: string;
								input?: unknown;
								output?: unknown;
							};

							if (hasToolHandler(type, toolPart.toolName)) {
								const toolCallId =
									toolPart.toolCallId || `tool-part-${message.id}-${index}`;
								// Some streams keep both a "call" part and a later "result" part
								// for the same toolCallId. Hide stale pending duplicates once complete.
								if (
									toolPart.output === undefined &&
									toolPart.toolCallId &&
									completedToolCallIds.has(toolPart.toolCallId)
								) {
									return null;
								}
								return (
									<div key={`${toolCallId}-${index}`}>
										{renderTool(type, {
											toolCallId,
											state: toolPart.state as
												| "input-available"
												| "output-available"
											| undefined,
										input: toolPart.input,
										output: toolPart.output,
										isReadonly,
									}, toolPart.toolName)}
								</div>
							);
						}

						return null;
					})}

					{!isReadonly && (
						<MessageActions
							chatId={chatId}
							isLoading={isLoading}
							key={`action-${message.id}`}
							message={message}
							setMode={setMode}
							vote={vote}
						/>
					)}
				</div>
			</div>
		</motion.div>
	);
};

export const PreviewMessage = memo(
	PurePreviewMessage,
	(prevProps, nextProps) => {
		if (prevProps.isLoading !== nextProps.isLoading) {
			return false;
		}
		if (prevProps.message.id !== nextProps.message.id) {
			return false;
		}
		if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding) {
			return false;
		}
		if (!equal(prevProps.message.parts, nextProps.message.parts)) {
			return false;
		}
		if (!equal(prevProps.vote, nextProps.vote)) {
			return false;
		}

		return false;
	},
);

export const ThinkingMessage = () => {
	const role = "assistant";

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="group/message w-full"
			data-role={role}
			data-testid="message-assistant-loading"
			exit={{ opacity: 0, transition: { duration: 0.5 } }}
			initial={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
		>
			<div className="flex items-start justify-start gap-3">
				<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
					<SparklesIcon size={14} />
				</div>

				<div className="flex w-full flex-col gap-2 md:gap-4">
					<div className="p-0 text-muted-foreground text-sm">Thinking...</div>
				</div>
			</div>
		</motion.div>
	);
};
