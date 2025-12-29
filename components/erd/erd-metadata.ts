/**
 * ERD Metadata - Entity and relationship descriptions for tooltips.
 *
 * Used for hover tooltips and detail panels in the ERD visualisation.
 */

export interface EntityMeta {
  displayName: string;
  description: string;
  purpose: string;
  enables: string[];
}

export const entityMetadata: Record<string, EntityMeta> = {
  // Tenant & Structure
  organisations: {
    displayName: "Organisation",
    description: "Top-level tenant entity with hierarchy support",
    purpose: "Multi-tenant isolation with parent-child relationships",
    enables: [
      "Inherited settings from parent orgs",
      "Custom terminology per org",
      "Feature flags per org",
    ],
  },
  work_node_types: {
    displayName: "WorkNodeType",
    description: "User-defined hierarchy level types",
    purpose: "Define what levels exist in your structure (Hospital, Ward, etc.)",
    enables: [
      "Flexible hierarchy depth",
      "Custom level names per org",
      "Level-specific behaviours",
    ],
  },
  work_nodes: {
    displayName: "WorkNode",
    description: "Where work happens - unified location entity",
    purpose: "Replaces rigid Client/Facility/OrgUnit with flexible hierarchy",
    enables: [
      "Customer-defined hierarchy",
      "Jurisdiction-based compliance",
      "Multi-org visibility (MSP)",
    ],
  },
  roles: {
    displayName: "Role",
    description: "Job roles like 'Nurse', 'Doctor', 'Healthcare Assistant'",
    purpose: "Define roles that can be assigned to workers",
    enables: [
      "Role-based compliance packages",
      "Professional body links",
      "Custom fields per role",
    ],
  },

  // Compliance
  compliance_elements: {
    displayName: "ComplianceElement",
    description: "Individual requirement definition",
    purpose: "Define what needs to be checked (DBS, training, registration)",
    enables: [
      "Reusable requirement definitions",
      "Verification rules",
      "Skills granted on completion",
    ],
  },
  compliance_packages: {
    displayName: "CompliancePackage",
    description: "Bundle of requirements for a context",
    purpose: "Group requirements for roles, jurisdictions, or work types",
    enables: [
      "Template packages",
      "Jurisdiction variations",
      "Inheritance from parent packages",
    ],
  },
  package_elements: {
    displayName: "PackageElement",
    description: "Links elements to packages with overrides",
    purpose: "Compose packages from elements with custom settings",
    enables: [
      "Required vs optional items",
      "Expiry overrides per package",
      "Display ordering",
    ],
  },
  assignment_rules: {
    displayName: "AssignmentRule",
    description: "When packages apply automatically",
    purpose: "Auto-assign compliance based on conditions",
    enables: [
      "Role-based assignment",
      "Jurisdiction-based assignment",
      "WorkNode-based assignment",
    ],
  },

  // Skills
  skill_frameworks: {
    displayName: "SkillFramework",
    description: "Taxonomy template (e.g., UK Core Skills)",
    purpose: "Standard skill taxonomies that can be adopted",
    enables: [
      "Industry-standard frameworks",
      "Org customisation of templates",
      "Version control for frameworks",
    ],
  },
  skill_categories: {
    displayName: "SkillCategory",
    description: "Hierarchical skill grouping",
    purpose: "Organise skills into logical groups",
    enables: [
      "Nested categories (Clinical → Resuscitation → BLS)",
      "Framework templates",
      "Org-specific categories",
    ],
  },
  skills: {
    displayName: "Skill",
    description: "Individual skill or competency",
    purpose: "Define what someone can do",
    enables: [
      "Proficiency levels",
      "Verification requirements",
      "Expiry tracking",
    ],
  },
  candidate_skills: {
    displayName: "CandidateSkill",
    description: "Skill attributed to a candidate",
    purpose: "Track skills gained through compliance",
    enables: [
      "Auto-attribution from compliance",
      "Proficiency tracking",
      "Skill verification",
    ],
  },
  candidate_experiences: {
    displayName: "CandidateExperience",
    description: "Work environment experience",
    purpose: "Track where and what type of work performed",
    enables: [
      "Environment matching (ICU, Ward)",
      "Speciality tracking",
      "Recency scoring",
    ],
  },
  skill_requirements: {
    displayName: "SkillRequirement",
    description: "Skills needed for a job or shift",
    purpose: "Define skill requirements for work",
    enables: [
      "Skill-based matching",
      "Minimum proficiency levels",
      "Required vs preferred skills",
    ],
  },

  // People
  profiles: {
    displayName: "Profile",
    description: "Candidate/worker profile",
    purpose: "Central record for a person in the system",
    enables: [
      "Multi-org visibility",
      "Data ownership controls",
      "Professional registrations",
    ],
  },

  // Work
  jobs: {
    displayName: "Job",
    description: "Position or opening",
    purpose: "Define work opportunities",
    enables: [
      "Positions available tracking",
      "Compliance package assignment",
      "Skill requirements",
    ],
  },
  applications: {
    displayName: "Application",
    description: "Candidate applying for a job",
    purpose: "Track recruitment pipeline",
    enables: [
      "Application status tracking",
      "Cover letter storage",
      "Withdrawal handling",
    ],
  },
  placements: {
    displayName: "Placement",
    description: "Active work assignment",
    purpose: "Track where someone is working",
    enables: [
      "Compliance percentage tracking",
      "Date range management",
      "WorkNode assignment",
    ],
  },

  // Evidence
  evidence: {
    displayName: "Evidence",
    description: "Proof of compliance",
    purpose: "Store documents and data proving requirements met",
    enables: [
      "Document storage",
      "AI confidence scoring",
      "Consent tracking",
    ],
  },
  compliance_gaps: {
    displayName: "ComplianceGap",
    description: "Missing or expiring requirements",
    purpose: "Track what's outstanding for a placement",
    enables: [
      "Gap prioritisation",
      "Chase tracking",
      "Due date management",
    ],
  },

  // Journey
  pipelines: {
    displayName: "Pipeline",
    description: "Configurable journey",
    purpose: "Define workflows for onboarding, compliance, etc.",
    enables: [
      "Custom stage definitions",
      "Multiple pipelines per org",
      "Entity-type scoping",
    ],
  },
  pipeline_stages: {
    displayName: "PipelineStage",
    description: "Step in a pipeline",
    purpose: "Define stages entities move through",
    enables: [
      "Entry/exit rules",
      "Auto-advance conditions",
      "Escalation triggers",
    ],
  },
  entity_stage_positions: {
    displayName: "EntityStagePosition",
    description: "Current pipeline position",
    purpose: "Track where an entity is in its journey",
    enables: [
      "Current stage tracking",
      "Time-in-stage metrics",
      "Multi-pipeline support",
    ],
  },
  stage_transitions: {
    displayName: "StageTransition",
    description: "Movement between stages",
    purpose: "Audit trail of journey progress",
    enables: [
      "Transition history",
      "Actor tracking",
      "Reason capture",
    ],
  },

  // Operations
  activities: {
    displayName: "Activity",
    description: "Action log entry",
    purpose: "Track all system and user actions",
    enables: [
      "Full audit trail",
      "Actor attribution",
      "Polymorphic entity linking",
    ],
  },
  escalations: {
    displayName: "Escalation",
    description: "Human decision needed",
    purpose: "Queue items requiring human review",
    enables: [
      "Priority ordering",
      "Assignment to users",
      "Resolution tracking",
    ],
  },
  escalation_options: {
    displayName: "EscalationOption",
    description: "Available actions for escalation",
    purpose: "Define what choices are available",
    enables: [
      "Configurable actions",
      "Recommended options",
      "Action descriptions",
    ],
  },
};

// Helper to get metadata for a table
export function getEntityMeta(tableName: string): EntityMeta | undefined {
  return entityMetadata[tableName];
}
