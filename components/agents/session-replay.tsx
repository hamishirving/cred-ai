"use client";

import { ExternalLink } from "lucide-react";

interface SessionReplayProps {
	sessionId: string;
}

export function SessionReplay({ sessionId }: SessionReplayProps) {
	const dashboardUrl = `https://www.browserbase.com/sessions/${sessionId}`;

	return (
		<a
			href={dashboardUrl}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
		>
			<ExternalLink className="size-3" />
			Watch session replay
		</a>
	);
}
