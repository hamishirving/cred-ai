"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import { memo } from "react";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "./elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
	chatId: string;
	sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
	selectedVisibilityType: VisibilityType;
};

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
	const suggestedActions = [
		"Find a candidate by name",
		"Draft a document reminder email",
		"Create a feedback form",
		"What's the DBS check policy?",
	];

	return (
		<div
			className="grid w-full gap-2 sm:grid-cols-2"
			data-testid="suggested-actions"
		>
			{suggestedActions.map((suggestedAction, index) => (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					initial={{ opacity: 0, y: 20 }}
					key={suggestedAction}
					transition={{ delay: 0.05 * index }}
				>
					<Suggestion
						className="h-auto w-full whitespace-normal p-3 text-left"
						onClick={(suggestion) => {
							// Track suggested action click event
							posthog.capture("suggested_action_clicked", {
								chat_id: chatId,
								suggestion_text: suggestion,
								suggestion_index: index,
							});

							window.history.replaceState({}, "", `/chat/${chatId}`);
							sendMessage({
								role: "user",
								parts: [{ type: "text", text: suggestion }],
							});
						}}
						suggestion={suggestedAction}
					>
						{suggestedAction}
					</Suggestion>
				</motion.div>
			))}
		</div>
	);
}

export const SuggestedActions = memo(
	PureSuggestedActions,
	(prevProps, nextProps) => {
		if (prevProps.chatId !== nextProps.chatId) {
			return false;
		}
		if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
			return false;
		}

		return true;
	},
);
