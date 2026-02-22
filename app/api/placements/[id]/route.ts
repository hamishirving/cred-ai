import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { tasks } from "@/lib/db/schema";
import { getPlacementById, getProfileTimeline, updatePlacementStatus } from "@/lib/db/queries";
import {
	checkPlacementCompliance,
	resolvePlacementRequirements,
	type PlacementContext,
} from "@/lib/compliance/resolve-requirements";

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

const VALID_STATUSES = [
	"pending",
	"onboarding",
	"compliance",
	"ready",
	"active",
	"completed",
	"cancelled",
];

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ id: string }> },
) {
	try {
		const params = await props.params;
		const placement = await getPlacementById({ id: params.id });

		if (!placement) {
			return NextResponse.json(
				{ error: "Placement not found" },
				{ status: 404 },
			);
		}

		// Build placement context for compliance resolution
		const context: PlacementContext = {
			roleSlug: placement.roleSlug,
			jurisdiction: placement.jurisdiction || "florida",
			facilityType: placement.facilityType,
			isLapseDeal: placement.dealType === "lapse",
		};

		// Resolve requirements and check compliance
		const priorityOrder = sql`CASE ${tasks.priority}
			WHEN 'urgent' THEN 1
			WHEN 'high' THEN 2
			WHEN 'medium' THEN 3
			WHEN 'low' THEN 4
			ELSE 5
		END`;

		const [groups, compliance, timeline, placementTasks] = await Promise.all([
			resolvePlacementRequirements(placement.organisationId, context),
			checkPlacementCompliance(
				placement.organisationId,
				placement.profileId,
				context,
			),
			getProfileTimeline({ profileId: placement.profileId, days: 7 }),
			db.select()
				.from(tasks)
				.where(and(
					eq(tasks.subjectType, "placement"),
					eq(tasks.subjectId, params.id),
				))
				.orderBy(priorityOrder, desc(tasks.createdAt)),
		]);

		return NextResponse.json({
			placement,
			context,
			requirementGroups: groups,
			compliance,
			timeline,
			tasks: placementTasks,
		});
	} catch (error) {
		console.error("Failed to fetch placement:", error);
		return NextResponse.json(
			{ error: "Failed to fetch placement" },
			{ status: 500 },
		);
	}
}

export async function PATCH(
	request: NextRequest,
	props: { params: Promise<{ id: string }> },
) {
	try {
		const params = await props.params;
		const body = await request.json();
		const { status } = body;

		if (!status || !VALID_STATUSES.includes(status)) {
			return NextResponse.json(
				{ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
				{ status: 400 },
			);
		}

		const result = await updatePlacementStatus({ id: params.id, status });

		if (!result) {
			return NextResponse.json(
				{ error: "Placement not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ placement: result });
	} catch (error) {
		console.error("Failed to update placement:", error);
		return NextResponse.json(
			{ error: "Failed to update placement" },
			{ status: 500 },
		);
	}
}
