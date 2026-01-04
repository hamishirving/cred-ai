import { NextRequest, NextResponse } from "next/server";
import {
	getCandidateContext,
	getOrganisationSettings,
	getRecentEmailActivities,
	logEmailActivity,
} from "@/lib/ai/agents/compliance-companion/queries";
import {
	complianceCompanionAgent,
	generateEmailContent,
} from "@/lib/ai/agents/compliance-companion";
import { createTaskFromInsight } from "@/lib/ai/channels";
import type { AgentContext, AgentInsight } from "@/lib/ai/agents/types";

/**
 * GET /api/candidates/[id]/communications
 *
 * Get communication history and preview for a candidate.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: profileId } = await params;
		const searchParams = request.nextUrl.searchParams;
		const organisationId = searchParams.get("organisationId");

		if (!organisationId) {
			return NextResponse.json(
				{ error: "organisationId is required" },
				{ status: 400 },
			);
		}

		// Get candidate context
		const candidate = await getCandidateContext(profileId, organisationId);
		if (!candidate) {
			return NextResponse.json(
				{ error: "Candidate not found" },
				{ status: 404 },
			);
		}

		// Get recent email activities
		const emailHistory = await getRecentEmailActivities(profileId, 20);

		// Get org settings
		const org = await getOrganisationSettings(organisationId);

		return NextResponse.json({
			candidate: {
				id: candidate.profileId,
				name: `${candidate.firstName} ${candidate.lastName}`,
				email: candidate.email,
				compliance: {
					completed: candidate.compliance.completed,
					total: candidate.compliance.total,
					percentage: candidate.compliance.percentage,
				},
			},
			history: emailHistory.map((activity) => ({
				id: activity.id,
				type: "email",
				direction: "outbound",
				subject: (activity.details as Record<string, unknown>)?.subject as string || "Compliance Update",
				preview: activity.summary || "",
				status: (activity.details as Record<string, unknown>)?.status === "sent" ? "sent" : "preview",
				createdAt: activity.createdAt.toISOString(),
				actor: "ai",
				reasoning: activity.aiReasoning,
			})),
			orgSettings: org?.settings,
		});
	} catch (error) {
		console.error("Failed to fetch communications:", error);
		return NextResponse.json(
			{ error: "Failed to fetch communications" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/candidates/[id]/communications
 *
 * Generate a new email preview for a candidate.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: profileId } = await params;
		const body = await request.json();
		const { organisationId } = body;

		if (!organisationId) {
			return NextResponse.json(
				{ error: "organisationId is required" },
				{ status: 400 },
			);
		}

		// Get candidate context
		const candidate = await getCandidateContext(profileId, organisationId);
		if (!candidate) {
			return NextResponse.json(
				{ error: "Candidate not found" },
				{ status: 404 },
			);
		}

		// Get org settings
		const org = await getOrganisationSettings(organisationId);
		if (!org) {
			return NextResponse.json(
				{ error: "Organisation not found" },
				{ status: 404 },
			);
		}

		// Build agent context
		const agentContext: AgentContext = {
			organisationId,
			orgSettings: org.settings,
			candidates: [candidate],
			runDate: new Date(),
		};

		// Run the agent to produce an insight
		const insights = await complianceCompanionAgent.run(agentContext);

		if (insights.length === 0) {
			return NextResponse.json({
				message: "No insight generated - candidate may be fully compliant with no recent activity needed",
				candidate: {
					id: candidate.profileId,
					name: `${candidate.firstName} ${candidate.lastName}`,
					compliance: candidate.compliance,
				},
			});
		}

		const insight = insights[0];

		// Generate email content
		const emailContent = await generateEmailContent(
			insight,
			org.settings.orgPrompt,
		);

		// Log the preview
		await logEmailActivity({
			organisationId,
			profileId,
			subject: emailContent.subject,
			body: emailContent.body,
			reasoning: emailContent.reasoning,
			status: "preview",
		});

		// Create task for compliance manager if high/urgent priority
		let taskCreated = null;
		if (insight.priority === "high" || insight.priority === "urgent") {
			const taskResult = await createTaskFromInsight(insight, {
				organisationId,
				orgName: org.name,
				orgPrompt: org.settings.orgPrompt,
				complianceContact: org.settings.complianceContact,
			});
			if (taskResult?.status === "delivered") {
				taskCreated = taskResult.data?.taskId;
			}
		}

		return NextResponse.json({
			insight: {
				id: insight.id,
				priority: insight.priority,
				category: insight.category,
				summary: insight.summary,
			},
			email: {
				to: candidate.email,
				cc: org.settings.complianceContact?.email,
				subject: emailContent.subject,
				body: emailContent.body,
			},
			task: taskCreated ? { id: taskCreated } : null,
			context: {
				candidate: {
					name: `${candidate.firstName} ${candidate.lastName}`,
					email: candidate.email,
					daysInOnboarding: candidate.daysInOnboarding,
				},
				compliance: {
					completed: candidate.compliance.completed,
					total: candidate.compliance.total,
					percentage: candidate.compliance.percentage,
					blockedByCandidate: (insight.details as Record<string, unknown>).blockedByCandidate,
					blockedByAdmin: (insight.details as Record<string, unknown>).blockedByAdmin,
					blockedByThirdParty: (insight.details as Record<string, unknown>).blockedByThirdParty,
				},
				reasoning: emailContent.reasoning,
			},
		});
	} catch (error) {
		console.error("Failed to generate email:", error);
		return NextResponse.json(
			{ error: "Failed to generate email" },
			{ status: 500 },
		);
	}
}
