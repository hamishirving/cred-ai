/**
 * Database Queries for Compliance Companion Agent
 *
 * Fetches candidate, compliance, and activity data needed to run the agent.
 */

import { and, desc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
	profiles,
	organisations,
	placements,
	roles,
	evidence,
	complianceElements,
	packageElements,
	compliancePackages,
	activities,
	workNodes,
} from "@/lib/db/schema";
import type { CandidateContext, ComplianceItemContext, OrgAISettings } from "../types";
import { analyzeBlocking } from "./blocking";

// Database connection
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

// ============================================
// Organisation Queries
// ============================================

/**
 * Get organisation settings including AI companion configuration.
 */
export async function getOrganisationSettings(
	organisationId: string,
): Promise<{
	id: string;
	name: string;
	settings: OrgAISettings;
} | null> {
	const [org] = await db
		.select({
			id: organisations.id,
			name: organisations.name,
			settings: organisations.settings,
		})
		.from(organisations)
		.where(eq(organisations.id, organisationId))
		.limit(1);

	if (!org) {
		return null;
	}

	// Extract AI settings with defaults
	const rawSettings = org.settings as Record<string, unknown> | null;

	const aiSettings: OrgAISettings = {
		enabled: (rawSettings?.aiCompanion as Record<string, unknown>)?.enabled as boolean ?? true,
		orgPrompt: (rawSettings?.aiCompanion as Record<string, unknown>)?.orgPrompt as string | undefined,
		emailFrequency: ((rawSettings?.aiCompanion as Record<string, unknown>)?.emailFrequency as string) as OrgAISettings["emailFrequency"] ?? "daily",
		sendTime: (rawSettings?.aiCompanion as Record<string, unknown>)?.sendTime as string ?? "09:00",
		timezone: (rawSettings?.aiCompanion as Record<string, unknown>)?.timezone as string ?? "Europe/London",
		complianceContact: rawSettings?.complianceContact as OrgAISettings["complianceContact"],
		supportContact: rawSettings?.supportContact as OrgAISettings["supportContact"],
	};

	return {
		id: org.id,
		name: org.name,
		settings: aiSettings,
	};
}

// ============================================
// Candidate Queries
// ============================================

/**
 * Get candidate context for a single profile.
 */
export async function getCandidateContext(
	profileId: string,
	organisationId: string,
): Promise<CandidateContext | null> {
	// Get profile
	const [profile] = await db
		.select()
		.from(profiles)
		.where(
			and(eq(profiles.id, profileId), eq(profiles.organisationId, organisationId)),
		)
		.limit(1);

	if (!profile) {
		return null;
	}

	// Get placement with role and work node
	const [placement] = await db
		.select({
			id: placements.id,
			roleId: placements.roleId,
			roleName: roles.name,
			workNodeId: placements.workNodeId,
			workNodeName: workNodes.name,
			startDate: placements.startDate,
			compliancePercentage: placements.compliancePercentage,
		})
		.from(placements)
		.leftJoin(roles, eq(roles.id, placements.roleId))
		.leftJoin(workNodes, eq(workNodes.id, placements.workNodeId))
		.where(
			and(
				eq(placements.profileId, profileId),
				eq(placements.organisationId, organisationId),
			),
		)
		.limit(1);

	// Get compliance items with evidence
	const complianceItems = await getComplianceItemsForProfile(
		profileId,
		organisationId,
		placement?.id,
	);

	// Calculate compliance stats
	const completed = complianceItems.filter(
		(item) => item.blockedBy === "complete",
	).length;
	const total = complianceItems.length;
	const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

	// Get recent activities
	const recentActivities = await db
		.select({
			id: activities.id,
			activityType: activities.activityType,
			channel: activities.channel,
			createdAt: activities.createdAt,
		})
		.from(activities)
		.where(eq(activities.profileId, profileId))
		.orderBy(desc(activities.createdAt))
		.limit(10);

	// Calculate days since last activity
	const lastActivity = recentActivities[0];
	const daysSinceLastActivity = lastActivity
		? Math.floor(
				(Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24),
			)
		: 999;

	// Calculate days in onboarding
	const daysInOnboarding = Math.floor(
		(Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24),
	);

	return {
		profileId: profile.id,
		firstName: profile.firstName,
		lastName: profile.lastName,
		email: profile.email,
		role: placement?.roleId
			? {
					id: placement.roleId,
					name: placement.roleName || "Unknown Role",
				}
			: undefined,
		placement: placement
			? {
					id: placement.id,
					workNodeName: placement.workNodeName || "Unknown Location",
					startDate: placement.startDate ?? undefined,
				}
			: undefined,
		compliance: {
			completed,
			total,
			percentage,
			items: complianceItems,
		},
		daysInOnboarding,
		daysSinceLastActivity,
	};
}

/**
 * Get all candidates for an organisation.
 */
