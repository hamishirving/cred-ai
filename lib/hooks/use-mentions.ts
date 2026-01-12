import { useState, useCallback, useMemo } from "react";
import type { AdminUser } from "@/lib/data/mock-admins";

export interface MentionedUser {
	id: string;
	name: string;
}

interface UseMentionsReturn {
	/** Currently mentioned users in the message */
	mentionedUsers: MentionedUser[];
	/** Add a mention when user selects from dropdown */
	addMention: (user: AdminUser) => void;
	/** Remove a mention (e.g., when user deletes the @name from text) */
	removeMention: (userId: string) => void;
	/** Clear all mentions (e.g., on message send) */
	clearMentions: () => void;
	/** Check if text still contains all mentions, remove orphaned ones */
	syncMentionsWithText: (text: string) => void;
}

/**
 * Hook for managing @ mentions in chat input.
 */
export function useMentions(): UseMentionsReturn {
	const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]);

	const addMention = useCallback((user: AdminUser) => {
		setMentionedUsers((prev) => {
			// Don't add duplicates
			if (prev.some((m) => m.id === user.id)) {
				return prev;
			}
			return [...prev, { id: user.id, name: `${user.firstName} ${user.lastName}` }];
		});
	}, []);

	const removeMention = useCallback((userId: string) => {
		setMentionedUsers((prev) => prev.filter((m) => m.id !== userId));
	}, []);

	const clearMentions = useCallback(() => {
		setMentionedUsers([]);
	}, []);

	const syncMentionsWithText = useCallback((text: string) => {
		setMentionedUsers((prev) =>
			prev.filter((mention) => {
				// Check if @FirstName is still in the text
				const firstName = mention.name.split(" ")[0];
				return text.includes(`@${firstName}`);
			}),
		);
	}, []);

	return {
		mentionedUsers,
		addMention,
		removeMention,
		clearMentions,
		syncMentionsWithText,
	};
}
