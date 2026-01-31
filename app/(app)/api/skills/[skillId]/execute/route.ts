/**
 * Skill Execution API Route
 *
 * POST /api/skills/[skillId]/execute
 *
 * Loads a skill definition, validates input, runs the skill agent,
 * and streams steps back to the client via SSE.
 */

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";
import { getSkillDefinition } from "@/lib/ai/skills/registry";
import { executeSkill } from "@/lib/ai/skills/runner";
import { getOrganisationById } from "@/lib/db/queries";
import type { SkillStep } from "@/lib/ai/skills/types";

export const maxDuration = 60;

export async function POST(
	request: Request,
	props: { params: Promise<{ skillId: string }> },
) {
	const params = await props.params;
	const { skillId } = params;

	// 1. Auth
	const session = await auth();
	if (!session?.user) {
		return new ChatSDKError("unauthorized:chat").toResponse();
	}

	// 2. Load skill
	const skill = getSkillDefinition(skillId);
	if (!skill) {
		return Response.json(
			{ error: `Skill "${skillId}" not found` },
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

	const parsed = skill.inputSchema.safeParse(body);
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

			// Signal execution started
			sendEvent("skill-status", { status: "running", skillId: skill.id });

			try {
				await executeSkill(
					skill,
					{
						input: parsed.data,
						orgId,
						orgPrompt,
						userId: session.user.id,
					},
					{
						onStep: (step: SkillStep) => {
							sendEvent("skill-step", step);
						},
						onLiveView: (url: string) => {
							sendEvent("skill-liveview", { url });
						},
						onBrowserAction: (action) => {
							sendEvent("skill-browser-action", action);
						},
						onComplete: (result) => {
							sendEvent("skill-result", result);
							sendEvent("skill-status", {
								status: result.status,
								skillId: skill.id,
							});
							controller.close();
						},
						onError: (error) => {
							sendEvent("skill-status", {
								status: "failed",
								error: error.message,
							});
							sendEvent("skill-result", {
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
				sendEvent("skill-status", {
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
