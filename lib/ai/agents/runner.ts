/**
 * Agent Runner
 *
 * Core execution engine for agents. Wraps AI SDK's streamText with
 * 4-layer prompt assembly, tool subset resolution, step capture, and SSE streaming.
 * Persists executions to the database for audit trails.
 */

import { generateObject, stepCountIs, streamText } from "ai";
import { myProvider } from "@/lib/ai/providers";
import {
	createAgentExecution,
	upsertAgentMemory,
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
 * Serialise a single input value for the invocation message.
 *
 * Handles the `attachments` array specially: strips base64Content (which is
 * huge and not useful in the prompt) and produces a readable summary so the
 * model knows exactly which files are present and can call storeAttachment
 * with the right parameters.
 *
 * For other arrays/objects, falls back to compact JSON.
 */
function formatInputValue(key: string, value: unknown): string {
	// Attachments: summarise metadata with index, omit raw base64 data
	if (key === "attachments" && Array.isArray(value)) {
		if (value.length === 0) return "none";
		return (
			`${value.length} file(s):\n` +
			value
				.map((att, i) => {
					const a = att as Record<string, unknown>;
					return [
						`  [attachmentIndex: ${i}] fileName: ${a.fileName ?? "unknown"}`,
						`      contentType: ${a.contentType ?? "unknown"}`,
						`      contentLength: ${a.contentLength ?? "unknown"} bytes`,
					].join("\n");
				})
				.join("\n")
		);
	}

	// Other arrays / objects: compact JSON (truncated if massive)
	if (typeof value === "object") {
		const json = JSON.stringify(value);
		if (json.length > 2000) return `${json.slice(0, 2000)}... (truncated)`;
		return json;
	}

	return String(value);
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
			parts.push(`- ${key}: ${formatInputValue(key, value)}`);
		}
	}

	// Explicit instruction when attachments are present — reinforces the
	// system prompt so the model doesn't skip the PROCESS ATTACHMENTS step.
	if (
		"attachments" in input &&
		Array.isArray(input.attachments) &&
		input.attachments.length > 0
	) {
		parts.push(
			"",
			`IMPORTANT: This email has ${input.attachments.length} attachment(s). You MUST process each one using storeAttachment before composing your reply. Pass the attachmentIndex (${input.attachments.map((_: unknown, i: number) => i).join(", ")}) to select each file.`,
		);
	}

	return parts.join("\n");
}

const REQUIRED_TOOL_CALLS_BY_AGENT: Record<
	string,
	{ always: string[]; withAttachments?: string[] }
> = {
	"inbound-email-responder": {
		always: ["draftEmail"],
		withAttachments: ["verifyDocumentEvidence"],
	},
};

function mergeUsage(
	acc: { inputTokens: number; outputTokens: number; totalTokens: number },
	usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
): void {
	acc.inputTokens += usage.inputTokens ?? 0;
	acc.outputTokens += usage.outputTokens ?? 0;
	acc.totalTokens += usage.totalTokens ?? 0;
}

function getMissingRequiredTools(
	agent: AgentDefinition,
	ctx: AgentExecutionContext,
	steps: AgentStep[],
): string[] {
	const rules = REQUIRED_TOOL_CALLS_BY_AGENT[agent.id];
	if (!rules) return [];

	const calledTools = new Set(
		steps
			.filter((s) => s.type === "tool-call" && s.toolName)
			.map((s) => s.toolName as string),
	);

	const required = [...rules.always];
	if (
		Array.isArray(ctx.input.attachments) &&
		ctx.input.attachments.length > 0 &&
		rules.withAttachments
	) {
		required.push(...rules.withAttachments);
	}

	return required.filter((toolName) => !calledTools.has(toolName));
}

function buildCompletionFollowupMessage(
	agent: AgentDefinition,
	steps: AgentStep[],
	missingTools: string[],
): string {
	const recentToolSummary = steps
		.filter((s) => s.type === "tool-call")
		.slice(-12)
		.map((s) => {
			const input = s.toolInput ? JSON.stringify(s.toolInput) : "{}";
			const output = s.toolOutput ? JSON.stringify(s.toolOutput) : "{}";
			return `Tool: ${s.toolName}\nInput: ${input.slice(0, 500)}\nOutput: ${output.slice(0, 1000)}`;
		})
		.join("\n\n");

	return `Continue the "${agent.name}" task. You are not done yet.

REQUIRED REMAINING TOOL CALLS (must complete before finishing):
- ${missingTools.join("\n- ")}

After completing these required calls, provide your normal concise completion text.

Recent execution context:
${recentToolSummary || "No prior tool calls."}`;
}

