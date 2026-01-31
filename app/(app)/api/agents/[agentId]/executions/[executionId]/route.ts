import { NextResponse } from "next/server";
import { getAgentExecution, updateAgentExecution } from "@/lib/db/queries";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ agentId: string; executionId: string }> },
) {
	const { executionId } = await params;

	try {
		const execution = await getAgentExecution({ id: executionId });
		if (!execution) {
			return NextResponse.json(
				{ error: "Execution not found" },
				{ status: 404 },
			);
		}
		return NextResponse.json({ execution });
	} catch (error) {
		console.error("Failed to fetch execution:", error);
		return NextResponse.json(
			{ error: "Failed to fetch execution" },
			{ status: 500 },
		);
	}
}

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ agentId: string; executionId: string }> },
) {
	const { executionId } = await params;

	try {
		const body = await request.json();

		const execution = await getAgentExecution({ id: executionId });
		if (!execution) {
			return NextResponse.json(
				{ error: "Execution not found" },
				{ status: 404 },
			);
		}

		await updateAgentExecution({
			id: executionId,
			status: body.status,
			output: body.status === "failed"
				? { error: "Execution stopped by user" }
				: undefined,
			durationMs: execution.durationMs ?? Math.round(
				(Date.now() - new Date(execution.startedAt).getTime()),
			),
		});

		const updated = await getAgentExecution({ id: executionId });
		return NextResponse.json({ execution: updated });
	} catch (error) {
		console.error("Failed to update execution:", error);
		return NextResponse.json(
			{ error: "Failed to update execution" },
			{ status: 500 },
		);
	}
}
