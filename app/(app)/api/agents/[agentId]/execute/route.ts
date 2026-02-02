/**
 * Agent Execution API Route
 *
 * POST /api/agents/[agentId]/execute
 *
 * Loads an agent definition, validates input, runs the agent,
 * and streams steps back to the client via SSE.
 */

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";
import { getAgentDefinition } from "@/lib/ai/agents/registry";
import { executeAgent } from "@/lib/ai/agents/runner";
import { getOrganisationById } from "@/lib/db/queries";
import type { AgentStep } from "@/lib/ai/agents/types";

export const maxDuration = 60;

export async function POST(
	request: Request,
	props: { params: Promise<{ agentId: string }> },
) {
	const params = await props.params;
	const { agentId } = params;

	// 1. Auth
	const session = await auth();
	if (!session?.user) {
		return new ChatSDKError("unauthorized:chat").toResponse();
	}

	// 2. Load agent
	const agent = getAgentDefinition(agentId);
	if (!agent) {
		return Response.json(
			{ error: `Agent "${agentId}" not found` },
			{ status: 404 },
		);
	}

	// 3. Parse and validate input
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return new ChatSDKError("bad_request:api").toResponse();
	}

	const parsed = agent.inputSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: "Invalid input", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	// 4. Load org context
	const cookieStore = await cookies();
	const orgId =
		cookieStore.get("selectedOrgId")?.value || session.user.currentOrgId || "";
	const org = orgId ? await getOrganisationById({ id: orgId }) : null;
	const orgPrompt = org?.settings?.aiCompanion?.orgPrompt;

	// 5. Create SSE stream
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			function sendEvent(event: string, data: unknown) {
				const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(encoder.encode(payload));
			}

			// Signal execution started (executionId will be sent once the runner creates it)
			sendEvent("agent-status", { status: "running", agentId: agent.id });

			try {
				await executeAgent(
					agent,
					{
						input: parsed.data,
						orgId,
						orgPrompt,
						userId: session.user.id,
					},
					{
						onExecutionCreated: (executionId: string) => {
							sendEvent("agent-execution-id", { executionId });
						},
						onStep: (step: AgentStep) => {
							sendEvent("agent-step", step);
						},
						onLiveView: (url: string) => {
							sendEvent("agent-liveview", { url });
						},
						onBrowserAction: (action) => {
							sendEvent("agent-browser-action", action);
						},
						onComplete: (result) => {
							sendEvent("agent-result", result);
							sendEvent("agent-status", {
								status: result.status,
								agentId: agent.id,
							});
							controller.close();
						},
						onError: (error) => {
							sendEvent("agent-status", {
								status: "failed",
								error: error.message,
							});
							sendEvent("agent-result", {
								status: "failed",
								summary: error.message,
								steps: [],
								usage: {
									inputTokens: 0,
									outputTokens: 0,
									totalTokens: 0,
								},
								durationMs: 0,
							});
							controller.close();
						},
					},
				);
			} catch (error) {
				sendEvent("agent-status", {
					status: "failed",
					error:
						error instanceof Error ? error.message : "Unknown error occurred",
				});
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
