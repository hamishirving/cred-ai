/**
 * useSkillExecution Hook
 *
 * Client hook that consumes the skill execution SSE stream,
 * tracks steps, status, result, and optional live view URL.
 */

"use client";

import { useCallback, useRef, useState } from "react";
import type { SkillStep, SkillExecutionResult, BrowserAction } from "@/lib/ai/skills/types";

export type SkillStatus = "idle" | "running" | "completed" | "failed";

interface UseSkillExecutionReturn {
	/** Current execution status */
	status: SkillStatus;
	/** Steps captured so far */
	steps: SkillStep[];
	/** Final execution result */
	result: SkillExecutionResult | null;
	/** Browserbase live view URL (if browser step active) */
	liveViewUrl: string | null;
	/** Real-time browser actions from Stagehand agent */
	browserActions: BrowserAction[];
	/** Start a skill execution */
	execute: (skillId: string, input: Record<string, unknown>) => void;
	/** Reset state */
	reset: () => void;
}

export function useSkillExecution(): UseSkillExecutionReturn {
	const [status, setStatus] = useState<SkillStatus>("idle");
	const [steps, setSteps] = useState<SkillStep[]>([]);
	const [result, setResult] = useState<SkillExecutionResult | null>(null);
	const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
	const [browserActions, setBrowserActions] = useState<BrowserAction[]>([]);
	const abortRef = useRef<AbortController | null>(null);

	const execute = useCallback(
		(skillId: string, input: Record<string, unknown>) => {
			// Abort any existing execution
			abortRef.current?.abort();

			// Reset state
			setStatus("running");
			setSteps([]);
			setResult(null);
			setLiveViewUrl(null);
			setBrowserActions([]);

			const controller = new AbortController();
			abortRef.current = controller;

			(async () => {
				try {
					const response = await fetch(
						`/api/skills/${skillId}/execute`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(input),
							signal: controller.signal,
						},
					);

					if (!response.ok) {
						const error = await response.json();
						setStatus("failed");
						setResult({
							status: "failed",
							summary: error.error || "Execution failed",
							steps: [],
							usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
							durationMs: 0,
						});
						return;
					}

					const reader = response.body?.getReader();
					if (!reader) {
						setStatus("failed");
						setResult({
							status: "failed",
							summary: "No response stream",
							steps: [],
							usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
							durationMs: 0,
						});
						return;
					}

					const decoder = new TextDecoder();
					let buffer = "";

					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						buffer += decoder.decode(value, { stream: true });

						// Parse SSE events from buffer
						const lines = buffer.split("\n");
						buffer = lines.pop() || "";

						let currentEvent = "";

						for (const line of lines) {
							if (line.startsWith("event: ")) {
								currentEvent = line.slice(7).trim();
							} else if (line.startsWith("data: ") && currentEvent) {
								try {
									const data = JSON.parse(line.slice(6));
									handleEvent(currentEvent, data);
								} catch {
									// Ignore parse errors
								}
								currentEvent = "";
							}
						}
					}
				} catch (error) {
					if ((error as Error).name !== "AbortError") {
						setStatus("failed");
					}
				}
			})();

			function handleEvent(event: string, data: unknown) {
				switch (event) {
					case "skill-step":
						setSteps((prev) => [...prev, data as SkillStep]);
						break;
					case "skill-status": {
						const statusData = data as { status: string };
						if (
							statusData.status === "completed" ||
							statusData.status === "failed"
						) {
							setStatus(
								statusData.status as "completed" | "failed",
							);
						}
						break;
					}
					case "skill-result":
						setResult(data as SkillExecutionResult);
						break;
					case "skill-liveview": {
						const viewData = data as { url: string };
						setLiveViewUrl(viewData.url);
						break;
					}
					case "skill-browser-action":
						setBrowserActions((prev) => [...prev, data as BrowserAction]);
						break;
				}
			}
		},
		[],
	);

	const reset = useCallback(() => {
		abortRef.current?.abort();
		setStatus("idle");
		setSteps([]);
		setResult(null);
		setLiveViewUrl(null);
		setBrowserActions([]);
	}, []);

	return {
		status,
		steps,
		result,
		liveViewUrl,
		browserActions,
		execute,
		reset,
	};
}
