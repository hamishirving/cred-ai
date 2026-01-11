/**
 * Clear all seed data from the database.
 *
 * Deletes in reverse dependency order to respect foreign keys.
 * Preserves real users (those with auth_user_id) and all their linked data:
 * - Their org memberships
 * - Organisations they belong to
 * - All data within those organisations
 */
import { isNull, isNotNull, notInArray, inArray } from "drizzle-orm";
import { db } from "./db";
import {
	// Operations (leaf tables)
	tasks,
	escalations,
	activities,
	// Journey
	stageTransitions,
	entityStagePositions,
	pipelines,
	// Evidence
	complianceGaps,
	evidence,
	// Work
	placements,
	applications,
	jobs,
	// Skills
	skillRequirements,
	candidateExperiences,
	candidateSkills,
	skills,
	skillCategories,
	skillFrameworks,
	// Compliance
	assignmentRules,
	compliancePackages,
	complianceElements,
	// Identity & People
	orgMemberships,
	profiles,
	users,
	// Structure
	workNodes,
	workNodeTypes,
	roles,
	userRoles,
	organisations,
} from "../schema";

export async function clearAllData() {
	console.log("🗑️  Clearing all data...");

	// 1. Find real users (those with auth_user_id)
	const realUsers = await db
		.select({ id: users.id, currentOrgId: users.currentOrgId })
		.from(users)
		.where(isNotNull(users.authUserId));
	const realUserIds = realUsers.map((u) => u.id);

	// 2. Find orgs those users belong to (via memberships + currentOrgId)
	let preservedOrgIds: string[] = [];
	if (realUserIds.length > 0) {
		// Get orgs from memberships
		const userOrgs = await db
			.select({ organisationId: orgMemberships.organisationId })
			.from(orgMemberships)
			.where(inArray(orgMemberships.userId, realUserIds));
		const membershipOrgIds = userOrgs.map((o) => o.organisationId);

		// Get orgs from currentOrgId
		const currentOrgIds = realUsers
			.filter((u) => u.currentOrgId !== null)
			.map((u) => u.currentOrgId as string);

		// Combine and dedupe
		preservedOrgIds = [...new Set([...membershipOrgIds, ...currentOrgIds])];
	}

	console.log(
		`   ℹ Preserving ${realUserIds.length} real users and ${preservedOrgIds.length} linked orgs`
	);

	// 3. Delete in reverse dependency order, excluding preserved orgs
	// Note: Tables with CASCADE on delete are handled by their parent deletion

	// Operations (org-scoped)
	if (preservedOrgIds.length > 0) {
		await db.delete(tasks).where(notInArray(tasks.organisationId, preservedOrgIds));
	} else {
		await db.delete(tasks);
	}
	console.log("   ✓ Cleared tasks");

	// escalationOptions: CASCADE from escalations - skipped
	if (preservedOrgIds.length > 0) {
		await db.delete(escalations).where(notInArray(escalations.organisationId, preservedOrgIds));
	} else {
		await db.delete(escalations);
	}
	console.log("   ✓ Cleared escalations");

	if (preservedOrgIds.length > 0) {
		await db.delete(activities).where(notInArray(activities.organisationId, preservedOrgIds));
	} else {
		await db.delete(activities);
	}
	console.log("   ✓ Cleared activities");

	// Journey (tables without organisationId - delete all)
	await db.delete(stageTransitions);
	console.log("   ✓ Cleared stage_transitions");

	await db.delete(entityStagePositions);
	console.log("   ✓ Cleared entity_stage_positions");

	// pipelineStages: CASCADE from pipelines - skipped
	if (preservedOrgIds.length > 0) {
		await db.delete(pipelines).where(notInArray(pipelines.organisationId, preservedOrgIds));
	} else {
		await db.delete(pipelines);
	}
	console.log("   ✓ Cleared pipelines");

	// Evidence
	await db.delete(complianceGaps);
	console.log("   ✓ Cleared compliance_gaps");

	if (preservedOrgIds.length > 0) {
		await db.delete(evidence).where(notInArray(evidence.organisationId, preservedOrgIds));
	} else {
		await db.delete(evidence);
	}
	console.log("   ✓ Cleared evidence");

	// Work
	if (preservedOrgIds.length > 0) {
		await db.delete(placements).where(notInArray(placements.organisationId, preservedOrgIds));
	} else {
		await db.delete(placements);
	}
	console.log("   ✓ Cleared placements");

	await db.delete(applications);
	console.log("   ✓ Cleared applications");

	if (preservedOrgIds.length > 0) {
		await db.delete(jobs).where(notInArray(jobs.organisationId, preservedOrgIds));
	} else {
		await db.delete(jobs);
	}
	console.log("   ✓ Cleared jobs");

	// Skills (tables without organisationId - delete all)
	await db.delete(skillRequirements);
	console.log("   ✓ Cleared skill_requirements");

	await db.delete(candidateExperiences);
	console.log("   ✓ Cleared candidate_experiences");

	await db.delete(candidateSkills);
	console.log("   ✓ Cleared candidate_skills");

	if (preservedOrgIds.length > 0) {
		await db.delete(skills).where(notInArray(skills.organisationId, preservedOrgIds));
	} else {
		await db.delete(skills);
	}
	console.log("   ✓ Cleared skills");

	if (preservedOrgIds.length > 0) {
		await db.delete(skillCategories).where(notInArray(skillCategories.organisationId, preservedOrgIds));
	} else {
		await db.delete(skillCategories);
	}
	console.log("   ✓ Cleared skill_categories");

	await db.delete(skillFrameworks);
	console.log("   ✓ Cleared skill_frameworks");

	// Compliance
	if (preservedOrgIds.length > 0) {
		await db.delete(assignmentRules).where(notInArray(assignmentRules.organisationId, preservedOrgIds));
	} else {
		await db.delete(assignmentRules);
	}
	console.log("   ✓ Cleared assignment_rules");

	// packageElements: CASCADE from compliancePackages - skipped
	if (preservedOrgIds.length > 0) {
		await db.delete(compliancePackages).where(notInArray(compliancePackages.organisationId, preservedOrgIds));
	} else {
		await db.delete(compliancePackages);
	}
	console.log("   ✓ Cleared compliance_packages");

	if (preservedOrgIds.length > 0) {
		await db.delete(complianceElements).where(notInArray(complianceElements.organisationId, preservedOrgIds));
	} else {
		await db.delete(complianceElements);
	}
	console.log("   ✓ Cleared compliance_elements");

	// Identity - special handling
	// Org memberships: preserve for real users
	if (realUserIds.length > 0) {
		await db
			.delete(orgMemberships)
			.where(notInArray(orgMemberships.userId, realUserIds));
	} else {
		await db.delete(orgMemberships);
	}
	console.log("   ✓ Cleared org_memberships (preserved real user memberships)");

	// Profiles: preserve those in preserved orgs
	if (preservedOrgIds.length > 0) {
		await db.delete(profiles).where(notInArray(profiles.organisationId, preservedOrgIds));
	} else {
		await db.delete(profiles);
	}
	console.log("   ✓ Cleared profiles");

	// Users: preserve those with auth_user_id
	await db.delete(users).where(isNull(users.authUserId));
	console.log("   ✓ Cleared users (preserved real users)");

	// Structure
	if (preservedOrgIds.length > 0) {
		await db.delete(workNodes).where(notInArray(workNodes.organisationId, preservedOrgIds));
	} else {
		await db.delete(workNodes);
	}
	console.log("   ✓ Cleared work_nodes");

	if (preservedOrgIds.length > 0) {
		await db.delete(workNodeTypes).where(notInArray(workNodeTypes.organisationId, preservedOrgIds));
	} else {
		await db.delete(workNodeTypes);
	}
	console.log("   ✓ Cleared work_node_types");

	if (preservedOrgIds.length > 0) {
		await db.delete(roles).where(notInArray(roles.organisationId, preservedOrgIds));
	} else {
		await db.delete(roles);
	}
	console.log("   ✓ Cleared roles");

	if (preservedOrgIds.length > 0) {
		await db.delete(userRoles).where(notInArray(userRoles.organisationId, preservedOrgIds));
	} else {
		await db.delete(userRoles);
	}
	console.log("   ✓ Cleared user_roles");

	// Organisations: preserve those with real users
	if (preservedOrgIds.length > 0) {
		await db.delete(organisations).where(notInArray(organisations.id, preservedOrgIds));
	} else {
		await db.delete(organisations);
	}
	console.log("   ✓ Cleared organisations (preserved linked orgs)");

	console.log("✅ All seed data cleared (real user data preserved)");
}
