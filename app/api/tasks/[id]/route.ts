import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { type NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { placements, profiles, tasks, workNodes } from "@/lib/db/schema";

const placementProfiles = alias(profiles, "placement_profiles");

// Database connection
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

/**
 * GET /api/tasks/[id]
 * Get a single task by ID
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const [task] = await db
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
				executionId: tasks.executionId,
				insightId: tasks.insightId,
				aiReasoning: tasks.aiReasoning,
				complianceElementSlugs: tasks.complianceElementSlugs,
				subjectType: tasks.subjectType,
				subjectId: tasks.subjectId,
				assigneeId: tasks.assigneeId,
				assigneeRole: tasks.assigneeRole,
				scheduledFor: tasks.scheduledFor,
				dueAt: tasks.dueAt,
				snoozedUntil: tasks.snoozedUntil,
				completedAt: tasks.completedAt,
				completedBy: tasks.completedBy,
				completionNotes: tasks.completionNotes,
				createdAt: tasks.createdAt,
				updatedAt: tasks.updatedAt,
				// Profile subject info
				profileFirstName: profiles.firstName,
				profileLastName: profiles.lastName,
				profileEmail: profiles.email,
				// Placement subject info
				placementCandidateFirstName: placementProfiles.firstName,
				placementCandidateLastName: placementProfiles.lastName,
				placementFacilityName: workNodes.name,
			})
			.from(tasks)
			.leftJoin(
				profiles,
				and(eq(tasks.subjectType, "profile"), eq(tasks.subjectId, profiles.id)),
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
			.leftJoin(workNodes, eq(placements.workNodeId, workNodes.id))
			.where(eq(tasks.id, id))
			.limit(1);

		if (!task) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		let subject: {
			type: string;
			id: string | null;
			name?: string;
			email?: string;
			facility?: string;
		} | null = null;
		if (task.subjectType === "profile" && task.profileFirstName) {
			subject = {
				type: "profile",
				id: task.subjectId,
				name: `${task.profileFirstName} ${task.profileLastName}`,
				email: task.profileEmail ?? undefined,
			};
		} else if (
			task.subjectType === "placement" &&
			task.placementCandidateFirstName
		) {
			subject = {
				type: "placement",
				id: task.subjectId,
				name: `${task.placementCandidateFirstName} ${task.placementCandidateLastName}`,
				facility: task.placementFacilityName ?? undefined,
			};
		} else if (task.subjectType) {
			subject = { type: task.subjectType, id: task.subjectId };
		}

		return NextResponse.json({
			task: {
				...task,
				subject,
				dueAt: task.dueAt?.toISOString(),
				snoozedUntil: task.snoozedUntil?.toISOString(),
				completedAt: task.completedAt?.toISOString(),
				scheduledFor: task.scheduledFor?.toISOString() ?? null,
				createdAt: task.createdAt.toISOString(),
				updatedAt: task.updatedAt.toISOString(),
			},
		});
	} catch (error) {
		console.error("Failed to fetch task:", error);
		return NextResponse.json(
			{ error: "Failed to fetch task" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/tasks/[id]
 * Update a task (status, assignee, snooze, complete, etc.)
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();

		// Get current task
		const [currentTask] = await db
			.select()
			.from(tasks)
			.where(eq(tasks.id, id))
			.limit(1);

		if (!currentTask) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		// Build update object
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		};

		// Handle status changes
		if (body.status) {
			updateData.status = body.status;

			if (body.status === "completed") {
				updateData.completedAt = new Date();
				updateData.completedBy = body.completedBy;
				updateData.completionNotes = body.completionNotes;
			} else if (body.status === "dismissed") {
				updateData.completedAt = new Date();
				updateData.completedBy = body.completedBy;
				updateData.completionNotes = body.completionNotes || "Dismissed";
			} else if (body.status === "snoozed") {
				updateData.snoozedUntil = body.snoozedUntil
					? new Date(body.snoozedUntil)
					: new Date(Date.now() + 24 * 60 * 60 * 1000); // Default: 1 day
			} else if (body.status === "pending" || body.status === "in_progress") {
				// Unsnoozed or reactivated
				updateData.snoozedUntil = null;
			}
		}

		// Handle assignee changes
		if (body.assigneeId !== undefined) {
			updateData.assigneeId = body.assigneeId;
		}
		if (body.assigneeRole !== undefined) {
			updateData.assigneeRole = body.assigneeRole;
		}

		// Handle priority changes
		if (body.priority) {
			updateData.priority = body.priority;
		}

		// Handle due date changes
		if (body.dueAt !== undefined) {
			updateData.dueAt = body.dueAt ? new Date(body.dueAt) : null;
		}

		// Handle title/description/category changes
		if (body.title !== undefined) {
			updateData.title = body.title;
		}
		if (body.description !== undefined) {
			updateData.description = body.description;
		}
		if (body.category !== undefined) {
			updateData.category = body.category;
		}

		// Handle agent delegation fields
		if (body.agentId !== undefined) {
			updateData.agentId = body.agentId;
		}
		if (body.executionId !== undefined) {
			updateData.executionId = body.executionId;
		}
		if (body.scheduledFor !== undefined) {
			updateData.scheduledFor = body.scheduledFor
				? new Date(body.scheduledFor)
				: null;
		}

		// Update task
		const [updatedTask] = await db
			.update(tasks)
			.set(updateData)
			.where(eq(tasks.id, id))
			.returning();

		return NextResponse.json({ task: updatedTask });
	} catch (error) {
		console.error("Failed to update task:", error);
		return NextResponse.json(
			{ error: "Failed to update task" },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const [deletedTask] = await db
			.delete(tasks)
			.where(eq(tasks.id, id))
			.returning();

		if (!deletedTask) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to delete task:", error);
		return NextResponse.json(
			{ error: "Failed to delete task" },
			{ status: 500 },
		);
	}
}
