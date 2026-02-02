/**
 * Agent Runner
 *
 * Core execution engine for agents. Wraps AI SDK's streamText with
 * 4-layer prompt assembly, tool subset resolution, step capture, and SSE streaming.
 * Persists executions to the database for audit trails.
 */

import { stepCountIs, streamText } from "ai";
import { myProvider } from "@/lib/ai/providers";
import {
	createAgentExecution,
	updateAgentExecution,
} from "@/lib/db/queries";
import type {
	BrowserAction,
	AgentDefinition,
	AgentExecutionContext,
	AgentStep,
} from "./types";
import { resolveTools } from "./tool-resolver";

/** Layer 1: System-level safety and behaviour rails */
function getAgentSystemBase(): string {
	const now = new Date();
	return `You are an autonomous AI agent executing a specific task for a compliance platform.

CURRENT DATE/TIME: ${now.toISOString()} (${now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })})

RULES:
- Use British English spelling (organisation, colour, favour)
- Never hallucinate compliance requirements — only reference data from tools
- Be precise and factual in all outputs
- When unsure, escalate to a human via create-task rather than guessing
- Complete the task steps methodically, one at a time
- Be CONCISE — after each tool call, write ONE short sentence about the result then move on
- Do NOT repeat data that's already visible in tool outputs
- Your final summary should be 2-3 short bullet points, not a full report
- NEVER use emoji in your output — no ✅, 🎉, ✓ symbols etc.
- Never use sign-off lines like "The Oakwood Care Team"
- Never use headings larger than ### in your output
- When setting due dates, always use dates in the future relative to the current date above`;
}

/**
 * Assemble the 4-layer prompt for an agent execution.
 */
function buildAgentPrompt(
	agent: AgentDefinition,
	ctx: AgentExecutionContext,
	dynamicContext?: string,
): string {
	const layers = [
		// Layer 1: System base
		getAgentSystemBase(),
		// Layer 2: Organisation prompt
		ctx.orgPrompt ? `\nORGANISATION CONTEXT:\n${ctx.orgPrompt}` : "",
		// Layer 3: Agent-specific prompt
		`\nAGENT: ${agent.name}\n${agent.systemPrompt}`,
		// Layer 4: Dynamic context
		dynamicContext ? `\nCONTEXT:\n${dynamicContext}` : "",
	];

	return layers.filter(Boolean).join("\n");
}

/**
 * Build the initial user message from agent input.
 */
function buildInvocationMessage(
	agent: AgentDefinition,
	input: Record<string, unknown>,
): string {
	const parts = [`Execute the "${agent.name}" agent with the following input:`];

	for (const [key, value] of Object.entries(input)) {
		if (value !== undefined && value !== null && value !== "") {
			parts.push(`- ${key}: ${String(value)}`);
		}
	}

	return parts.join("\n");
}

export interface AgentStreamCallbacks {
	/** Called when a step completes */
	onStep: (step: AgentStep) => void;
	/** Called when a live view URL is detected from a browser tool */
	onLiveView?: (url: string) => void;
	/** Called when a browser action occurs in real-time during browseAndVerify */
	onBrowserAction?: (action: BrowserAction) => void;
	/** Called when execution completes */
	onComplete: (result: {
		status: "completed" | "failed";
		summary: string;
		steps: AgentStep[];
		usage: { inputTokens: number; outputTokens: number; totalTokens: number };
		durationMs: number;
		executionId: string;
	}) => void;
	/** Called when the execution record is created (provides executionId) */
	onExecutionCreated?: (executionId: string) => void;
	/** Called on error */
	onError: (error: Error) => void;
}

/**
 * Execute an agent — the core runner.
 *
 * Assembles the prompt, resolves tools, runs the agent loop via streamText,
 * and captures every step for the activity log and client streaming.
 * Persists execution to database for audit trail.
 */
