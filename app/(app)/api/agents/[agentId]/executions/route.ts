import { NextResponse } from "next/server";
import {
	getAgentExecutionsByAgentId,
	getAgentExecutionsCursor,
} from "@/lib/db/queries";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ agentId: string }> },
) {
	const { agentId } = await params;

	try {
		const url = new URL(request.url);
		const endingBefore = url.searchParams.get("ending_before");

		// Cursor-based pagination (for infinite scroll sidebar)
		if (endingBefore !== null || !url.searchParams.has("page")) {
			const limit = parseInt(url.searchParams.get("limit") || "20", 10);
			const { executions, hasMore } = await getAgentExecutionsCursor({
				agentId,
				limit,
				endingBefore,
			});

			return NextResponse.json({ executions, hasMore });
		}

		// Offset-based pagination (for agent detail runs table)
		const page = parseInt(url.searchParams.get("page") || "1", 10);
		const limit = parseInt(url.searchParams.get("limit") || "10", 10);
		const offset = (page - 1) * limit;

		const { executions, total } = await getAgentExecutionsByAgentId({
			agentId,
			limit,
			offset,
		});

		return NextResponse.json({
			executions,
			total,
			page,
			pageCount: Math.ceil(total / limit),
		});
	} catch (error) {
		console.error("Failed to fetch agent executions:", error);
		return NextResponse.json(
			{ error: "Failed to fetch executions" },
			{ status: 500 },
		);
	}
}
