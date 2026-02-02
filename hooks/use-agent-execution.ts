/**
 * useAgentExecution Hook
 *
 * Client hook that consumes the agent execution SSE stream,
 * tracks steps, status, result, and optional live view URL.
 *
 * Supports two modes:
 * 1. Start a new execution via execute()
 * 2. Connect to an already-running execution via connectToExecution()
 */

"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentStep, AgentExecutionResult, BrowserAction } from "@/lib/ai/agents/types";

export type AgentStatus = "idle" | "running" | "completed" | "failed";

interface UseAgentExecutionReturn {
	/** Current execution status */
	status: AgentStatus;
	/** Steps captured so far */
	steps: AgentStep[];
	/** Final execution result */
	result: AgentExecutionResult | null;
	/** Error message (if failed) */
	error: string | null;
	/** Browserbase live view URL (if browser step active) */
	liveViewUrl: string | null;
	/** Real-time browser actions from Playwright automation */
	browserActions: BrowserAction[];
	/** The execution ID (available after SSE emits it) */
	executionId: string | null;
	/** Start a new agent execution — returns executionId via onExecutionId callback */
	execute: (agentId: string, input: Record<string, unknown>) => void;
	/** Connect to an already-running execution by polling */
	connectToExecution: (agentId: string, executionId: string) => void;
	/** Stop a running execution */
	stop: () => void;
	/** Reset state */
	reset: () => void;
}

export function useAgentExecution(): UseAgentExecutionReturn {
	const [status, setStatus] = useState<AgentStatus>("idle");
	const [steps, setSteps] = useState<AgentStep[]>([]);
	const [result, setResult] = useState<AgentExecutionResult | null>(null);
	const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
	const [browserActions, setBrowserActions] = useState<BrowserAction[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [executionId, setExecutionId] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const execute = useCallback(
		(agentId: string, input: Record<string, unknown>) => {
			// Abort any existing execution
			abortRef.current?.abort();
			if (pollRef.current) clearInterval(pollRef.current);

			// Reset state
			setStatus("running");
			setSteps([]);
			setResult(null);
			setLiveViewUrl(null);
			setBrowserActions([]);
			setError(null);
			setExecutionId(null);

			const controller = new AbortController();
			abortRef.current = controller;

			(async () => {
				try {
					const response = await fetch(
						`/api/agents/${agentId}/execute`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(input),
							signal: controller.signal,
						},
					);

					if (!response.ok) {
						let message = "Execution failed";
						try {
							const body = await response.json();
							message = body.error || body.message || message;
						} catch {
							message = `Request failed (${response.status})`;
						}
						setStatus("failed");
						setError(message);
						setResult({
							status: "failed",
							summary: message,
							steps: [],
							usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
							durationMs: 0,
						});
						return;
					}

					const reader = response.body?.getReader();
					if (!reader) {
						setStatus("failed");
						setError("No response stream");
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

						// Parse complete SSE events (terminated by \n\n)
						let boundary = buffer.indexOf("\n\n");
						while (boundary !== -1) {
							const eventBlock = buffer.slice(0, boundary);
							buffer = buffer.slice(boundary + 2);

							let eventName = "";
							let dataLine = "";

							for (const line of eventBlock.split("\n")) {
								if (line.startsWith("event: ")) {
									eventName = line.slice(7).trim();
								} else if (line.startsWith("data: ")) {
									dataLine = line.slice(6);
								}
							}

							if (eventName && dataLine) {
								try {
									const data = JSON.parse(dataLine);
									handleEvent(eventName, data);
								} catch {
									console.warn("[SSE] Failed to parse event:", eventName, dataLine.slice(0, 100));
								}
							}

							boundary = buffer.indexOf("\n\n");
						}
					}
				} catch (err) {
					if ((err as Error).name !== "AbortError") {
						const message = err instanceof Error ? err.message : "Connection lost";
						setStatus("failed");
						setError(message);
						setResult((prev) =>
							prev ?? {
								status: "failed",
								summary: message,
								steps: [],
								usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
								durationMs: 0,
							},
						);
					}
				}
			})();

			function handleEvent(event: string, data: unknown) {
				switch (event) {
					case "agent-execution-id": {
						const idData = data as { executionId: string };
						setExecutionId(idData.executionId);
						break;
					}
					case "agent-step":
						setSteps((prev) => [...prev, data as AgentStep]);
						break;
					case "agent-status": {
						const statusData = data as { status: string; error?: string };
						if (
							statusData.status === "completed" ||
							statusData.status === "failed"
						) {
							setStatus(
								statusData.status as "completed" | "failed",
							);
						}
						if (statusData.status === "failed" && statusData.error) {
							setError(statusData.error);
							setResult((prev) =>
								prev ?? {
									status: "failed",
									summary: statusData.error!,
									steps: [],
									usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
									durationMs: 0,
								},
							);
						}
						break;
					}
					case "agent-result":
						setResult(data as AgentExecutionResult);
						break;
					case "agent-liveview": {
						const viewData = data as { url: string };
						setLiveViewUrl(viewData.url);
						break;
					}
					case "agent-browser-action":
						setBrowserActions((prev) => [...prev, data as BrowserAction]);
						break;
				}
			}
		},
		[],
	);

	const connectToExecution = useCallback(
		(agentId: string, execId: string) => {
			if (pollRef.current) clearInterval(pollRef.current);
			abortRef.current?.abort();

			setExecutionId(execId);
			setStatus("running");

			const poll = setInterval(async () => {
				try {
					const res = await fetch(
						`/api/agents/${agentId}/executions/${execId}`,
					);
					if (!res.ok) return;
					const data = await res.json();
					if (!data.execution) return;

					const exec = data.execution;
					setSteps(exec.steps || []);

					if (exec.status === "completed" || exec.status === "failed") {
						clearInterval(poll);
						pollRef.current = null;
						setStatus(exec.status);
						if (exec.status === "failed") {
							setError(exec.output?.error || "Execution failed");
						}
						if (exec.output) {
							setResult({
								status: exec.status,
								summary: exec.output.summary || exec.output.error || "",
								steps: exec.steps || [],
								usage: exec.tokensUsed || { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
								durationMs: exec.durationMs || 0,
							});
						}
					}
				} catch {
					// Retry on next interval
				}
			}, 2000);

			pollRef.current = poll;
		},
		[],
	);

	const stop = useCallback(() => {
		abortRef.current?.abort();
		if (pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}
		setStatus("failed");
		setError("Execution stopped by user");
		setResult((prev) =>
			prev ?? {
				status: "failed",
				summary: "Execution stopped by user",
				steps: [],
				usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
				durationMs: 0,
			},
		);
	}, []);

	const reset = useCallback(() => {
		abortRef.current?.abort();
		if (pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}
		setStatus("idle");
		setSteps([]);
		setResult(null);
		setError(null);
		setLiveViewUrl(null);
		setBrowserActions([]);
		setExecutionId(null);
	}, []);

	return {
		status,
		steps,
		result,
		error,
		liveViewUrl,
		browserActions,
		executionId,
		execute,
		connectToExecution,
		stop,
		reset,
	};
}
