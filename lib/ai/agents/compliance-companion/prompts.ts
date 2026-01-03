/**
 * Compliance Companion Prompts
 *
 * 3-layer prompt architecture:
 * 1. System Prompt - Core behaviour, safety rails, output format
 * 2. Org Prompt - Organisation-specific voice and context
 * 3. Dynamic Context - Candidate-specific data and compliance status
 *
 * @see docs/PRD-AI-AGENTS.md
 */

import type { OrgAISettings, CandidateContext, ComplianceItemContext } from "../types";

// ============================================
// System Prompt (Layer 1)
// ============================================

export const SYSTEM_PROMPT = `You are an AI Compliance Companion helping candidates complete their onboarding journey. Your job is to write warm, encouraging emails that help candidates understand their compliance status and take action.

## Core Principles

1. **Celebrate progress first** - Always acknowledge what they've accomplished before mentioning gaps
2. **Never nag about things outside their control** - If we're reviewing something or a third party is processing it, don't ask them to do anything about it
3. **Be specific when you can, general when you must** - Use actual document names and deadlines when available
4. **Write like a helpful colleague, not a system notification** - Warm and human, not robotic
5. **Keep it brief** - 150-250 words max. Busy healthcare professionals don't have time for essays

## Message Structure

1. Greeting with first name
2. Progress celebration (X of Y complete, percentage)
3. What's needed from THEM (if anything) - be specific and actionable
4. What WE'RE handling (if anything) - reassure them it's in progress
5. Encouraging close
6. Contact details footer

## Tone Guidelines

- Warm and supportive, not corporate or cold
- Professional but human - like a helpful colleague
- Encouraging, not pressuring or guilt-tripping
- Clear and scannable - use bullet points for action items
- Positive framing - "Just one more step!" not "You haven't finished"

## Output Format

Return a JSON object with:
- subject: Email subject line (short, friendly, specific)
- body: Email body in plain text (use markdown for formatting)
- reasoning: Brief explanation of your approach and decisions

## Rules - NEVER Break These

1. NEVER hallucinate requirements - only mention items that exist in the data
2. NEVER misstate status - if something is approved, don't say it's pending
3. NEVER mention completed items as needing action
4. NEVER ask them to do something that's blocked by us or a third party
5. ALWAYS be clear about who is responsible for what
6. ALWAYS include contact details at the end
7. If nothing is needed from the candidate, explicitly say so and celebrate their progress`;

// ============================================
// Dynamic Context Builder (Layer 3)
// ============================================

export interface EmailGenerationContext {
	candidate: {
		firstName: string;
		lastName: string;
		email: string;
		role?: string;
		startDate?: Date;
		daysInOnboarding: number;
	};
	compliance: {
		completed: number;
		total: number;
		percentage: number;
		blockedByCandidate: ComplianceItemContext[];
		blockedByAdmin: ComplianceItemContext[];
		blockedByThirdParty: ComplianceItemContext[];
	};
	org: {
		name: string;
		complianceContact?: {
			name: string;
			email: string;
			phone?: string;
		};
	};
	history: {
		daysSinceLastEmail: number;
		emailCount: number;
	};
}

/**
 * Build the dynamic context prompt for a specific candidate.
 */
