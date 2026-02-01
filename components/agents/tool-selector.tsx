"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ToolMeta {
	name: string;
	description: string;
}

interface ToolSelectorProps {
	selected: string[];
	onChange: (tools: string[]) => void;
	availableTools: ToolMeta[];
}

export function ToolSelector({ selected, onChange, availableTools }: ToolSelectorProps) {
	function toggle(toolName: string) {
		if (selected.includes(toolName)) {
			onChange(selected.filter((t) => t !== toolName));
		} else {
			onChange([...selected, toolName]);
		}
	}

	return (
		<div className="flex flex-col gap-1.5">
			{availableTools.map((tool) => (
				<div key={tool.name} className="flex items-center gap-2">
					<Checkbox
						id={`tool-${tool.name}`}
						checked={selected.includes(tool.name)}
						onCheckedChange={() => toggle(tool.name)}
					/>
					<Label
						htmlFor={`tool-${tool.name}`}
						className="text-xs cursor-pointer flex-1"
					>
						<span className="font-mono">{tool.name}</span>
						<span className="text-muted-foreground ml-1.5">
							— {tool.description}
						</span>
					</Label>
				</div>
			))}
		</div>
	);
}
