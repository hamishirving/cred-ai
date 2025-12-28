/**
 * CandidateSkill - Candidate's attained skill.
 *
 * @description Link candidate to skill via compliance evidence
 * @purpose Skill profiles for workforce matching
 * @see DATA_MODEL.md#candidateskill
 */
import {
	boolean,
	jsonb,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { skills } from "./skills";
import { complianceElements } from "./compliance-elements";
import { organisations } from "./organisations";

/**
 * CandidateSkills link candidates to skills they have attained.
 *
 * Skills are evidenced by compliance elements - when a candidate
 * completes a training requirement, they gain the associated skills.
 * Status is derived from the compliance element status.
 */
export const candidateSkills = pgTable("candidate_skills", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** The candidate who has this skill */
	profileId: uuid("profile_id")
		.notNull()
		.references(() => profiles.id),

	/** The skill they have */
	skillId: uuid("skill_id")
		.notNull()
		.references(() => skills.id),

	/** The compliance element that evidences this skill */
	complianceElementId: uuid("compliance_element_id")
		.notNull()
		.references(() => complianceElements.id),

	/** Status derived from compliance element (verified when element is compliant) */
	status: varchar("status", {
		enum: ["verified", "expired", "pending"],
	})
		.notNull()
		.default("pending"),

	/** Proficiency level if skill has levels */
	proficiencyLevel: varchar("proficiency_level"),

	/** Context where skill was gained/used (e.g., ["paediatric", "emergency"]) */
	context: jsonb("context").$type<string[]>(),

	/** When the skill was acquired (from compliance element) */
	acquiredAt: timestamp("acquired_at"),

	/** When the skill expires (from compliance element) */
	expiresAt: timestamp("expires_at"),

	// Portability (future - credential marketplace)

	/** Organisation that provided/paid for the training */
	sourceOrganisationId: uuid("source_organisation_id").references(
		() => organisations.id
	),

	/** Whether this skill can be transferred to other orgs */
	isPortable: boolean("is_portable").notNull().default(false),

	/** When the skill was transferred (if applicable) */
	transferredAt: timestamp("transferred_at"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CandidateSkill = typeof candidateSkills.$inferSelect;
export type NewCandidateSkill = typeof candidateSkills.$inferInsert;
