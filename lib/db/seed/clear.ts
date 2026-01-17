/**
 * Clear all seed data from the database.
 *
 * Deletes in reverse dependency order to respect foreign keys.
 * Preserves real users (those with auth_user_id) and all their linked data:
 * - Their org memberships
 * - Organisations they belong to
 * - All data within those organisations
 */
import { eq, isNull, isNotNull, notInArray, inArray, and } from "drizzle-orm";
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
	packageElements,
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
	pipelineStages,
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

/**
 * Clear all seeded data for a specific organisation.
 * Preserves:
 * - The organisation itself
 * - Real users (those with auth_user_id) and their memberships
 *
 * Deletes in FK-safe order.
 *
 * Tables with organisationId: activities, assignment-rules, compliance-elements,
 * compliance-packages, escalations, evidence, jobs, org-memberships, pipelines,
 * placements, profiles, roles, skill-categories, skills, tasks, user-roles,
 * work-node-types, work-nodes
 *
 * Tables without organisationId (need indirect deletion):
 * - applications: profileId, jobId
 * - candidate-experiences: profileId
 * - candidate-skills: profileId
 * - compliance-gaps: profileId
 * - entity-stage-positions: entityId (profileId)
 * - escalation-options: escalationId (cascade)
 * - package-elements: packageId (cascade)
 * - pipeline-stages: pipelineId (cascade)
 * - skill-frameworks: global template, don't delete
 * - skill-requirements: skillId
 * - stage-transitions: entityId (profileId)
 */
export async function clearOrgData(orgId: string): Promise<void> {
	console.log(`   🗑️  Clearing org data...`);

	// Find seeded users in this org (no auth_user_id)
	const seededUsers = await db
		.select({ id: users.id })
		.from(users)
		.innerJoin(orgMemberships, eq(orgMemberships.userId, users.id))
		.where(and(
			eq(orgMemberships.organisationId, orgId),
			isNull(users.authUserId)
		));
	const seededUserIds = seededUsers.map(u => u.id);

	// Get profile IDs for this org (needed for profile-scoped tables)
	const orgProfiles = await db
		.select({ id: profiles.id })
		.from(profiles)
		.where(eq(profiles.organisationId, orgId));
	const profileIds = orgProfiles.map(p => p.id);

	// Get job IDs for this org (needed for applications)
	const orgJobs = await db
		.select({ id: jobs.id })
		.from(jobs)
		.where(eq(jobs.organisationId, orgId));
	const jobIds = orgJobs.map(j => j.id);

	// Get skill IDs for this org (needed for skill-requirements)
	const orgSkills = await db
		.select({ id: skills.id })
		.from(skills)
		.where(eq(skills.organisationId, orgId));
	const skillIds = orgSkills.map(s => s.id);

	// Get package IDs for this org (needed for package-elements)
	const orgPackages = await db
		.select({ id: compliancePackages.id })
		.from(compliancePackages)
		.where(eq(compliancePackages.organisationId, orgId));
	const packageIds = orgPackages.map(p => p.id);

	// 1. Operations (leaf tables with organisationId)
	await db.delete(tasks).where(eq(tasks.organisationId, orgId));
	// escalation_options cascade from escalations
	await db.delete(escalations).where(eq(escalations.organisationId, orgId));
	await db.delete(activities).where(eq(activities.organisationId, orgId));

	// 2. Journey - profile-scoped tables
	if (profileIds.length > 0) {
		await db.delete(stageTransitions).where(inArray(stageTransitions.entityId, profileIds));
		await db.delete(entityStagePositions).where(inArray(entityStagePositions.entityId, profileIds));
	}
	// pipeline_stages cascade from pipelines
	await db.delete(pipelines).where(eq(pipelines.organisationId, orgId));

	// 3. Evidence & Gaps - profile-scoped
	if (profileIds.length > 0) {
		await db.delete(complianceGaps).where(inArray(complianceGaps.profileId, profileIds));
	}
	await db.delete(evidence).where(eq(evidence.organisationId, orgId));

	// 4. Work - applications are profile/job scoped
	if (profileIds.length > 0) {
		await db.delete(applications).where(inArray(applications.profileId, profileIds));
	}
	await db.delete(placements).where(eq(placements.organisationId, orgId));
	await db.delete(jobs).where(eq(jobs.organisationId, orgId));

	// 5. Skills - profile-scoped and skill-scoped
	if (profileIds.length > 0) {
		await db.delete(candidateExperiences).where(inArray(candidateExperiences.profileId, profileIds));
		await db.delete(candidateSkills).where(inArray(candidateSkills.profileId, profileIds));
	}
	if (skillIds.length > 0) {
		await db.delete(skillRequirements).where(inArray(skillRequirements.skillId, skillIds));
	}
	await db.delete(skills).where(eq(skills.organisationId, orgId));
	await db.delete(skillCategories).where(eq(skillCategories.organisationId, orgId));
	// skill_frameworks are global templates, don't delete

	// 6. Compliance - package-elements are package-scoped
	if (packageIds.length > 0) {
		await db.delete(packageElements).where(inArray(packageElements.packageId, packageIds));
	}
	await db.delete(assignmentRules).where(eq(assignmentRules.organisationId, orgId));
	await db.delete(compliancePackages).where(eq(compliancePackages.organisationId, orgId));
	await db.delete(complianceElements).where(eq(complianceElements.organisationId, orgId));

	// 7. Identity
	// Delete all org memberships (will be restored for real users after roles recreated)
	await db.delete(orgMemberships).where(eq(orgMemberships.organisationId, orgId));
	await db.delete(profiles).where(eq(profiles.organisationId, orgId));

	// Delete seeded users (those with no authUserId)
	if (seededUserIds.length > 0) {
		await db.delete(users).where(inArray(users.id, seededUserIds));
	}

	// 8. Structure - user_roles must be deleted after org_memberships (FK constraint)
	await db.delete(userRoles).where(eq(userRoles.organisationId, orgId));
	await db.delete(workNodes).where(eq(workNodes.organisationId, orgId));
	await db.delete(workNodeTypes).where(eq(workNodeTypes.organisationId, orgId));
	await db.delete(roles).where(eq(roles.organisationId, orgId));

	console.log(`   ✓ Cleared org data`);
}
