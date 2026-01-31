/**
 * Skill Detail Page
 *
 * Shows skill definition + input form generated from inputSchema.
 */

import { notFound } from "next/navigation";
import { getSkillDefinition, serializeSkill } from "@/lib/ai/skills/registry";
import { SkillDetail } from "./skill-detail";

export default async function SkillDetailPage(props: {
	params: Promise<{ skillId: string }>;
}) {
	const params = await props.params;
	const skill = getSkillDefinition(params.skillId);

	if (!skill) {
		notFound();
	}

	return (
		<div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
			<SkillDetail skill={serializeSkill(skill)} />
		</div>
	);
}
