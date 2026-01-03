import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { tasks, profiles } from "@/lib/db/schema";

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
				insightId: tasks.insightId,
				aiReasoning: tasks.aiReasoning,
				subjectType: tasks.subjectType,
				subjectId: tasks.subjectId,
				assigneeId: tasks.assigneeId,
				assigneeRole: tasks.assigneeRole,
				dueAt: tasks.dueAt,
				snoozedUntil: tasks.snoozedUntil,
				completedAt: tasks.completedAt,
				completedBy: tasks.completedBy,
				completionNotes: tasks.completionNotes,
				createdAt: tasks.createdAt,
				updatedAt: tasks.updatedAt,
				// Profile info
				profileFirstName: profiles.firstName,
				profileLastName: profiles.lastName,
				profileEmail: profiles.email,
			})
			.from(tasks)
			.leftJoin(
				profiles,
				and(
					eq(tasks.subjectType, "profile"),
					eq(tasks.subjectId, profiles.id),
				),
			)
			.where(eq(tasks.id, id))
			.limit(1);

		if (!task) {
			return NextResponse.json(
				{ error: "Task not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			task: {
				...task,
				subject: task.subjectType === "profile" && task.profileFirstName
					? {
							type: task.subjectType,
							id: task.subjectId,
							name: `${task.profileFirstName} ${task.profileLastName}`,
							email: task.profileEmail,
						}
					: task.subjectType
						? { type: task.subjectType, id: task.subjectId }
						: null,
				dueAt: task.dueAt?.toISOString(),
				snoozedUntil: task.snoozedUntil?.toISOString(),
				completedAt: task.completedAt?.toISOString(),
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
			return NextResponse.json(
				{ error: "Task not found" },
				{ status: 404 },
			);
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
			return NextResponse.json(
				{ error: "Task not found" },
				{ status: 404 },
			);
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