export function buildDynamicContextPrompt(context: EmailGenerationContext): string {
	const { candidate, compliance, org, history } = context;

	// Format blocked items
	const candidateItems = compliance.blockedByCandidate
		.map((item) => `- ${item.elementName}: ${item.actionRequired || "Action needed"}`)
		.join("\n");

	const adminItems = compliance.blockedByAdmin
		.map((item) => `- ${item.elementName}: ${item.blockingReason}`)
		.join("\n");

	const thirdPartyItems = compliance.blockedByThirdParty
		.map((item) => `- ${item.elementName}: ${item.blockingReason}`)
		.join("\n");

	// Format start date if available
	const startDateInfo = candidate.startDate
		? `Start Date: ${formatDate(candidate.startDate)} (${getDaysUntil(candidate.startDate)} days away)`
		: "Start Date: Not yet scheduled";

	return `## Candidate Information

Name: ${candidate.firstName} ${candidate.lastName}
Email: ${candidate.email}
Role: ${candidate.role || "Not specified"}
${startDateInfo}
Days in Onboarding: ${candidate.daysInOnboarding}

## Compliance Status

Progress: ${compliance.completed} of ${compliance.total} items complete (${compliance.percentage}%)

### Items Needing Candidate Action (${compliance.blockedByCandidate.length})
${candidateItems || "None - nothing needed from them right now!"}

### Items We're Reviewing (${compliance.blockedByAdmin.length})
${adminItems || "None currently under review"}

### Items With External Providers (${compliance.blockedByThirdParty.length})
${thirdPartyItems || "None with external providers"}

## Communication History

Days Since Last Email: ${history.daysSinceLastEmail}
Total Emails Sent: ${history.emailCount}

## Organisation

Name: ${org.name}
Compliance Contact: ${org.complianceContact?.name || "Compliance Team"} (${org.complianceContact?.email || "compliance@" + org.name.toLowerCase().replace(/\s+/g, "") + ".com"})
${org.complianceContact?.phone ? `Phone: ${org.complianceContact.phone}` : ""}`;
}

/**
 * Build the full prompt combining all three layers.
 */
export function buildFullPrompt(
	context: EmailGenerationContext,
	orgPrompt?: string,
): string {
	const dynamicContext = buildDynamicContextPrompt(context);

	const orgLayer = orgPrompt
		? `\n## Organisation Voice\n\n${orgPrompt}\n`
		: "";

	return `${SYSTEM_PROMPT}
${orgLayer}
---

${dynamicContext}

---

Now generate an email for this candidate. Remember to:
1. Celebrate their ${context.compliance.percentage}% progress
2. ${context.compliance.blockedByCandidate.length > 0 ? `Clearly list the ${context.compliance.blockedByCandidate.length} item(s) they need to action` : "Celebrate that nothing is needed from them right now"}
3. ${context.compliance.blockedByAdmin.length > 0 || context.compliance.blockedByThirdParty.length > 0 ? "Reassure them about items we're handling" : ""}
4. End with clear contact details

Return your response as a JSON object with "subject", "body", and "reasoning" fields.`;
}

// ============================================
// Helper Functions
// ============================================

function formatDate(date: Date): string {
	return date.toLocaleDateString("en-GB", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
}

function getDaysUntil(date: Date): number {
	const now = new Date();
	const diffTime = date.getTime() - now.getTime();
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// Insight Category Determination
// ============================================

export type InsightCategory =
	| "progress"
	| "blocker"
	| "expiry"
	| "action_required"
	| "celebration";

export type InsightPriority = "low" | "medium" | "high" | "urgent";

/**
 * Determine the category and priority of an insight based on candidate context.
 */
export function determineInsightCategoryAndPriority(
	context: EmailGenerationContext,
): { category: InsightCategory; priority: InsightPriority } {
	const { compliance, candidate } = context;
	const daysUntilStart = candidate.startDate
		? getDaysUntil(candidate.startDate)
		: null;

	// Celebration: Fully compliant
	if (compliance.percentage === 100) {
		return { category: "celebration", priority: "low" };
	}

	// Urgent: Close to start date with items blocked by candidate
	if (
		daysUntilStart !== null &&
		daysUntilStart <= 7 &&
		compliance.blockedByCandidate.length > 0
	) {
		return { category: "action_required", priority: "urgent" };
	}

	// High: Start date approaching or stuck for a while
	if (
		(daysUntilStart !== null && daysUntilStart <= 14) ||
		candidate.daysInOnboarding > 21
	) {
		if (compliance.blockedByCandidate.length > 0) {
			return { category: "action_required", priority: "high" };
		}
		return { category: "blocker", priority: "high" };
	}

	// Medium: Has items to action
	if (compliance.blockedByCandidate.length > 0) {
		return { category: "action_required", priority: "medium" };
	}

	// Low: Making progress, nothing needed from them
	return { category: "progress", priority: "low" };
}
