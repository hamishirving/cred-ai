/**
 * ERD Configuration - Domain mappings, colors, and node positions.
 */

export type DomainKey =
	| "tenant"
	| "compliance"
	| "skills"
	| "people"
	| "work"
	| "evidence"
	| "journey"
	| "operations";

export interface DomainConfig {
	label: string;
	color: string;
	bgColor: string;
	tables: string[];
}

export interface ErdConfig {
	domains: Record<DomainKey, DomainConfig>;
	positions: Record<string, { x: number; y: number }>;
}

export const erdConfig: ErdConfig = {
	domains: {
		tenant: {
			label: "Tenant & Structure",
			color: "#3b82f6", // blue-500
			bgColor: "#3b82f620",
			tables: ["organisations", "work_node_types", "work_nodes", "roles"],
		},
		compliance: {
			label: "Compliance",
			color: "#22c55e", // green-500
			bgColor: "#22c55e20",
			tables: [
				"compliance_elements",
				"compliance_packages",
				"package_elements",
				"assignment_rules",
			],
		},
		skills: {
			label: "Skills",
			color: "#a855f7", // purple-500
			bgColor: "#a855f720",
			tables: [
				"skill_frameworks",
				"skill_categories",
				"skills",
				"candidate_skills",
				"candidate_experiences",
				"skill_requirements",
			],
		},
		people: {
			label: "People",
			color: "#06b6d4", // cyan-500
			bgColor: "#06b6d420",
			tables: ["profiles"],
		},
		work: {
			label: "Work",
			color: "#f97316", // orange-500
			bgColor: "#f9731620",
			tables: ["jobs", "applications", "placements"],
		},
		evidence: {
			label: "Evidence",
			color: "#eab308", // yellow-500
			bgColor: "#eab30820",
			tables: ["evidence", "compliance_gaps"],
		},
		journey: {
			label: "Journey",
			color: "#ec4899", // pink-500
			bgColor: "#ec489920",
			tables: [
				"pipelines",
				"pipeline_stages",
				"entity_stage_positions",
				"stage_transitions",
			],
		},
		operations: {
			label: "Operations",
			color: "#ef4444", // red-500
			bgColor: "#ef444420",
			tables: ["activities", "escalations", "escalation_options"],
		},
	},

	// Manual positions for each table node
	// Organized by domain, left-to-right flow
	positions: {
		// Tenant & Structure (top-left)
		organisations: { x: 50, y: 50 },
		work_node_types: { x: 50, y: 300 },
		work_nodes: { x: 300, y: 150 },
		roles: { x: 300, y: 400 },

		// People (center-top)
		profiles: { x: 600, y: 50 },

		// Work (center)
		jobs: { x: 600, y: 300 },
		applications: { x: 850, y: 200 },
		placements: { x: 850, y: 400 },

		// Compliance (right side)
		compliance_elements: { x: 1150, y: 50 },
		compliance_packages: { x: 1150, y: 300 },
		package_elements: { x: 1400, y: 200 },
		assignment_rules: { x: 1400, y: 400 },

		// Evidence (below compliance)
		evidence: { x: 1150, y: 550 },
		compliance_gaps: { x: 1400, y: 550 },

		// Skills (bottom-left)
		skill_frameworks: { x: 50, y: 600 },
		skill_categories: { x: 50, y: 800 },
		skills: { x: 300, y: 700 },
		candidate_skills: { x: 550, y: 600 },
		candidate_experiences: { x: 550, y: 800 },
		skill_requirements: { x: 300, y: 900 },

		// Journey (bottom-center)
		pipelines: { x: 850, y: 650 },
		pipeline_stages: { x: 850, y: 850 },
		entity_stage_positions: { x: 1100, y: 750 },
		stage_transitions: { x: 1100, y: 950 },

		// Operations (bottom-right)
		activities: { x: 1400, y: 750 },
		escalations: { x: 1400, y: 900 },
		escalation_options: { x: 1650, y: 850 },
	},
};

// Helper to get domain config for a table
export function getDomainForTable(tableName: string): DomainConfig | undefined {
	for (const [, config] of Object.entries(erdConfig.domains)) {
		if (config.tables.includes(tableName)) {
			return config;
		}
	}
	return undefined;
}

// Explicit relationship definitions (source.column -> target)
export interface Relationship {
	source: string;
	sourceColumn: string;
	target: string;
}

