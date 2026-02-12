"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
		<div className="flex h-full flex-col bg-background">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
						<Link href={`/agents/${agent.code}`}>
							<ArrowLeft className="size-3 mr-1" />
							Back
						</Link>
					</Button>
					<h1 className="text-2xl font-semibold text-foreground" style={{ textWrap: "balance" }}>
						Edit Agent
					</h1>
				</div>
				<div className="flex items-center gap-3">
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
			<div className="flex flex-1 min-h-0 px-6 py-6 gap-6">
				{/* Left panel — settings */}
				<div className="w-1/2 overflow-y-auto flex flex-col gap-4">
					{/* Basic info card */}
					<div className="space-y-4 rounded-lg border border-border bg-card p-5">
						<h2 className="text-base font-medium text-foreground">Basic Info</h2>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted-foreground">Name</label>
							<Input
								className="h-8 border-input text-sm"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted-foreground">Description</label>
							<Textarea
								className="min-h-[60px] resize-none border-input text-sm"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted-foreground">Version</label>
							<Input
								className="h-8 w-24 border-input text-sm"
								value={version}
								onChange={(e) => setVersion(e.target.value)}
							/>
						</div>
					</div>

					{/* Trigger card */}
					<div className="space-y-4 rounded-lg border border-border bg-card p-5">
						<h2 className="text-base font-medium text-foreground">Trigger</h2>
						<TriggerConfig trigger={trigger} onChange={setTrigger} />
					</div>

					{/* Conditions card */}
					<div className="space-y-4 rounded-lg border border-border bg-card p-5">
						<h2 className="text-base font-medium text-foreground">Conditions</h2>
						<ConditionBuilder groups={conditions} onChange={setConditions} />
					</div>

					{/* Oversight card */}
					<div className="space-y-4 rounded-lg border border-border bg-card p-5">
						<h2 className="text-base font-medium text-foreground">Oversight</h2>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted-foreground">Mode</label>
							<Select
								value={oversight.mode}
								onValueChange={(v) =>
									setOversight({ mode: v as AgentOversight["mode"] })
								}
							>
								<SelectTrigger className="h-8 border-input text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="auto" className="text-sm">Auto</SelectItem>
									<SelectItem value="review-before" className="text-sm">Review before</SelectItem>
									<SelectItem value="notify-after" className="text-sm">Notify after</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Tools card */}
					<div className="space-y-4 rounded-lg border border-border bg-card p-5">
						<h2 className="text-base font-medium text-foreground">Tools</h2>
						<ToolSelector selected={tools} onChange={setTools} availableTools={availableTools} />
					</div>

					{/* Constraints card */}
					<div className="space-y-4 rounded-lg border border-border bg-card p-5">
						<h2 className="text-base font-medium text-foreground">Constraints</h2>
						<div className="flex gap-3">
							<div className="flex flex-col gap-1.5">
								<label className="text-xs font-medium text-muted-foreground">Max steps</label>
								<Input
									type="number"
									className="h-8 w-20 border-input text-sm"
									value={constraints.maxSteps}
									onChange={(e) =>
										setConstraints({
											...constraints,
											maxSteps: Number.parseInt(e.target.value) || 10,
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label className="text-xs font-medium text-muted-foreground">Timeout (ms)</label>
								<Input
									type="number"
									className="h-8 w-28 border-input text-sm"
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
					</div>
				</div>

				{/* Right panel — system prompt */}
				<div className="w-1/2 flex flex-col min-h-0">
					<div className="flex min-h-0 flex-1 flex-col gap-4 rounded-lg border border-border bg-card p-5">
						<h2 className="text-base font-medium text-foreground">System Prompt</h2>
						<Textarea
							className="min-h-[500px] flex-1 resize-none border-input font-mono text-sm"
							value={systemPrompt}
							onChange={(e) => setSystemPrompt(e.target.value)}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
