/**
 * Compliance Companion Agent
 *
 * The first AI agent implementation. Monitors candidate onboarding progress,
 * identifies blockers, and generates personalized guidance.
 *
 * Audiences: Candidates (email), Compliance Managers (tasks + notifications)
 *
 * @see docs/PRD-AI-AGENTS.md
 */

import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type {
	Agent,
	AgentContext,
	AgentInsight,
	AudienceInsight,
	CandidateContext,
} from "../types";
import {
	analyzeBlocking,
	analyzeMultipleBlockingItems,
} from "./blocking";
import {
	buildFullPrompt,
	determineInsightCategoryAndPriority,
	type EmailGenerationContext,
} from "./prompts";

// ============================================
// Agent Definition
// ============================================

export const complianceCompanionAgent: Agent = {
	id: "compliance-companion",
	name: "Compliance Companion",
	description:
		"Monitors candidate onboarding progress, identifies blockers, and generates personalized guidance for candidates and compliance managers.",

	triggers: [
		{
			type: "scheduled",
			config: { schedule: "0 9 * * *" }, // Daily at 9am
		},
		{
			type: "manual",
			config: {},
		},
	],

	audiences: ["candidate", "compliance_manager"],

	async run(context: AgentContext): Promise<AgentInsight[]> {
		const insights: AgentInsight[] = [];

		if (!context.candidates || context.candidates.length === 0) {
			return insights;
		}

		// Analyze each candidate
		for (const candidate of context.candidates) {
			const insight = await analyzeCandidate(candidate, context);
			if (insight) {
				insights.push(insight);
			}
		}

		return insights;
	},
};

// ============================================
// Candidate Analysis
// ============================================

/**
 * Analyze a single candidate and produce an insight if warranted.
 */
async function analyzeCandidate(
	candidate: CandidateContext,
	context: AgentContext,
): Promise<AgentInsight | null> {
	const { compliance } = candidate;

	// Skip fully compliant candidates (unless celebrating)
	if (compliance.percentage === 100 && candidate.daysSinceLastActivity > 30) {
		return null; // Don't bother them
	}

	// Build email generation context
	const emailContext: EmailGenerationContext = {
		candidate: {
			firstName: candidate.firstName,
			lastName: candidate.lastName,
			email: candidate.email,
			role: candidate.role?.name,
			startDate: candidate.placement?.startDate,
			daysInOnboarding: candidate.daysInOnboarding,
		},
		compliance: {
			completed: compliance.completed,
			total: compliance.total,
			percentage: compliance.percentage,
			blockedByCandidate: compliance.items.filter(
				(i) => i.blockedBy === "candidate",
			),
			blockedByAdmin: compliance.items.filter((i) => i.blockedBy === "admin"),
			blockedByThirdParty: compliance.items.filter(
				(i) => i.blockedBy === "third_party",
			),
		},
		org: {
			name: context.orgSettings.complianceContact?.name
				? context.orgSettings.complianceContact.name.split(" ")[0] + "'s Org"
				: "Organisation",
			complianceContact: context.orgSettings.complianceContact,
		},
		history: {
			daysSinceLastEmail: candidate.daysSinceLastActivity,
			emailCount: context.recentActivities?.filter(
				(a) => a.channel === "email",
			).length ?? 0,
		},
	};

	// Determine priority and category
	const { category, priority } = determineInsightCategoryAndPriority(emailContext);

	// Determine audiences
	const audiences: AudienceInsight[] = [];

	// Candidates get emails
	audiences.push({
		audienceType: "candidate",
		recipientId: candidate.profileId,
		channels: ["email"],
	});

	// Compliance managers get tasks for high/urgent priorities
	if (priority === "high" || priority === "urgent") {
		audiences.push({
			audienceType: "compliance_manager",
			channels: ["task", "notification"],
		});
	}

	// Build summary
	const summary = buildInsightSummary(candidate, emailContext);

	const insight: AgentInsight = {
		id: `insight_${candidate.profileId}_${Date.now()}`,
		agentId: "compliance-companion",
		subjectType: "profile",
		subjectId: candidate.profileId,
		audiences,
		priority,
		category,
		summary,
		details: {
			candidateName: `${candidate.firstName} ${candidate.lastName}`,
			candidateEmail: candidate.email,
			completedItems: compliance.completed,
			totalItems: compliance.total,
			percentage: compliance.percentage,
			blockedByCandidate: emailContext.compliance.blockedByCandidate.map(
				(i) => i.elementName,
			),
			blockedByAdmin: emailContext.compliance.blockedByAdmin.map(
				(i) => i.elementName,
			),
			blockedByThirdParty: emailContext.compliance.blockedByThirdParty.map(
				(i) => i.elementName,
			),
			startDate: candidate.placement?.startDate?.toISOString(),
			daysInOnboarding: candidate.daysInOnboarding,
		},
		createdAt: new Date(),
	};

	return insight;
}

/**
 * Build a human-readable summary for the insight.
 */
