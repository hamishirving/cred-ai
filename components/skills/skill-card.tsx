"use client";

import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Wrench, Shield, Zap } from "lucide-react";
import type { SerializedSkillDefinition } from "@/lib/ai/skills/types";

interface SkillCardProps {
	skill: SerializedSkillDefinition;
}

export function SkillCard({ skill }: SkillCardProps) {
	return (
		<Card className="flex flex-col">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="text-sm font-medium">
						{skill.name}
					</CardTitle>
					<Badge variant="secondary" className="text-xs shrink-0">
						v{skill.version}
					</Badge>
				</div>
				<CardDescription className="text-xs line-clamp-2">
					{skill.description}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2 pt-0 mt-auto">
				{/* Metadata badges */}
				<div className="flex flex-wrap gap-1">
					<Badge variant="outline" className="text-xs gap-1">
						<Zap className="size-2.5" />
						{skill.trigger.type}
					</Badge>
					<Badge variant="outline" className="text-xs gap-1">
						<Shield className="size-2.5" />
						{skill.oversight.mode}
					</Badge>
					<Badge variant="outline" className="text-xs gap-1">
						<Wrench className="size-2.5" />
						{skill.tools.length}
					</Badge>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-between pt-1">
					<Button variant="ghost" size="sm" className="text-xs" asChild>
						<Link href={`/skills/${skill.id}/executions`}>
							History
						</Link>
					</Button>
					<Button size="sm" asChild>
						<Link href={`/skills/${skill.id}`}>
							<Play className="size-3 mr-1" />
							Run
						</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