export async function getCandidatesForOrganisation(
	organisationId: string,
): Promise<CandidateContext[]> {
	const profileList = await db
		.select({ id: profiles.id })
		.from(profiles)
		.where(eq(profiles.organisationId, organisationId));

	const candidates: CandidateContext[] = [];

	for (const profile of profileList) {
		const context = await getCandidateContext(profile.id, organisationId);
		if (context) {
			candidates.push(context);
		}
	}

	return candidates;
}

// ============================================
// Compliance Item Queries
// ============================================

/**
 * Get compliance items for a profile with blocking analysis.
 */
async function getComplianceItemsForProfile(
	profileId: string,
	organisationId: string,
	placementId?: string,
): Promise<ComplianceItemContext[]> {
	// Get compliance packages assigned to this profile
	// For MVP, we assume all candidate-scoped elements apply
	const elements = await db
		.select({
			id: complianceElements.id,
			name: complianceElements.name,
			slug: complianceElements.slug,
			scope: complianceElements.scope,
			integrationKey: complianceElements.integrationKey,
		})
		.from(complianceElements)
		.where(
			and(
				eq(complianceElements.organisationId, organisationId),
				eq(complianceElements.isActive, true),
				// Only candidate-scoped for now (placement-scoped would need placement ID)
				or(
					eq(complianceElements.scope, "candidate"),
					placementId ? eq(complianceElements.scope, "placement") : undefined,
				),
			),
		);

	const items: ComplianceItemContext[] = [];

	for (const element of elements) {
		// Skip placement-scoped elements if no placement
		if (element.scope === "placement" && !placementId) {
			continue;
		}

		// Get evidence for this element
		const [evidenceRecord] = await db
			.select()
			.from(evidence)
			.where(
				and(
					eq(evidence.complianceElementId, element.id),
					eq(evidence.profileId, profileId),
					element.scope === "placement" && placementId
						? eq(evidence.placementId, placementId)
						: isNull(evidence.placementId),
				),
			)
			.orderBy(desc(evidence.createdAt))
			.limit(1);

		// Analyze blocking status
		const analysis = analyzeBlocking(
			{
				id: element.id,
				organisationId,
				name: element.name,
				slug: element.slug,
				scope: element.scope as "candidate" | "placement",
				integrationKey: element.integrationKey,
				// Add required fields with defaults
				description: null,
				category: null,
				dataOwnership: "organisation",
				evidenceType: "document",
				expiryDays: null,
				renewalRequired: true,
				expiryWarningDays: 30,
				verificationRules: null,
				onlyJurisdictions: null,
				excludeJurisdictions: null,
				jurisdictionRequired: false,
				substitutes: null,
				grantsSkillIds: null,
				customFields: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			evidenceRecord || null,
		);

		items.push({
			elementId: element.id,
			elementName: element.name,
			elementSlug: element.slug,
			status: mapBlockedByToStatus(analysis.blockedBy),
			blockedBy: analysis.blockedBy,
			blockingReason: analysis.reason,
			actionRequired: analysis.actionRequired,
			expiresAt: evidenceRecord?.expiresAt ?? undefined,
		});
	}

	return items;
}

/**
 * Map blockedBy to a simplified status.
 */
function mapBlockedByToStatus(
	blockedBy: "candidate" | "admin" | "third_party" | "complete",
): "complete" | "pending" | "expired" | "rejected" {
	switch (blockedBy) {
		case "complete":
			return "complete";
		default:
			return "pending";
	}
}

// ============================================
// Activity Queries
// ============================================

/**
 * Get recent email activities for a profile.
 */
export async function getRecentEmailActivities(
	profileId: string,
	limit = 10,
): Promise<
	{
		id: string;
		summary: string | null;
		details: Record<string, unknown> | null;
		createdAt: Date;
		aiReasoning: string | null;
	}[]
> {
	return await db
		.select({
			id: activities.id,
			summary: activities.summary,
			details: activities.details,
			createdAt: activities.createdAt,
			aiReasoning: activities.aiReasoning,
		})
		.from(activities)
		.where(
			and(
				eq(activities.profileId, profileId),
				eq(activities.activityType, "message_sent"),
				eq(activities.channel, "email"),
			),
		)
		.orderBy(desc(activities.createdAt))
		.limit(limit);
}

/**
 * Log an email preview/send activity.
 */
export async function logEmailActivity(params: {
	organisationId: string;
	profileId: string;
	subject: string;
	body: string;
	reasoning: string;
	status: "preview" | "sent";
}): Promise<void> {
	await db.insert(activities).values({
		organisationId: params.organisationId,
		profileId: params.profileId,
		activityType: "message_sent",
		actor: "ai",
		channel: "email",
		summary: `${params.status === "preview" ? "Previewed" : "Sent"} compliance update email`,
		details: {
			subject: params.subject,
			bodyPreview: params.body.substring(0, 200),
			status: params.status,
		},
		aiReasoning: params.reasoning,
	});
}
