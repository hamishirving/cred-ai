import { type NextRequest, NextResponse, connection } from "next/server";
import { getAgentMetrics } from "@/lib/reports/agent-metrics";
import type { AgentMetricsRange } from "@/lib/reports/types";

const RANGE_DAYS: Record<AgentMetricsRange, number> = {
	"7d": 7,
	"30d": 30,
	"90d": 90,
};

function isValidDate(value: string | null): value is string {
	if (!value) return false;
	const parsed = new Date(value);
	return !Number.isNaN(parsed.getTime());
}

export async function GET(request: NextRequest) {
	await connection();
	try {
		const searchParams = request.nextUrl.searchParams;
		const organisationId = searchParams.get("organisationId");
		if (!organisationId) {
			return NextResponse.json(
				{ error: "organisationId is required" },
				{ status: 400 },
			);
		}

		const fromParam = searchParams.get("from");
		const toParam = searchParams.get("to");
		const rangeParam = (searchParams.get("range") ||
			"30d") as AgentMetricsRange;

		let from: Date;
		let to: Date;
		let label: string;

		if (fromParam || toParam) {
			if (!isValidDate(fromParam) || !isValidDate(toParam)) {
				return NextResponse.json(
					{ error: "Both from and to must be valid ISO dates when provided" },
					{ status: 400 },
				);
			}

			from = new Date(fromParam);
			to = new Date(toParam);
			if (from.getTime() >= to.getTime()) {
				return NextResponse.json(
					{ error: "from must be earlier than to" },
					{ status: 400 },
				);
			}
			label = "Custom range";
		} else {
			const days = RANGE_DAYS[rangeParam] ?? 30;
			to = new Date();
			from = new Date(to);
			from.setDate(to.getDate() - days);
			label = `Last ${days} days`;
		}

		const metrics = await getAgentMetrics({
			organisationId,
			from,
			to,
			label,
		});

		return NextResponse.json(metrics);
	} catch (error) {
		console.error("Failed to get agent metrics:", error);
		return NextResponse.json(
			{ error: "Failed to fetch agent metrics" },
			{ status: 500 },
		);
	}
}