function isUuid(value: unknown): value is string {
	return (
		typeof value === "string" &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			value,
		)
	);
}

function findMostRecentUuidInput(
	steps: AgentStep[],
	keys: string[],
): string | null {
	for (let i = steps.length - 1; i >= 0; i--) {
		const step = steps[i];
		if (step.type !== "tool-call" || !step.toolInput) continue;

		for (const key of keys) {
			const value = step.toolInput[key];
			if (isUuid(value)) {
				return value;
			}
		}
	}

	return null;
}

async function ensureMemoryPersisted({
	agent,
	ctx,
	steps,
	stepIndex,
	onStep,
}: {
	agent: AgentDefinition;
	ctx: AgentExecutionContext;
	steps: AgentStep[];
	stepIndex: number;
	onStep: (step: AgentStep) => void;
}): Promise<number> {
	if (!agent.tools.includes("saveAgentMemory")) return stepIndex;

	const alreadySaved = steps.some(
		(s) => s.type === "tool-call" && s.toolName === "saveAgentMemory",
	);
	if (alreadySaved) return stepIndex;

	const subjectId = findMostRecentUuidInput(steps, ["subjectId", "profileId"]);
	const orgId = isUuid(ctx.orgId)
		? ctx.orgId
		: findMostRecentUuidInput(steps, ["orgId", "organisationId"]);

	if (!subjectId || !orgId) {
		console.warn(
			"[agent-runner] Skipping auto-memory save: missing subjectId/orgId",
			{ agentId: agent.id, subjectId, orgId },
		);
		return stepIndex;
	}

	const latestText =
		steps
			.filter((s) => s.type === "text" && s.content?.trim())
			.map((s) => s.content)
			.pop() || "";
	const recentTools = steps
		.filter((s) => s.type === "tool-call" && s.toolName)
		.map((s) => s.toolName as string)
		.slice(-8);

	const memory: Record<string, unknown> = {
		autoSavedByRunner: true,
		timestamp: new Date().toISOString(),
		summary: latestText || "Agent execution completed.",
		recentTools,
		input: {
			senderEmail:
				typeof ctx.input.senderEmail === "string" ? ctx.input.senderEmail : null,
			subject: typeof ctx.input.subject === "string" ? ctx.input.subject : null,
		},
	};

	try {
		const saved = await upsertAgentMemory({
			agentId: agent.id,
			subjectId,
			orgId,
			memory,
		});

		const timestamp = new Date().toISOString();
		const autoSaveStep: AgentStep = {
			index: stepIndex + 1,
			type: "tool-call",
			toolName: "saveAgentMemory",
			toolInput: {
				agentId: agent.id,
				subjectId,
				orgId,
				memory,
			},
			toolOutput: {
				data: {
					success: true,
					autoSavedByRunner: true,
					runCount: saved.runCount,
				},
			},
			timestamp,
		};

		steps.push(autoSaveStep);
		onStep(autoSaveStep);
		return stepIndex + 1;
	} catch (error) {
		console.warn("[agent-runner] Auto-memory save failed:", error);
		return stepIndex;
	}
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
	console.log("[agent-runner] executeAgent called for:", agent.id);
	console.log("[agent-runner] Tools:", agent.tools);
	const startTime = Date.now();
	const steps: AgentStep[] = [];
	const browserActions: BrowserAction[] = [];
	let stepIndex = 0;
	let executionId = "";
	let streamUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

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

		// Wrap browser action callback to collect actions AND forward to client
		const handleBrowserAction = (action: BrowserAction) => {
			browserActions.push(action);
			callbacks.onBrowserAction?.(action);
			// Persist to DB periodically (non-blocking)
			updateAgentExecution({
				id: executionId,
				browserActions: [...browserActions],
			}).catch((err) =>
				console.warn("[agent-runner] Failed to update browser actions:", err),
			);
		};

		// Extract attachments from input (if present) for context-aware tool resolution
		const attachments =
			Array.isArray(ctx.input.attachments) && ctx.input.attachments.length > 0
				? (ctx.input.attachments as Array<{
						fileName: string;
						contentType: string;
						base64Content: string;
						contentLength: number;
				  }>)
				: undefined;

		// Resolve tool subset (inject browser action callback + attachments for context-aware tools)
		const tools = resolveTools(agent.tools, {
			onBrowserAction: handleBrowserAction,
			attachments,
			organisationId: ctx.orgId || undefined,
			agentId: agent.id,
			executionId,
			executionInput: ctx.input,
		});
		console.log("[agent-runner] Resolved tools:", Object.keys(tools));

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
				chunkMs: 120_000, // Increased for long-running browser tools
			},
			stopWhen: stepCountIs(agent.constraints.maxSteps),
			onStepFinish: async (event) => {
				stepIndex++;
				console.log(`[agent-runner] onStepFinish #${stepIndex}, toolCalls:`, event.toolCalls?.length || 0);
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
				console.log("[agent-runner] onFinish called, steps:", steps.length);
				// Store usage for later — onComplete is called after structured output phase
				mergeUsage(streamUsage, usage);
			},
		});

		// Consume the stream to trigger execution
		await result.consumeStream();

		// Completion guard: if required tools were skipped, run a short follow-up pass.
		// This prevents early termination before critical side effects (e.g. draftEmail).
		let missingRequiredTools = getMissingRequiredTools(agent, ctx, steps);
		let completionPasses = 0;
		while (missingRequiredTools.length > 0 && completionPasses < 2) {
			completionPasses++;
			console.warn(
				"[agent-runner] Missing required tool calls, running completion pass:",
				{ agentId: agent.id, missingRequiredTools, pass: completionPasses },
			);

			const followupResult = streamText({
				model: myProvider.languageModel("chat-model"),
				system,
				messages: [
					{
						role: "user",
						content: buildCompletionFollowupMessage(
							agent,
							steps,
							missingRequiredTools,
						),
					},
				],
				tools,
				maxRetries: 1,
				timeout: {
					totalMs: 60_000,
					chunkMs: 60_000,
				},
				stopWhen: stepCountIs(8),
				onStepFinish: async (event) => {
					stepIndex++;
					const stepTimestamp = new Date().toISOString();

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
						}
					}

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

					updateAgentExecution({
						id: executionId,
						steps: [...steps],
					}).catch((err) =>
						console.warn("[agent-runner] Failed to update steps:", err),
					);
				},
				onFinish: async ({ usage }) => {
					mergeUsage(streamUsage, usage);
				},
			});

			await followupResult.consumeStream();
			missingRequiredTools = getMissingRequiredTools(agent, ctx, steps);
		}

		// Phase 2: If agent has outputSchema, make a separate generateObject call
		// to structure the collected tool results into the desired shape.
		// This is separate from streamText so tool calling isn't skipped.
		if (agent.outputSchema) {
			try {
				const toolSummary = steps
					.filter((s) => s.type === "tool-call")
					.map((s) => `Tool: ${s.toolName}\nInput: ${JSON.stringify(s.toolInput)}\nOutput: ${JSON.stringify(s.toolOutput)}`)
					.join("\n\n");

				const { object: structuredOutput } = await generateObject({
					model: myProvider.languageModel("chat-model"),
					schema: agent.outputSchema,
					prompt: `Based on the following tool results from the "${agent.name}" agent, produce the structured output.\n\nAgent system prompt:\n${agent.systemPrompt}\n\nTool results:\n${toolSummary}`,
				});

				if (structuredOutput) {
					stepIndex++;
					const structuredStep: AgentStep = {
						index: stepIndex,
						type: "structured-output",
						structuredOutput,
						timestamp: new Date().toISOString(),
					};
					steps.push(structuredStep);
					callbacks.onStep(structuredStep);
				}
			} catch (err) {
				console.warn("[agent-runner] Failed to generate structured output:", err);
			}
		}

		// Ensure memory is persisted when the agent has memory tools, even if the
		// model forgot to call saveAgentMemory explicitly.
		stepIndex = await ensureMemoryPersisted({
			agent,
			ctx,
			steps,
			stepIndex,
			onStep: callbacks.onStep,
		});

		// Now finalise: send onComplete and update DB
		const durationMs = Date.now() - startTime;
		const usageData = streamUsage;
		const summary = steps
			.filter((s) => s.type === "text")
			.map((s) => s.content)
			.pop() || "Agent execution completed.";
		const structuredOutput = steps.find((s) => s.type === "structured-output")?.structuredOutput;

		try {
			await updateAgentExecution({
				id: executionId,
				status: "completed",
				steps,
				output: { summary, ...(structuredOutput ? { structuredOutput } : {}) },
				tokensUsed: usageData,
				durationMs,
			});
		} catch (err) {
			console.warn("[agent-runner] Failed to finalise execution:", err);
		}

		callbacks.onComplete({
			status: "completed",
			summary,
			steps,
			usage: usageData,
			durationMs,
			executionId,
		});
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
