"use client";

import { SkillCard } from "@/components/skills/skill-card";
import type { SerializedSkillDefinition } from "@/lib/ai/skills/types";

interface SkillLibraryProps {
	skills: SerializedSkillDefinition[];
}

export function SkillLibrary({ skills }: SkillLibraryProps) {
	if (skills.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">No skills registered.</p>
		);
	}

	return (
		<div className="grid gap-3 sm:grid-cols-2">
			{skills.map((skill) => (
				<SkillCard key={skill.id} skill={skill} />
			))}
		</div>
	);
}