export const relationships: Relationship[] = [
	// Tenant & Structure
	{ source: "organisations", sourceColumn: "parentId", target: "organisations" },
	{ source: "work_node_types", sourceColumn: "organisationId", target: "organisations" },
	{ source: "work_nodes", sourceColumn: "organisationId", target: "organisations" },
	{ source: "work_nodes", sourceColumn: "typeId", target: "work_node_types" },
	{ source: "work_nodes", sourceColumn: "parentId", target: "work_nodes" },
	{ source: "roles", sourceColumn: "organisationId", target: "organisations" },

	// Compliance
	{ source: "compliance_elements", sourceColumn: "organisationId", target: "organisations" },
	{ source: "compliance_packages", sourceColumn: "organisationId", target: "organisations" },
	{ source: "package_elements", sourceColumn: "packageId", target: "compliance_packages" },
	{ source: "package_elements", sourceColumn: "elementId", target: "compliance_elements" },
	{ source: "assignment_rules", sourceColumn: "organisationId", target: "organisations" },
	{ source: "assignment_rules", sourceColumn: "packageId", target: "compliance_packages" },

	// Skills
	{ source: "skill_frameworks", sourceColumn: "organisationId", target: "organisations" },
	{ source: "skill_categories", sourceColumn: "organisationId", target: "organisations" },
	{ source: "skill_categories", sourceColumn: "frameworkId", target: "skill_frameworks" },
	{ source: "skill_categories", sourceColumn: "parentId", target: "skill_categories" },
	{ source: "skills", sourceColumn: "organisationId", target: "organisations" },
	{ source: "skills", sourceColumn: "categoryId", target: "skill_categories" },
	{ source: "candidate_skills", sourceColumn: "profileId", target: "profiles" },
	{ source: "candidate_skills", sourceColumn: "skillId", target: "skills" },
	{ source: "candidate_skills", sourceColumn: "complianceElementId", target: "compliance_elements" },
	{ source: "candidate_experiences", sourceColumn: "profileId", target: "profiles" },
	{ source: "skill_requirements", sourceColumn: "skillId", target: "skills" },

	// People
	{ source: "profiles", sourceColumn: "organisationId", target: "organisations" },

	// Work
	{ source: "jobs", sourceColumn: "organisationId", target: "organisations" },
	{ source: "jobs", sourceColumn: "workNodeId", target: "work_nodes" },
	{ source: "jobs", sourceColumn: "roleId", target: "roles" },
	{ source: "applications", sourceColumn: "profileId", target: "profiles" },
	{ source: "applications", sourceColumn: "jobId", target: "jobs" },
	{ source: "placements", sourceColumn: "organisationId", target: "organisations" },
	{ source: "placements", sourceColumn: "profileId", target: "profiles" },
	{ source: "placements", sourceColumn: "workNodeId", target: "work_nodes" },
	{ source: "placements", sourceColumn: "roleId", target: "roles" },
	{ source: "placements", sourceColumn: "applicationId", target: "applications" },

	// Evidence
	{ source: "evidence", sourceColumn: "organisationId", target: "organisations" },
	{ source: "evidence", sourceColumn: "complianceElementId", target: "compliance_elements" },
	{ source: "evidence", sourceColumn: "profileId", target: "profiles" },
	{ source: "evidence", sourceColumn: "placementId", target: "placements" },
	{ source: "compliance_gaps", sourceColumn: "profileId", target: "profiles" },
	{ source: "compliance_gaps", sourceColumn: "placementId", target: "placements" },
	{ source: "compliance_gaps", sourceColumn: "complianceElementId", target: "compliance_elements" },

	// Journey
	{ source: "pipelines", sourceColumn: "organisationId", target: "organisations" },
	{ source: "pipeline_stages", sourceColumn: "pipelineId", target: "pipelines" },
	{ source: "entity_stage_positions", sourceColumn: "pipelineId", target: "pipelines" },
	{ source: "entity_stage_positions", sourceColumn: "currentStageId", target: "pipeline_stages" },
	{ source: "stage_transitions", sourceColumn: "fromStageId", target: "pipeline_stages" },
	{ source: "stage_transitions", sourceColumn: "toStageId", target: "pipeline_stages" },

	// Operations
	{ source: "activities", sourceColumn: "organisationId", target: "organisations" },
	{ source: "escalations", sourceColumn: "organisationId", target: "organisations" },
	{ source: "escalations", sourceColumn: "profileId", target: "profiles" },
	{ source: "escalations", sourceColumn: "complianceElementId", target: "compliance_elements" },
	{ source: "escalation_options", sourceColumn: "escalationId", target: "escalations" },
];
