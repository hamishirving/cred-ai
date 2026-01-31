/**
 * Skill Runner
 *
 * Core execution engine for skills. Wraps AI SDK's streamText with
 * 4-layer prompt assembly, tool subset resolution, step capture, and SSE streaming.
 * Persists executions to the database for audit trails.
 */

import { stepCountIs, streamText } from "ai";
import { myProvider } from "@/lib/ai/providers";
import {
	createSkillExecution,
	updateSkillExecution,
} from "@/lib/db/queries";
import type {
	BrowserAction,
	SkillDefinition,
	SkillExecutionContext,
	SkillStep,
} from "./types";
import { resolveTools } from "./tool-resolver";

/** Layer 1: System-level safety and behaviour rails */
const SKILL_SYSTEM_BASE = `You are an autonomous AI agent executing a specific skill for a compliance platform.

RULES:
- Use British English spelling (organisation, colour, favour)
- Never hallucinate compliance requirements — only reference data from tools
- Be precise and factual in all outputs
- When unsure, escalate to a human via create-task rather than guessing
- Complete the skill steps methodically, one at a time
- Be CONCISE — after each tool call, write ONE short sentence about the result then move on
- Do NOT repeat data that's already visible in tool outputs
- Your final summary should be 2-3 short bullet points, not a full report
- NEVER use emoji in your output — no ✅, 🎉, ✓ symbols etc.
- Never use sign-off lines like "The Oakwood Care Team"
- Never use headings larger than ### in your output`;

/**
 * Assemble the 4-layer prompt for a skill execution.
 */
function buildSkillPrompt(
	skill: SkillDefinition,
	ctx: SkillExecutionContext,
	dynamicContext?: string,
): string {
	const layers = [
		// Layer 1: System base
		SKILL_SYSTEM_BASE,
		// Layer 2: Organisation prompt
		ctx.orgPrompt ? `\nORGANISATION CONTEXT:\n${ctx.orgPrompt}` : "",
		// Layer 3: Skill-specific prompt
		`\nSKILL: ${skill.name}\n${skill.systemPrompt}`,
		// Layer 4: Dynamic context
		dynamicContext ? `\nCONTEXT:\n${dynamicContext}` : "",
	];

	return layers.filter(Boolean).join("\n");
}

/**
 * Build the initial user message from skill input.
 */
function buildInvocationMessage(
	skill: SkillDefinition,
	input: Record<string, unknown>,
): string {
	const parts = [`Execute the "${skill.name}" skill with the following input:`];

	for (const [key, value] of Object.entries(input)) {
		if (value !== undefined && value !== null && value !== "") {
			parts.push(`- ${key}: ${String(value)}`);
		}
	}

	return parts.join("\n");
}

export interface SkillStreamCallbacks {
	/** Called when a step completes */
	onStep: (step: SkillStep) => void;
	/** Called when a live view URL is detected from a browser tool */
	onLiveView?: (url: string) => void;
	/** Called when a browser action occurs in real-time during browseAndVerify */
	onBrowserAction?: (action: BrowserAction) => void;
	/** Called when execution completes */
	onComplete: (result: {
		status: "completed" | "failed";
		summary: string;
		steps: SkillStep[];
		usage: { inputTokens: number; outputTokens: number; totalTokens: number };
		durationMs: number;
		executionId: string;
	}) => void;
	/** Called on error */
	onError: (error: Error) => void;
}

/**
 * Execute a skill — the core runner.
 *
 * Assembles the prompt, resolves tools, runs the agent loop via streamText,
 * and captures every step for the activity log and client streaming.
 * Persists execution to database for audit trail.
 */
export async function executeSkill(
	skill: SkillDefinition,
	ctx: SkillExecutionContext,
	callbacks: SkillStreamCallbacks,
): Promise<void> {
	const startTime = Date.now();
	const steps: SkillStep[] = [];
	let stepIndex = 0;
	let executionId = "";

	try {
		// Create DB record for this execution
		const execution = await createSkillExecution({
			skillId: skill.id,
			orgId: ctx.orgId || undefined,
			userId: ctx.userId,
			triggerType: "manual",
			input: ctx.input,
			model: "claude-sonnet-4-5",
		});
		executionId = execution.id;

		// Assemble dynamic context if the skill provides a resolver
		const dynamicContext = skill.dynamicContext
			? await skill.dynamicContext(ctx)
			: undefined;

		// Build the 4-layer system prompt
		const system = buildSkillPrompt(skill, ctx, dynamicContext);

		// Resolve tool subset (inject browser action callback for real-time streaming)
		const tools = resolveTools(skill.tools, {
			onBrowserAction: callbacks.onBrowserAction,
		});

		// Build invocation message
		const userMessage = buildInvocationMessage(skill, ctx.input);

		const result = streamText({
			model: myProvider.languageModel("chat-model"),
			system,
			messages: [{ role: "user", content: userMessage }],
			tools,
			stopWhen: stepCountIs(skill.constraints.maxSteps),
			onStepFinish: async (event) => {
				stepIndex++;
				const stepTimestamp = new Date().toISOString();

				// Capture tool calls
				if (event.toolCalls && event.toolCalls.length > 0) {
					for (const toolCall of event.toolCalls) {
						const toolResult = event.toolResults?.find(
							(r) => r.toolCallId === toolCall.toolCallId,
						);

						const step: SkillStep = {
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
					const step: SkillStep = {
						index: stepIndex,
						type: "text",
						content: event.text,
						timestamp: stepTimestamp,
					};

					steps.push(step);
					callbacks.onStep(step);
				}

				// Update DB with current steps (non-blocking)
				updateSkillExecution({
					id: executionId,
					steps: [...steps],
				}).catch((err) =>
					console.warn("[skill-runner] Failed to update steps:", err),
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
					await updateSkillExecution({
						id: executionId,
						status: "completed",
						steps,
						output: {
							summary:
								steps
									.filter((s) => s.type === "text")
									.map((s) => s.content)
									.pop() || "Skill execution completed.",
						},
						tokensUsed: usageData,
						durationMs,
					});
				} catch (err) {
					console.warn("[skill-runner] Failed to finalise execution:", err);
				}

				callbacks.onComplete({
					status: "completed",
					summary:
						steps
							.filter((s) => s.type === "text")
							.map((s) => s.content)
							.pop() || "Skill execution completed.",
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
			updateSkillExecution({
				id: executionId,
				status: "failed",
				steps,
				durationMs: Date.now() - startTime,
				output: {
					error: error instanceof Error ? error.message : String(error),
				},
			}).catch((err) =>
				console.warn("[skill-runner] Failed to record failure:", err),
			);
		}

		callbacks.onError(
			error instanceof Error ? error : new Error(String(error)),
		);
	}
}
