/**
 * ERD Configuration - Domain mappings, colors, and node positions.
 */

export type DomainKey =
	| "tenant"
	| "identity"
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
		identity: {
			label: "Identity & Access",
			color: "#8b5cf6", // violet-500
			bgColor: "#8b5cf620",
			tables: ["users", "org_memberships", "user_roles"],
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
			tables: ["activities", "escalations", "escalation_options", "tasks"],
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

		// Identity & Access (below tenant)
		users: { x: 50, y: 500 },
		org_memberships: { x: 300, y: 600 },
		user_roles: { x: 50, y: 750 },

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
		tasks: { x: 1650, y: 1000 },
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
	description?: string;
}

export const relationships: Relationship[] = [
	// Tenant & Structure
	{ source: "organisations", sourceColumn: "parentId", target: "organisations", description: "Parent org for multi-level hierarchy" },
	{ source: "work_node_types", sourceColumn: "organisationId", target: "organisations", description: "Org that defined this hierarchy level type" },
	{ source: "work_nodes", sourceColumn: "organisationId", target: "organisations", description: "Org that owns this work location" },
	{ source: "work_nodes", sourceColumn: "typeId", target: "work_node_types", description: "What level in hierarchy (Trust, Hospital, Ward, etc.)" },
	{ source: "work_nodes", sourceColumn: "parentId", target: "work_nodes", description: "Parent location for hierarchy tree" },
	{ source: "roles", sourceColumn: "organisationId", target: "organisations", description: "Org that defined this role" },

	// Identity & Access
	{ source: "users", sourceColumn: "currentOrgId", target: "organisations", description: "Currently selected organisation context" },
	{ source: "org_memberships", sourceColumn: "userId", target: "users", description: "User who has this membership" },
	{ source: "org_memberships", sourceColumn: "organisationId", target: "organisations", description: "Organisation they belong to" },
	{ source: "org_memberships", sourceColumn: "userRoleId", target: "user_roles", description: "Permission role in this org" },
	{ source: "org_memberships", sourceColumn: "profileId", target: "profiles", description: "Optional profile for compliance tracking" },
	{ source: "user_roles", sourceColumn: "organisationId", target: "organisations", description: "Org that defined this permission role" },

	// Compliance
	{ source: "compliance_elements", sourceColumn: "organisationId", target: "organisations", description: "Org that defined this requirement" },
	{ source: "compliance_packages", sourceColumn: "organisationId", target: "organisations", description: "Org that owns this package" },
	{ source: "package_elements", sourceColumn: "packageId", target: "compliance_packages", description: "Which package this belongs to" },
	{ source: "package_elements", sourceColumn: "elementId", target: "compliance_elements", description: "Which requirement is included" },
	{ source: "assignment_rules", sourceColumn: "organisationId", target: "organisations", description: "Org scope for this rule" },
	{ source: "assignment_rules", sourceColumn: "packageId", target: "compliance_packages", description: "Package to assign when rule matches" },

	// Skills
	{ source: "skill_frameworks", sourceColumn: "organisationId", target: "organisations", description: "Org that adopted/customised this framework" },
	{ source: "skill_categories", sourceColumn: "organisationId", target: "organisations", description: "Org that owns this category" },
	{ source: "skill_categories", sourceColumn: "frameworkId", target: "skill_frameworks", description: "Framework this category belongs to" },
	{ source: "skill_categories", sourceColumn: "parentId", target: "skill_categories", description: "Parent for nested categories" },
	{ source: "skills", sourceColumn: "organisationId", target: "organisations", description: "Org that defined this skill" },
	{ source: "skills", sourceColumn: "categoryId", target: "skill_categories", description: "Category grouping for this skill" },
	{ source: "candidate_skills", sourceColumn: "profileId", target: "profiles", description: "Candidate who has this skill" },
	{ source: "candidate_skills", sourceColumn: "skillId", target: "skills", description: "Which skill they have" },
	{ source: "candidate_skills", sourceColumn: "complianceElementId", target: "compliance_elements", description: "Compliance element that evidences this skill" },
	{ source: "candidate_experiences", sourceColumn: "profileId", target: "profiles", description: "Candidate with this experience" },
	{ source: "skill_requirements", sourceColumn: "skillId", target: "skills", description: "Required skill for matching" },

	// People
	{ source: "profiles", sourceColumn: "organisationId", target: "organisations", description: "Primary org for this candidate" },

	// Work
	{ source: "jobs", sourceColumn: "organisationId", target: "organisations", description: "Org posting this job" },
	{ source: "jobs", sourceColumn: "workNodeId", target: "work_nodes", description: "Where this job is located" },
	{ source: "jobs", sourceColumn: "roleId", target: "roles", description: "Role type for this position" },
	{ source: "applications", sourceColumn: "profileId", target: "profiles", description: "Candidate who applied" },
	{ source: "applications", sourceColumn: "jobId", target: "jobs", description: "Job they applied to" },
	{ source: "placements", sourceColumn: "organisationId", target: "organisations", description: "Org managing this placement" },
	{ source: "placements", sourceColumn: "profileId", target: "profiles", description: "Candidate being placed" },
	{ source: "placements", sourceColumn: "workNodeId", target: "work_nodes", description: "Where they're working - drives compliance" },
	{ source: "placements", sourceColumn: "roleId", target: "roles", description: "Role they're filling - drives requirements" },
	{ source: "placements", sourceColumn: "applicationId", target: "applications", description: "Application that led to this placement" },

	// Evidence
	{ source: "evidence", sourceColumn: "organisationId", target: "organisations", description: "Org that owns this evidence" },
	{ source: "evidence", sourceColumn: "complianceElementId", target: "compliance_elements", description: "Which requirement this fulfils" },
	{ source: "evidence", sourceColumn: "profileId", target: "profiles", description: "Candidate-scoped evidence owner" },
	{ source: "evidence", sourceColumn: "placementId", target: "placements", description: "Placement-scoped evidence owner" },
	{ source: "compliance_gaps", sourceColumn: "profileId", target: "profiles", description: "Candidate with this gap" },
	{ source: "compliance_gaps", sourceColumn: "placementId", target: "placements", description: "Placement context for gap" },
	{ source: "compliance_gaps", sourceColumn: "complianceElementId", target: "compliance_elements", description: "Missing/expired requirement" },

	// Journey
	{ source: "pipelines", sourceColumn: "organisationId", target: "organisations", description: "Org that owns this pipeline" },
	{ source: "pipeline_stages", sourceColumn: "pipelineId", target: "pipelines", description: "Pipeline this stage belongs to" },
	{ source: "entity_stage_positions", sourceColumn: "pipelineId", target: "pipelines", description: "Which pipeline entity is in" },
	{ source: "entity_stage_positions", sourceColumn: "currentStageId", target: "pipeline_stages", description: "Current position in journey" },
	{ source: "stage_transitions", sourceColumn: "fromStageId", target: "pipeline_stages", description: "Stage transitioned from" },
	{ source: "stage_transitions", sourceColumn: "toStageId", target: "pipeline_stages", description: "Stage transitioned to" },

	// Operations
	{ source: "activities", sourceColumn: "organisationId", target: "organisations", description: "Org context for activity" },
	{ source: "escalations", sourceColumn: "organisationId", target: "organisations", description: "Org handling this escalation" },
	{ source: "escalations", sourceColumn: "profileId", target: "profiles", description: "Candidate this escalation concerns" },
	{ source: "escalations", sourceColumn: "complianceElementId", target: "compliance_elements", description: "Requirement that triggered escalation" },
	{ source: "escalation_options", sourceColumn: "escalationId", target: "escalations", description: "Escalation these options belong to" },
	{ source: "tasks", sourceColumn: "organisationId", target: "organisations", description: "Org that owns this task" },
];

// Helper to get relationship info for a specific FK column
export function getRelationshipInfo(tableName: string, columnName: string): Relationship | undefined {
	return relationships.find(r => r.source === tableName && r.sourceColumn === columnName);
}
