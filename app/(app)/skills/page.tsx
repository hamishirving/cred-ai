/**
 * Skill Library Page
 *
 * Displays all available skills as cards with Run button.
 */

import { getAllSerializedSkills } from "@/lib/ai/skills/registry";
import { SkillLibrary } from "./skill-library";

export default function SkillsPage() {
	const skills = getAllSerializedSkills();

	return (
		<div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
			<div>
				<h1 className="text-lg font-semibold">Skills</h1>
				<p className="text-sm text-muted-foreground">
					Autonomous AI agents for compliance automation.
				</p>
			</div>

			<SkillLibrary skills={skills} />
		</div>
	);
}
