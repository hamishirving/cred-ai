/**
 * Skill Registry
 *
 * Central registry of all skill definitions.
 * Skills are static config objects defined in code.
 */

import type { SkillDefinition, SerializedSkillDefinition } from "./types";
import { blsVerificationSkill } from "./definitions/bls-verification";

/** All registered skills */
const skills: Record<string, SkillDefinition> = {
	[blsVerificationSkill.id]: blsVerificationSkill,
};

/**
 * Get a skill definition by ID.
 */
export function getSkillDefinition(
	skillId: string,
): SkillDefinition | undefined {
	return skills[skillId];
}

/**
 * Get all registered skill definitions.
 */
export function getAllSkillDefinitions(): SkillDefinition[] {
	return Object.values(skills);
}

/**
 * Convert a SkillDefinition to a plain serialisable object
 * suitable for passing from server to client components.
 */
export function serializeSkill(
	skill: SkillDefinition,
): SerializedSkillDefinition {
	const schemaShape = skill.inputSchema.shape;
	const inputFields = Object.entries(schemaShape).map(([key, zodField]) => {
		const field = zodField as { description?: string; _def?: { typeName?: string } };
		return {
			key,
			label: key
				.replace(/([A-Z])/g, " $1")
				.replace(/^./, (s) => s.toUpperCase())
				.trim(),
			description: field.description || "",
			required: !field._def?.typeName?.includes("Optional"),
		};
	});

	return {
		id: skill.id,
		name: skill.name,
		description: skill.description,
		version: skill.version,
		systemPrompt: skill.systemPrompt,
		tools: skill.tools,
		inputFields,
		constraints: skill.constraints,
		trigger: skill.trigger,
		oversight: skill.oversight,
	};
}

/**
 * Get all skills as serialisable objects.
 */
export function getAllSerializedSkills(): SerializedSkillDefinition[] {
	return getAllSkillDefinitions().map(serializeSkill);
}