export async function executeAgent(
	agent: AgentDefinition,
	ctx: AgentExecutionContext,
	callbacks: AgentStreamCallbacks,
): Promise<void> {
	const startTime = Date.now();
	const steps: AgentStep[] = [];
	let stepIndex = 0;
	let executionId = "";

	try {
		// Create DB record for this execution
		const execution = await createAgentExecution({
			agentId: agent.id,
			orgId: ctx.orgId || undefined,
			userId: ctx.userId,
			triggerType: ctx.triggerType || "manual",
			input: ctx.input,
			model: "claude-sonnet-4-5",
		});
		executionId = execution.id;
		callbacks.onExecutionCreated?.(executionId);

		// Assemble dynamic context if the agent provides a resolver
		const dynamicContext = agent.dynamicContext
			? await agent.dynamicContext(ctx)
			: undefined;

		// Build the 4-layer system prompt
		const system = buildAgentPrompt(agent, ctx, dynamicContext);

		// Resolve tool subset (inject browser action callback for real-time streaming)
		const tools = resolveTools(agent.tools, {
			onBrowserAction: callbacks.onBrowserAction,
		});

		// Build invocation message
		const userMessage = buildInvocationMessage(agent, ctx.input);

		const result = streamText({
			model: myProvider.languageModel("chat-model"),
			system,
			messages: [{ role: "user", content: userMessage }],
			tools,
			maxRetries: 2,
			timeout: {
				totalMs: agent.constraints.maxExecutionTime,
				chunkMs: 30_000,
			},
			stopWhen: stepCountIs(agent.constraints.maxSteps),
			onStepFinish: async (event) => {
				stepIndex++;
				const stepTimestamp = new Date().toISOString();

				// Capture tool calls
				if (event.toolCalls && event.toolCalls.length > 0) {
					for (const toolCall of event.toolCalls) {
						const toolResult = event.toolResults?.find(
							(r) => r.toolCallId === toolCall.toolCallId,
						);

						const step: AgentStep = {
							index: stepIndex,
							type: "tool-call",
							toolName: toolCall.toolName,
							toolInput: toolCall.input as Record<string, unknown>,
							toolOutput: toolResult?.output,
							timestamp: stepTimestamp,
						};

						steps.push(step);
						callbacks.onStep(step);

						// Detect live view URL from browser tools
						if (
							callbacks.onLiveView &&
							toolResult?.output &&
							typeof toolResult.output === "object" &&
							toolResult.output !== null &&
							"data" in (toolResult.output as Record<string, unknown>)
						) {
							const data = (toolResult.output as { data?: { liveViewUrl?: string } }).data;
							if (data?.liveViewUrl) {
								callbacks.onLiveView(data.liveViewUrl);
							}
						}
					}
				}

				// Capture text output
				if (event.text && event.text.trim()) {
					const step: AgentStep = {
						index: stepIndex,
						type: "text",
						content: event.text,
						timestamp: stepTimestamp,
					};

					steps.push(step);
					callbacks.onStep(step);
				}

				// Update DB with current steps (non-blocking)
				updateAgentExecution({
					id: executionId,
					steps: [...steps],
				}).catch((err) =>
					console.warn("[agent-runner] Failed to update steps:", err),
				);
			},
			onFinish: async ({ usage }) => {
				const durationMs = Date.now() - startTime;
				const usageData = {
					inputTokens: usage.inputTokens ?? 0,
					outputTokens: usage.outputTokens ?? 0,
					totalTokens: usage.totalTokens ?? 0,
				};

				// Finalise DB record
				try {
					await updateAgentExecution({
						id: executionId,
						status: "completed",
						steps,
						output: {
							summary:
								steps
									.filter((s) => s.type === "text")
									.map((s) => s.content)
									.pop() || "Agent execution completed.",
						},
						tokensUsed: usageData,
						durationMs,
					});
				} catch (err) {
					console.warn("[agent-runner] Failed to finalise execution:", err);
				}

				callbacks.onComplete({
					status: "completed",
					summary:
						steps
							.filter((s) => s.type === "text")
							.map((s) => s.content)
							.pop() || "Agent execution completed.",
					steps,
					usage: usageData,
					durationMs,
					executionId,
				});
			},
		});

		// Consume the stream to trigger execution
		await result.consumeStream();
	} catch (error) {
		// Mark as failed in DB
		if (executionId) {
			updateAgentExecution({
				id: executionId,
				status: "failed",
				steps,
				durationMs: Date.now() - startTime,
				output: {
					error: error instanceof Error ? error.message : String(error),
				},
			}).catch((err) =>
				console.warn("[agent-runner] Failed to record failure:", err),
			);
		}

		callbacks.onError(
			error instanceof Error ? error : new Error(String(error)),
		);
	}
}
