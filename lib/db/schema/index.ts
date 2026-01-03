/**
 * Database Schema Index
 *
 * Re-exports all tables from domain-specific schema files.
 * This is the entry point for Drizzle ORM configuration.
 */

// ============================================
// Existing Playground Tables (Chat & Voice)
// ============================================
export * from "./chat";

// ============================================
// Credentially 2.0 Data Model
// ============================================

// Tenant & Structure Domain
export * from "./organisations";
export * from "./work-node-types";
export * from "./work-nodes";
export * from "./roles";
export * from "./user-roles";

// Compliance Domain
export * from "./compliance-elements";
export * from "./compliance-packages";
export * from "./package-elements";
export * from "./assignment-rules";

// Skills Domain (Micro-Credentialling)
export * from "./skill-frameworks";
export * from "./skill-categories";
export * from "./skills";
export * from "./candidate-skills";
export * from "./candidate-experiences";
export * from "./skill-requirements";

// People Domain
export * from "./profiles";

// Work Domain (ATS Expansion Path)
export * from "./jobs";
export * from "./applications";
export * from "./placements";

// Evidence Domain
export * from "./evidence";
export * from "./compliance-gaps";

// Journey Domain (Pipelines)
export * from "./pipelines";
export * from "./pipeline-stages";
export * from "./entity-stage-positions";
export * from "./stage-transitions";

// Operations Domain
export * from "./activities";
export * from "./escalations";
export * from "./escalation-options";
export * from "./tasks";
