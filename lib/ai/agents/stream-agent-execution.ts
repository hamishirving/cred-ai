/**
 * Shared SSE stream reader for agent executions.
 * Fires onStart when executionId arrives, resolves when agent completes.
 */
export async function streamAgentExecution(
	response: Response,
	onStart: (executionId: string) => void,
): Promise<"completed" | "failed" | null> {
	if (!response.body) return null;

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let executionId: string | null = null;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (!line.startsWith("data: ")) continue;
				try {
					const eventData = JSON.parse(line.slice(6));

					if (eventData.executionId && !executionId) {
						executionId = eventData.executionId as string;
						onStart(executionId);
					}

					if (
						eventData.status &&
						(eventData.status === "completed" || eventData.status === "failed")
					) {
						return eventData.status;
					}
				} catch {
					// Skip malformed events
				}
			}
		}
	} finally {
		reader.cancel();
	}

	return executionId ? "completed" : null;
}