function buildInsightSummary(
	candidate: CandidateContext,
	context: EmailGenerationContext,
): string {
	const { firstName, lastName } = candidate;
	const { compliance } = context;

	if (compliance.percentage === 100) {
		return `${firstName} ${lastName} is fully compliant - congratulations!`;
	}

	const parts: string[] = [];
	parts.push(
		`${firstName} ${lastName}: ${compliance.percentage}% complete (${compliance.completed}/${compliance.total})`,
	);

	if (compliance.blockedByCandidate.length > 0) {
		parts.push(
			`${compliance.blockedByCandidate.length} item(s) need candidate action`,
		);
	}

	if (context.candidate.startDate) {
		const daysUntil = Math.ceil(
			(context.candidate.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
		);
		if (daysUntil <= 14) {
			parts.push(`starts in ${daysUntil} days`);
		}
	}

	return parts.join(". ");
}

// ============================================
// Email Generation
// ============================================

/**
 * Generate email content for a candidate insight using AI.
 */
export async function generateEmailContent(
	insight: AgentInsight,
	orgPrompt?: string,
): Promise<{ subject: string; body: string; reasoning: string }> {
	// Build context from insight details
	const details = insight.details as {
		candidateName: string;
		candidateEmail: string;
		completedItems: number;
		totalItems: number;
		percentage: number;
		blockedByCandidate: string[];
		blockedByAdmin: string[];
		blockedByThirdParty: string[];
		startDate?: string;
		daysInOnboarding: number;
	};

	const [firstName, ...lastNameParts] = details.candidateName.split(" ");
	const lastName = lastNameParts.join(" ");

	const emailContext: EmailGenerationContext = {
		candidate: {
			firstName,
			lastName,
			email: details.candidateEmail,
			startDate: details.startDate ? new Date(details.startDate) : undefined,
			daysInOnboarding: details.daysInOnboarding,
		},
		compliance: {
			completed: details.completedItems,
			total: details.totalItems,
			percentage: details.percentage,
			blockedByCandidate: details.blockedByCandidate.map((name) => ({
				elementId: "",
				elementName: name,
				elementSlug: "",
				status: "pending" as const,
				blockedBy: "candidate" as const,
				blockingReason: "Action needed",
				actionRequired: `Complete your ${name}`,
			})),
			blockedByAdmin: details.blockedByAdmin.map((name) => ({
				elementId: "",
				elementName: name,
				elementSlug: "",
				status: "pending" as const,
				blockedBy: "admin" as const,
				blockingReason: "Under review",
			})),
			blockedByThirdParty: details.blockedByThirdParty.map((name) => ({
				elementId: "",
				elementName: name,
				elementSlug: "",
				status: "pending" as const,
				blockedBy: "third_party" as const,
				blockingReason: "Awaiting external verification",
			})),
		},
		org: {
			name: "Organisation", // Will be populated from context
		},
		history: {
			daysSinceLastEmail: 1,
			emailCount: 0,
		},
	};

	const prompt = buildFullPrompt(emailContext, orgPrompt);

	try {
		const anthropic = createAnthropic({
			apiKey: process.env.ANTHROPIC_API_KEY,
		});

		const result = await generateText({
			model: anthropic("claude-sonnet-4-5"),
			prompt,
		});

		// Parse JSON response
		const text = result.text.trim();
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("No JSON object found in response");
		}

		const parsed = JSON.parse(jsonMatch[0]);
		return {
			subject: parsed.subject || "Update on your onboarding progress",
			body: parsed.body || "We wanted to check in on your progress.",
			reasoning: parsed.reasoning || "Generated email based on compliance status.",
		};
	} catch (error) {
		console.error("Failed to generate email content:", error);
		// Return fallback content
		return {
			subject: `Update on your onboarding progress, ${firstName}`,
			body: generateFallbackEmailBody(emailContext),
			reasoning: "Fallback template used due to generation error.",
		};
	}
}

/**
 * Generate fallback email content when AI generation fails.
 */
function generateFallbackEmailBody(context: EmailGenerationContext): string {
	const { candidate, compliance, org } = context;

	let body = `Hi ${candidate.firstName},\n\n`;
	body += `Great progress - you've completed ${compliance.completed} of ${compliance.total} compliance requirements (${compliance.percentage}%)!\n\n`;

	if (compliance.blockedByCandidate.length > 0) {
		body += "**Still needed from you:**\n";
		for (const item of compliance.blockedByCandidate) {
			body += `• ${item.elementName}\n`;
		}
		body += "\n";
	}

	if (compliance.blockedByAdmin.length > 0 || compliance.blockedByThirdParty.length > 0) {
		body += "**We're handling:**\n";
		for (const item of [...compliance.blockedByAdmin, ...compliance.blockedByThirdParty]) {
			body += `• ${item.elementName} - ${item.blockingReason}\n`;
		}
		body += "\n";
	}

	if (compliance.blockedByCandidate.length === 0) {
		body += "Nothing is needed from you right now - we're working on the remaining items!\n\n";
	}

	body += "Questions? Just reply to this email.\n\n";
	body += `${org.complianceContact?.name || "Compliance Team"}\n`;
	if (org.complianceContact?.email) {
		body += `${org.complianceContact.email}\n`;
	}
	if (org.complianceContact?.phone) {
		body += `${org.complianceContact.phone}\n`;
	}

	return body;
}

// ============================================
// Export
// ============================================

export default complianceCompanionAgent;
