import { tool } from "ai";
import { z } from "zod";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { createTask } from "@/lib/db/queries";
import { mockAdmins } from "@/lib/data/mock-admins";

/**
 * Look up admin by first name (case-insensitive).
 */
function getAdminByFirstName(firstName: string) {
	return mockAdmins.find(
		(admin) => admin.firstName.toLowerCase() === firstName.toLowerCase(),
	);
}

/**
 * Tool for creating tasks assigned to team members.
 *
 * Used when users want to assign work to colleagues via @ mentions.
 * Example: "Create a task for @Sarah to chase Marcus's DBS by Friday"
 */
export const createTaskTool = tool({
	description: `Create a task for a team member. Use this when the user wants to assign work to someone.

When to use:
- User asks to "create a task for @Someone"
- User wants to assign follow-up work to a colleague
- User mentions someone with @ and describes work to be done
- User says "@me" to assign a task to themselves

Extract the assignee's first name from the @ mention (e.g., "@Sarah" → "Sarah", "@me" → "me"). The special value "me" assigns the task to the current user. Parse natural language dates like "Friday", "next week", "tomorrow" into actual dates.`,

	inputSchema: z.object({
		title: z
			.string()
			.describe("Short, actionable task title (e.g., 'Chase Marcus DBS')"),
		description: z
			.string()
			.optional()
			.describe("Detailed description of what needs to be done"),
		assigneeFirstName: z
			.string()
			.describe(
				"First name of the person to assign this task to (from @ mention, e.g., 'Sarah')",
			),
		priority: z
			.enum(["low", "medium", "high", "urgent"])
			.optional()
			.default("medium")
			.describe("Task priority level"),
		category: z
			.enum([
				"chase_candidate",
				"review_document",
				"follow_up",
				"escalation",
				"expiry",
				"general",
			])
			.optional()
			.default("general")
			.describe("Category of task"),
		dueAt: z
			.string()
			.optional()
			.describe(
				"Due date as ISO string. Parse natural language like 'Friday' or 'next week' into actual dates.",
			),
		subjectType: z
			.enum(["profile", "placement", "evidence", "escalation"])
			.optional()
			.describe("Type of entity this task relates to"),
		subjectId: z
			.string()
			.optional()
			.describe("ID of the related entity (profile, placement, etc.)"),
	}),

	execute: async ({
		title,
		description,
		assigneeFirstName,
		priority,
		category,
		dueAt,
		subjectType,
		subjectId,
	}) => {
		console.log("[createTask] Creating task:", { title, assigneeFirstName });

		try {
			// Handle "me" - resolve to current user
			let assignee: {
				id: string;
				firstName: string;
				lastName: string;
				initials: string;
				role: string;
			} | null = null;

			if (assigneeFirstName.toLowerCase() === "me") {
				const session = await auth();
				if (!session?.user) {
					return { error: "Could not identify current user for self-assignment." };
				}
				const { firstName, lastName } = session.user;
				assignee = {
					id: session.user.id,
					firstName,
					lastName,
					initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
					role: session.user.roleName ?? "Team Member",
				};
			} else {
				// Look up assignee by first name from mock admins
				assignee = getAdminByFirstName(assigneeFirstName) ?? null;
			}

			if (!assignee) {
				return {
					error: `Could not find team member named "${assigneeFirstName}". Available team members: ${mockAdmins.map((a) => a.firstName).join(", ")}.`,
				};
			}

			// Parse due date if provided
			let parsedDueAt: Date | undefined;
			if (dueAt) {
				parsedDueAt = new Date(dueAt);
				if (Number.isNaN(parsedDueAt.getTime())) {
					parsedDueAt = undefined;
				}
			}

			// Get org ID from cookie (set by org-context)
			const cookieStore = await cookies();
			const organisationId = cookieStore.get("selectedOrgId")?.value;
			if (!organisationId) {
				return {
					error: "No organisation selected. Please select an organisation first.",
				};
			}

			// Create the task
			const task = await createTask({
				title,
				description,
				assigneeId: assignee.id,
				priority: priority ?? "medium",
				category: category ?? "general",
				dueAt: parsedDueAt,
				subjectType,
				subjectId,
				organisationId,
			});

			return {
				data: {
					id: task.id,
					title: task.title,
					description: task.description,
					priority: task.priority,
					category: task.category,
					status: task.status,
					dueAt: task.dueAt?.toISOString(),
					assignee: {
						id: assignee.id,
						name: `${assignee.firstName} ${assignee.lastName}`,
						initials: assignee.initials,
						role: assignee.role,
					},
					subjectType: task.subjectType,
					subjectId: task.subjectId,
					createdAt: task.createdAt.toISOString(),
				},
				message: `Task "${title}" created and assigned to ${assignee.firstName} ${assignee.lastName}.`,
			};
		} catch (error) {
			console.error("[createTask] Error:", error);
			return { error: "Failed to create task. Please try again." };
		}
	},
});
