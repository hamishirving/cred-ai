import { NextResponse } from "next/server";
import { getAgentExecutionsByAgentId } from "@/lib/db/queries";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ agentId: string }> },
) {
	const { agentId } = await params;

	try {
		const executions = await getAgentExecutionsByAgentId({
			agentId,
			limit: 20,
		});

		return NextResponse.json({ executions });
	} catch (error) {
		console.error("Failed to fetch agent executions:", error);
		return NextResponse.json(
			{ error: "Failed to fetch executions" },
			{ status: 500 },
		);
	}
}
