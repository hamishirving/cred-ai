import { connection, NextResponse } from "next/server";
import { getAllAgentExecutions } from "@/lib/db/queries";

export async function GET(request: Request) {
	await connection();
	try {
		const url = new URL(request.url);
		const page = parseInt(url.searchParams.get("page") || "1", 10);
		const limit = parseInt(url.searchParams.get("limit") || "10", 10);
		const offset = (page - 1) * limit;

		const { executions, total } = await getAllAgentExecutions({
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
		console.error("Failed to fetch all agent executions:", error);
		return NextResponse.json(
			{ error: "Failed to fetch executions" },
			{ status: 500 },
		);
	}
}
