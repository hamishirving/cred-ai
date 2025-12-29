/**
 * Clear all seed data from the database.
 *
 * Deletes in reverse dependency order to respect foreign keys.
 * Does NOT delete chat-related tables (those are separate).
 */
import { db } from "./db";
import {
	// Operations (leaf tables)
	escalationOptions,
	escalations,
	activities,
	// Journey
	stageTransitions,
	entityStagePositions,
	pipelineStages,
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
	// People
	profiles,
	// Structure
	workNodes,
	workNodeTypes,
	roles,
	organisations,
} from "../schema";

export async function clearAllData() {
	console.log("🗑️  Clearing all data...");

	// Delete in reverse dependency order
	const tables = [
		{ name: "escalation_options", table: escalationOptions },
		{ name: "escalations", table: escalations },
		{ name: "activities", table: activities },
		{ name: "stage_transitions", table: stageTransitions },
		{ name: "entity_stage_positions", table: entityStagePositions },
		{ name: "pipeline_stages", table: pipelineStages },
		{ name: "pipelines", table: pipelines },
		{ name: "compliance_gaps", table: complianceGaps },
		{ name: "evidence", table: evidence },
		{ name: "placements", table: placements },
		{ name: "applications", table: applications },
		{ name: "jobs", table: jobs },
		{ name: "skill_requirements", table: skillRequirements },
		{ name: "candidate_experiences", table: candidateExperiences },
		{ name: "candidate_skills", table: candidateSkills },
		{ name: "skills", table: skills },
		{ name: "skill_categories", table: skillCategories },
		{ name: "skill_frameworks", table: skillFrameworks },
		{ name: "assignment_rules", table: assignmentRules },
		{ name: "package_elements", table: packageElements },
		{ name: "compliance_packages", table: compliancePackages },
		{ name: "compliance_elements", table: complianceElements },
		{ name: "profiles", table: profiles },
		{ name: "work_nodes", table: workNodes },
		{ name: "work_node_types", table: workNodeTypes },
		{ name: "roles", table: roles },
		{ name: "organisations", table: organisations },
	];

	for (const { name, table } of tables) {
		try {
			await db.delete(table);
			console.log(`   ✓ Cleared ${name}`);
		} catch (error) {
			console.error(`   ✗ Failed to clear ${name}:`, error);
			throw error;
		}
	}

	console.log("✅ All data cleared");
}
