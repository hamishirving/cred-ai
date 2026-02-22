import { NextRequest, NextResponse } from "next/server";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { tasks, profiles, placements, workNodes } from "@/lib/db/schema";

// Alias for the placement's candidate profile (avoids collision with direct profile join)
const placementProfiles = alias(profiles, "placement_profiles");

// Database connection
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

/**
 * GET /api/tasks
 * List tasks with filtering and pagination
 */
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const organisationId = searchParams.get("organisationId");
		const statusValues = searchParams.getAll("status"); // Support multiple status values
		const priority = searchParams.get("priority");
		const assigneeRole = searchParams.get("assigneeRole");
		const source = searchParams.get("source");
		const subjectType = searchParams.get("subjectType");
		const subjectId = searchParams.get("subjectId");
		const limit = parseInt(searchParams.get("limit") || "50", 10);
		const offset = parseInt(searchParams.get("offset") || "0", 10);

		if (!organisationId) {
			return NextResponse.json(
				{ error: "organisationId is required" },
				{ status: 400 },
			);
		}

		// Build where conditions
		const conditions = [eq(tasks.organisationId, organisationId)];

		if (statusValues.length > 0) {
			if (statusValues.includes("active")) {
				// Active = pending, in_progress, or snoozed
				conditions.push(inArray(tasks.status, ["pending", "in_progress", "snoozed"]));
			} else if (statusValues.length === 1) {
				conditions.push(eq(tasks.status, statusValues[0] as typeof tasks.status._.data));
			} else {
				conditions.push(inArray(tasks.status, statusValues as (typeof tasks.status._.data)[]));
			}
		}

		if (priority) {
			conditions.push(eq(tasks.priority, priority as typeof tasks.priority._.data));
		}

		if (assigneeRole) {
			conditions.push(eq(tasks.assigneeRole, assigneeRole));
		}

		if (source) {
			conditions.push(eq(tasks.source, source as typeof tasks.source._.data));
		}

		if (subjectType) {
			conditions.push(eq(tasks.subjectType, subjectType as typeof tasks.subjectType._.data));
		}

		if (subjectId) {
			conditions.push(eq(tasks.subjectId, subjectId));
		}

		// Query tasks with profile info and placement enrichment
		const taskList = await db
			.select({
				id: tasks.id,
				organisationId: tasks.organisationId,
				title: tasks.title,
				description: tasks.description,
				priority: tasks.priority,
				category: tasks.category,
				status: tasks.status,
				source: tasks.source,
				agentId: tasks.agentId,
				insightId: tasks.insightId,
				aiReasoning: tasks.aiReasoning,
				subjectType: tasks.subjectType,
				subjectId: tasks.subjectId,
				assigneeId: tasks.assigneeId,
				assigneeRole: tasks.assigneeRole,
				dueAt: tasks.dueAt,
				snoozedUntil: tasks.snoozedUntil,
				completedAt: tasks.completedAt,
				createdAt: tasks.createdAt,
				updatedAt: tasks.updatedAt,
				// Join profile for profile-subject info
				profileFirstName: profiles.firstName,
				profileLastName: profiles.lastName,
				profileEmail: profiles.email,
				// Join placement → profile + workNode for placement-subject info
				placementCandidateFirstName: placementProfiles.firstName,
				placementCandidateLastName: placementProfiles.lastName,
				placementFacilityName: workNodes.name,
			})
			.from(tasks)
			.leftJoin(
				profiles,
				and(
					eq(tasks.subjectType, "profile"),
					eq(tasks.subjectId, profiles.id),
				),
			)
			.leftJoin(
				placements,
				and(
					eq(tasks.subjectType, "placement"),
					eq(tasks.subjectId, placements.id),
				),
			)
			.leftJoin(
				placementProfiles,
				eq(placements.profileId, placementProfiles.id),
			)
			.leftJoin(
				workNodes,
				eq(placements.workNodeId, workNodes.id),
			)
			.where(and(...conditions))
			.orderBy(
				// Priority order: urgent > high > medium > low
				sql`CASE ${tasks.priority}
					WHEN 'urgent' THEN 1
					WHEN 'high' THEN 2
					WHEN 'medium' THEN 3
					WHEN 'low' THEN 4
					ELSE 5
				END`,
				desc(tasks.createdAt),
			)
			.limit(limit)
			.offset(offset);

		// Count total
		const [countResult] = await db
			.select({ count: sql<number>`count(*)` })
			.from(tasks)
			.where(and(...conditions));

		// Format response
		const formattedTasks = taskList.map((task) => {
			let subject: { type: string; id: string | null; name?: string; email?: string; facility?: string } | null = null;

			if (task.subjectType === "profile" && task.profileFirstName) {
				subject = {
					type: "profile",
					id: task.subjectId,
					name: `${task.profileFirstName} ${task.profileLastName}`,
					email: task.profileEmail ?? undefined,
				};
			} else if (task.subjectType === "placement" && task.placementCandidateFirstName) {
				subject = {
					type: "placement",
					id: task.subjectId,
					name: `${task.placementCandidateFirstName} ${task.placementCandidateLastName}`,
					facility: task.placementFacilityName ?? undefined,
				};
			} else if (task.subjectType) {
				subject = { type: task.subjectType, id: task.subjectId };
			}

			return {
				id: task.id,
				organisationId: task.organisationId,
				title: task.title,
				description: task.description,
				priority: task.priority,
				category: task.category,
				status: task.status,
				source: task.source,
				agentId: task.agentId,
				insightId: task.insightId,
				aiReasoning: task.aiReasoning,
				subjectType: task.subjectType,
				subjectId: task.subjectId,
				subject,
				assigneeId: task.assigneeId,
				assigneeRole: task.assigneeRole,
				dueAt: task.dueAt?.toISOString(),
				snoozedUntil: task.snoozedUntil?.toISOString(),
				completedAt: task.completedAt?.toISOString(),
				createdAt: task.createdAt.toISOString(),
				updatedAt: task.updatedAt.toISOString(),
			};
		});

		return NextResponse.json({
			tasks: formattedTasks,
			total: countResult?.count ?? 0,
			limit,
			offset,
		});
	} catch (error) {
		console.error("Failed to fetch tasks:", error);
		return NextResponse.json(
			{ error: "Failed to fetch tasks" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/tasks
 * Create a new task (manual or from agent)
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			organisationId,
			title,
			description,
			priority = "medium",
			category = "general",
			subjectType,
			subjectId,
			assigneeId,
			assigneeRole,
			source = "manual",
			agentId,
			insightId,
			dueAt,
		} = body;

		if (!organisationId || !title) {
			return NextResponse.json(
				{ error: "organisationId and title are required" },
				{ status: 400 },
			);
		}

		const [task] = await db
			.insert(tasks)
			.values({
				organisationId,
				title,
				description,
				priority,
				category,
				subjectType,
				subjectId,
				assigneeId,
				assigneeRole,
				source,
				agentId,
				insightId,
				status: "pending",
				dueAt: dueAt ? new Date(dueAt) : undefined,
			})
			.returning();

		return NextResponse.json({ task }, { status: 201 });
	} catch (error) {
		console.error("Failed to create task:", error);
		return NextResponse.json(
			{ error: "Failed to create task" },
			{ status: 500 },
		);
	}
}
