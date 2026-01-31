/**
 * Skill Executions History Page
 *
 * Shows past executions for a skill with status, duration, and token usage.
 */

import { notFound } from "next/navigation";
import { getSkillDefinition } from "@/lib/ai/skills/registry";
import { getSkillExecutionsBySkillId } from "@/lib/db/queries";
import { ExecutionHistory } from "./execution-history";

export default async function SkillExecutionsPage(props: {
	params: Promise<{ skillId: string }>;
}) {
	const params = await props.params;
	const skill = getSkillDefinition(params.skillId);

	if (!skill) {
		notFound();
	}

	const executions = await getSkillExecutionsBySkillId({
		skillId: skill.id,
		limit: 50,
	});

	return (
		<div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
			<ExecutionHistory skill={skill} executions={executions} />
		</div>
	);
}
