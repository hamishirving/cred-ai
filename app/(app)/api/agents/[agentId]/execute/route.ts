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
import { getOrganisationById, getSampleCandidate } from "@/lib/db/queries";
import type { AgentStep } from "@/lib/ai/agents/types";

export const maxDuration = 120; // Increased to handle longer-running agents like DVLA

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

	// 3. Resolve org context early for input defaults
	const cookieStore = await cookies();
	const orgId =
		cookieStore.get("selectedOrgId")?.value || session.user.currentOrgId || "";

	// 4. Parse and validate input
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return new ChatSDKError("bad_request:api").toResponse();
	}

	const normalizedInput = { ...body };
	if (
		orgId &&
		(normalizedInput.organisationId == null ||
			String(normalizedInput.organisationId).trim() === "")
	) {
		normalizedInput.organisationId = orgId;
	}

	if (
		agent.id === "verify-bls-certificate" &&
		orgId &&
		(normalizedInput.profileId == null ||
			String(normalizedInput.profileId).trim() === "")
	) {
		const sampleCandidate = await getSampleCandidate({ organisationId: orgId });
		if (sampleCandidate?.profileId) {
			normalizedInput.profileId = sampleCandidate.profileId;
		}
	}

	const parsed = agent.inputSchema.safeParse(normalizedInput);
	if (!parsed.success) {
		return Response.json(
			{ error: "Invalid input", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	// 5. Load org prompt context
	const org = orgId ? await getOrganisationById({ id: orgId }) : null;
	const orgPrompt = org?.settings?.aiCompanion?.orgPrompt;

	// 6. Create SSE stream
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			let closed = false;

			function sendEvent(event: string, data: unknown) {
				if (closed) return;
				try {
					const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
					controller.enqueue(encoder.encode(payload));
				} catch {
					// Client disconnected — stop sending
					closed = true;
				}
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
							// Don't close here — structured output steps may follow
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
						},
					},
				);
			} catch (error) {
				sendEvent("agent-status", {
					status: "failed",
					error:
						error instanceof Error ? error.message : "Unknown error occurred",
				});
			} finally {
				// Close stream after executeAgent fully completes (including structured output)
				if (!closed) {
					try {
						controller.close();
					} catch {
						// Already closed by client disconnect
					}
				}
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
