/**
 * Task Channel Implementation
 *
 * Creates in-app tasks from agent insights for internal staff
 * (compliance managers, recruiters, admins).
 *
 * @see docs/PRD-AI-AGENTS.md#tasks-system
 */

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { tasks } from "@/lib/db/schema";
import type {
	Channel,
	ChannelDeliveryResult,
	DeliverOptions,
	FormatOptions,
	FormattedTaskContent,
} from "../types";
import type { AgentInsight, AudienceInsight, AudienceType } from "../../agents/types";

// Database connection
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

/**
 * Task Channel - creates in-app tasks for staff
 */
export const taskChannel: Channel = {
	type: "task",
	name: "In-App Task",
	description: "Creates actionable tasks for internal staff in the application",

	/**
	 * Tasks are for internal staff, not candidates
	 */
	supportsAudience(audience: AudienceType): boolean {
		return ["compliance_manager", "recruiter", "admin"].includes(audience);
	},

	/**
	 * Format an insight into a task
	 */
	async format(
		insight: AgentInsight,
		audience: AudienceInsight,
		options: FormatOptions,
	): Promise<FormattedTaskContent> {
		const details = insight.details as Record<string, unknown>;

		// Build task title based on category
		const title = buildTaskTitle(insight, details);

		// Build task description
		const description = buildTaskDescription(insight, details, options);

		// Determine due date
		const dueAt = determineDueDate(insight, details);

		return {
			type: "task",
			organisationId: options.organisationId,
			assigneeId: audience.recipientId,
			assigneeRole: audience.recipientId ? undefined : audience.audienceType,
			subjectType: insight.subjectType,
			subjectId: insight.subjectId,
			title,
			description,
			priority: insight.priority,
			dueAt,
			agentId: insight.agentId,
			insightId: insight.id,
		};
	},

	/**
	 * Create the task in the database
	 */
	async deliver(
		content: FormattedTaskContent,
		options: DeliverOptions,
	): Promise<ChannelDeliveryResult> {
		if (options.preview) {
			return {
				status: "preview",
				content,
			};
		}

		try {
			const [task] = await db
				.insert(tasks)
				.values({
					organisationId: content.organisationId,
					assigneeId: content.assigneeId,
					assigneeRole: content.assigneeRole,
					subjectType: content.subjectType as "profile" | "placement" | "evidence" | "escalation",
					subjectId: content.subjectId,
					title: content.title,
					description: content.description,
					priority: content.priority,
					category: determineTaskCategory(content),
					source: "ai_agent",
					agentId: content.agentId,
					insightId: content.insightId,
					status: "pending",
					dueAt: content.dueAt,
				})
				.returning();

			return {
				status: "delivered",
				content,
				data: {
					taskId: task.id,
				},
			};
		} catch (error) {
			console.error("Failed to create task:", error);
			return {
				status: "failed",
				content,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	},
};

// ============================================
// Helper Functions
// ============================================

/**
 * Build a concise, actionable task title
 */
function buildTaskTitle(
	insight: AgentInsight,
	details: Record<string, unknown>,
): string {
	const candidateName = details.candidateName as string || "Candidate";
	const firstName = candidateName.split(" ")[0];

	switch (insight.category) {
		case "action_required":
			if ((details.blockedByCandidate as string[])?.length > 0) {
				return `Chase ${firstName} - ${(details.blockedByCandidate as string[])[0]} needed`;
			}
			return `Follow up with ${firstName}`;

		case "blocker":
			if ((details.blockedByAdmin as string[])?.length > 0) {
				return `Review ${firstName}'s ${(details.blockedByAdmin as string[])[0]}`;
			}
			return `Unblock ${firstName}'s onboarding`;

		case "expiry":
			return `${firstName} - document expiring soon`;

		case "celebration":
			return `${firstName} is now fully compliant`;

		case "progress":
		default:
			return `Check in on ${firstName}'s progress`;
	}
}

/**
 * Build a detailed task description with context
 */
function buildTaskDescription(
	insight: AgentInsight,
	details: Record<string, unknown>,
	options: FormatOptions,
): string {
	const lines: string[] = [];

	// Candidate info
	const candidateName = details.candidateName as string;
	const percentage = details.percentage as number;
	lines.push(`**Candidate:** ${candidateName}`);
	lines.push(`**Progress:** ${percentage}% complete (${details.completedItems}/${details.totalItems} items)`);

	// Priority context
	if (insight.priority === "urgent") {
		const startDate = details.startDate as string;
		if (startDate) {
			lines.push(`**Start Date:** ${new Date(startDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`);
		}
		lines.push("");
		lines.push("⚠️ **Urgent:** This candidate has an imminent start date.");
	}

	lines.push("");

	// Blocking items
	const blockedByCandidate = details.blockedByCandidate as string[] || [];
	const blockedByAdmin = details.blockedByAdmin as string[] || [];
	const blockedByThirdParty = details.blockedByThirdParty as string[] || [];

	if (blockedByCandidate.length > 0) {
		lines.push("**Waiting on candidate:**");
		blockedByCandidate.forEach((item) => lines.push(`• ${item}`));
		lines.push("");
	}

	if (blockedByAdmin.length > 0) {
		lines.push("**Needs your review:**");
		blockedByAdmin.forEach((item) => lines.push(`• ${item}`));
		lines.push("");
	}

	if (blockedByThirdParty.length > 0) {
		lines.push("**With external providers:**");
		blockedByThirdParty.forEach((item) => lines.push(`• ${item}`));
		lines.push("");
	}

	// Suggested action
	lines.push("**Suggested action:**");
	if (blockedByCandidate.length > 0) {
		lines.push(`Contact ${candidateName?.split(" ")[0]} to chase outstanding items.`);
	} else if (blockedByAdmin.length > 0) {
		lines.push(`Review and approve pending documents.`);
	} else if (blockedByThirdParty.length > 0) {
		lines.push(`Check status with external provider and follow up if needed.`);
	} else {
		lines.push(`Review candidate status and take appropriate action.`);
	}

	return lines.join("\n");
}

/**
 * Determine task due date based on insight priority and start date
 */
function determineDueDate(
	insight: AgentInsight,
	details: Record<string, unknown>,
): Date | undefined {
	const startDate = details.startDate as string | undefined;

	if (insight.priority === "urgent") {
		// Due today for urgent
		return new Date();
	}

	if (insight.priority === "high") {
		// Due in 2 days for high priority
		const due = new Date();
		due.setDate(due.getDate() + 2);
		return due;
	}

	if (startDate) {
		// Due 3 days before start date
		const start = new Date(startDate);
		start.setDate(start.getDate() - 3);
		if (start > new Date()) {
			return start;
		}
	}

	// Default: due in 5 days for medium/low
	const due = new Date();
	due.setDate(due.getDate() + 5);
	return due;
}

/**
 * Determine task category based on content
 */
function determineTaskCategory(
	content: FormattedTaskContent,
): "chase_candidate" | "review_document" | "follow_up" | "escalation" | "expiry" | "general" {
	const title = content.title.toLowerCase();

	if (title.includes("chase") || title.includes("contact")) {
		return "chase_candidate";
	}
	if (title.includes("review") || title.includes("approve")) {
		return "review_document";
	}
	if (title.includes("expir")) {
		return "expiry";
	}
	if (title.includes("follow up") || title.includes("check")) {
		return "follow_up";
	}

	return "general";
}

export default taskChannel;
