/**
 * Agent Definition API Route
 *
 * PUT /api/agents/[agentId] — update an agent definition in DB.
 */

import { auth } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";
import { updateAgentDefinition, getAgentById } from "@/lib/db/queries";

export async function PUT(
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

	// 2. Check agent exists
	const existing = await getAgentById({ id: agentId });
	if (!existing) {
		return Response.json(
			{ error: `Agent "${agentId}" not found` },
			{ status: 404 },
		);
	}

	// 3. Parse body
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return new ChatSDKError("bad_request:api").toResponse();
	}

	// 4. Update
	const updated = await updateAgentDefinition({
		id: agentId,
		...(body.name !== undefined && { name: body.name as string }),
		...(body.description !== undefined && { description: body.description as string }),
		...(body.version !== undefined && { version: body.version as string }),
		...(body.systemPrompt !== undefined && { systemPrompt: body.systemPrompt as string }),
		...(body.tools !== undefined && { tools: body.tools as string[] }),
		...(body.constraints !== undefined && { constraints: body.constraints as { maxSteps: number; maxExecutionTime: number } }),
		...(body.trigger !== undefined && { trigger: body.trigger as { type: "manual" | "schedule" | "event"; cron?: string; timezone?: string; eventName?: string; description?: string } }),
		...(body.oversight !== undefined && { oversight: body.oversight as { mode: "auto" | "review-before" | "notify-after" } }),
		...(body.conditions !== undefined && { conditions: body.conditions as null }),
	});

	return Response.json(updated);
}
