"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { TriggerConfig } from "@/components/agents/trigger-config";
import { ConditionBuilder } from "@/components/agents/condition-builder";
import { ToolSelector } from "@/components/agents/tool-selector";
import type { Agent } from "@/lib/db/schema/agents";
import type { AgentTrigger, AgentOversight, AgentConstraints, ConditionGroup } from "@/lib/db/schema/agents";

interface ToolMeta {
	name: string;
	description: string;
}

interface AgentEditorProps {
	agent: Agent;
	availableTools: ToolMeta[];
}

export function AgentEditor({ agent, availableTools }: AgentEditorProps) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Form state
	const [name, setName] = useState(agent.name);
	const [description, setDescription] = useState(agent.description);
	const [version, setVersion] = useState(agent.version);
	const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
	const [tools, setTools] = useState<string[]>(agent.tools);
	const [trigger, setTrigger] = useState<AgentTrigger>(agent.trigger);
	const [oversight, setOversight] = useState<AgentOversight>(agent.oversight);
	const [constraints, setConstraints] = useState<AgentConstraints>(agent.constraints);
	const [conditions, setConditions] = useState<ConditionGroup[]>(agent.conditions || []);

	async function handleSave() {
		setSaving(true);
		setError(null);

		try {
			const res = await fetch(`/api/agents/${agent.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					description,
					version,
					systemPrompt,
					tools,
					trigger,
					oversight,
					constraints,
					conditions: conditions.length > 0 ? conditions : null,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to save");
			}

			router.push(`/agents/${agent.code}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b">
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" asChild>
						<Link href={`/agents/${agent.code}`}>
							<ArrowLeft className="size-3 mr-1" />
							Back
						</Link>
					</Button>
					<h1 className="text-sm font-semibold">Edit Agent</h1>
				</div>
				<div className="flex items-center gap-2">
					{error && (
						<span className="text-xs text-destructive">{error}</span>
					)}
					<Button size="sm" onClick={handleSave} disabled={saving}>
						{saving ? (
							<Loader2 className="size-3 mr-1 animate-spin" />
						) : (
							<Save className="size-3 mr-1" />
						)}
						Save
					</Button>
				</div>
			</div>

			{/* Split layout */}
			<div className="flex flex-1 min-h-0">
				{/* Left panel — settings */}
				<div className="w-1/2 border-r overflow-y-auto p-4 flex flex-col gap-4">
					{/* Basic info */}
					<div className="flex flex-col gap-2">
						<div className="flex flex-col gap-1">
							<Label className="text-xs">Name</Label>
							<Input
								className="h-8 text-sm"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<Label className="text-xs">Description</Label>
							<Textarea
								className="text-xs min-h-[60px] resize-none"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<Label className="text-xs">Version</Label>
							<Input
								className="h-8 text-xs w-24"
								value={version}
								onChange={(e) => setVersion(e.target.value)}
							/>
						</div>
					</div>

					{/* Trigger */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs">Trigger</CardTitle>
						</CardHeader>
						<CardContent>
							<TriggerConfig trigger={trigger} onChange={setTrigger} />
						</CardContent>
					</Card>

					{/* Conditions */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs">Conditions</CardTitle>
						</CardHeader>
						<CardContent>
							<ConditionBuilder groups={conditions} onChange={setConditions} />
						</CardContent>
					</Card>

					{/* Oversight */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs">Oversight</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-col gap-1">
								<Label className="text-xs">Mode</Label>
								<Select
									value={oversight.mode}
									onValueChange={(v) =>
										setOversight({ mode: v as AgentOversight["mode"] })
									}
								>
									<SelectTrigger className="h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="auto" className="text-xs">Auto</SelectItem>
										<SelectItem value="review-before" className="text-xs">Review before</SelectItem>
										<SelectItem value="notify-after" className="text-xs">Notify after</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

					{/* Tools */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs">Tools</CardTitle>
						</CardHeader>
						<CardContent>
							<ToolSelector selected={tools} onChange={setTools} availableTools={availableTools} />
						</CardContent>
					</Card>

					{/* Constraints */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs">Constraints</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex gap-3">
								<div className="flex flex-col gap-1">
									<Label className="text-xs">Max steps</Label>
									<Input
										type="number"
										className="h-8 text-xs w-20"
										value={constraints.maxSteps}
										onChange={(e) =>
											setConstraints({
												...constraints,
												maxSteps: Number.parseInt(e.target.value) || 10,
											})
										}
									/>
								</div>
								<div className="flex flex-col gap-1">
									<Label className="text-xs">Timeout (ms)</Label>
									<Input
										type="number"
										className="h-8 text-xs w-28"
										value={constraints.maxExecutionTime}
										onChange={(e) =>
											setConstraints({
												...constraints,
												maxExecutionTime: Number.parseInt(e.target.value) || 60000,
											})
										}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Right panel — system prompt */}
				<div className="w-1/2 overflow-y-auto p-4 flex flex-col gap-2">
					<Label className="text-xs">System Prompt</Label>
					<Textarea
						className="flex-1 font-mono text-xs min-h-[500px] resize-none"
						value={systemPrompt}
						onChange={(e) => setSystemPrompt(e.target.value)}
					/>
				</div>
			</div>
		</div>
	);
}
