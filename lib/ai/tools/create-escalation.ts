/**
 * Create Escalation Tool
 *
 * Creates an escalation with structured options for human decision-making.
 * Used when AI detects an anomaly that requires human input (e.g. negative dilute).
 */

import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { escalations, escalationOptions, complianceElements } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const createEscalation = tool({
	description: `Create an escalation requiring human decision. Use when the AI detects
an anomaly or exception that needs human input — e.g. a negative dilute drug screen result,
a verification discrepancy, or a policy decision.

Provide a clear question, AI reasoning, recommendation, and structured options for the human.
Each option should have a label, description, and whether it's the recommended action.`,

	inputSchema: z.object({
		organisationId: z.string().describe("Organisation UUID"),
		profileId: z.string().describe("Candidate profile UUID"),
		complianceElementSlug: z.string().optional().describe("Compliance element slug (e.g. drug-screen)"),
		escalationType: z.enum([
			"low_confidence",
			"approval_required",
			"exception_request",
			"discrepancy",
			"verification_failed",
			"candidate_request",
		]),
		priority: z.enum(["low", "medium", "high", "critical"]),
		question: z.string().describe("What the AI is asking the human to decide"),
		aiReasoning: z.string().describe("AI's reasoning for escalating"),
		aiRecommendation: z.string().describe("AI's recommended course of action"),
		context: z.record(z.unknown()).optional().describe("Additional context data"),
		options: z.array(z.object({
			label: z.string().describe("Option label (e.g. Order Recollection)"),
			description: z.string().describe("What this option does"),
			isRecommended: z.boolean().default(false),
			action: z.object({
				type: z.enum(["approve", "reject", "request_info", "waive", "escalate", "custom"]),
				config: z.record(z.unknown()).optional(),
			}),
		})),
	}),

	execute: async (input) => {
		try {
			// Look up compliance element ID from slug if provided
			let complianceElementId: string | undefined;
			if (input.complianceElementSlug) {
				const [element] = await db
					.select({ id: complianceElements.id })
					.from(complianceElements)
					.where(
						and(
							eq(complianceElements.slug, input.complianceElementSlug),
							eq(complianceElements.organisationId, input.organisationId),
						),
					)
					.limit(1);
				complianceElementId = element?.id;
			}

			// Insert escalation
			const [escalation] = await db
				.insert(escalations)
				.values({
					organisationId: input.organisationId,
					profileId: input.profileId,
					complianceElementId: complianceElementId ?? null,
					escalationType: input.escalationType,
					priority: input.priority,
					question: input.question,
					aiReasoning: input.aiReasoning,
					aiRecommendation: input.aiRecommendation,
					context: input.context,
				})
				.returning();

			// Insert options
			const optionRows = await db
				.insert(escalationOptions)
				.values(
					input.options.map((opt, i) => ({
						escalationId: escalation.id,
						label: opt.label,
						description: opt.description,
						displayOrder: i,
						isRecommended: opt.isRecommended,
						action: opt.action,
					})),
				)
				.returning();

			return {
				data: {
					escalationId: escalation.id,
					status: escalation.status,
					priority: escalation.priority,
					question: escalation.question,
					aiReasoning: escalation.aiReasoning,
					aiRecommendation: escalation.aiRecommendation,
					options: optionRows.map((o) => ({
						id: o.id,
						label: o.label,
						description: o.description,
						isRecommended: o.isRecommended,
					})),
				},
			};
		} catch (error) {
			return {
				error: `Failed to create escalation: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
