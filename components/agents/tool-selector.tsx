"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const AVAILABLE_TOOLS = [
	{ name: "classifyDocument", description: "Classify a document type" },
	{ name: "extractDocumentData", description: "Extract data from a document" },
	{ name: "browseAndVerify", description: "Browser automation for verification" },
	{ name: "getProfile", description: "Get candidate profile" },
	{ name: "getDocuments", description: "Get profile documents" },
	{ name: "updateDocumentStatus", description: "Update document status" },
	{ name: "createTask", description: "Create a task for human review" },
];

interface ToolSelectorProps {
	selected: string[];
	onChange: (tools: string[]) => void;
}

export function ToolSelector({ selected, onChange }: ToolSelectorProps) {
	function toggle(toolName: string) {
		if (selected.includes(toolName)) {
			onChange(selected.filter((t) => t !== toolName));
		} else {
			onChange([...selected, toolName]);
		}
	}

	return (
		<div className="flex flex-col gap-1.5">
			{AVAILABLE_TOOLS.map((tool) => (
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
