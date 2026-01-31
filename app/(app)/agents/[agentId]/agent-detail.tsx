"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Play, Shield, Upload, Wrench, Zap, Loader2, CheckCircle2, Pencil } from "lucide-react";
import Link from "next/link";
import type { SerializedAgentDefinition } from "@/lib/ai/agents/types";

interface AgentDetailProps {
	agent: SerializedAgentDefinition;
}

export function AgentDetail({ agent }: AgentDetailProps) {
	const router = useRouter();
	const [formData, setFormData] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [uploadState, setUploadState] = useState<
		"idle" | "uploading" | "done" | "error"
	>("idle");
	const [uploadError, setUploadError] = useState("");
	const [uploadedFileName, setUploadedFileName] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	async function handleFileUpload(
		e: React.ChangeEvent<HTMLInputElement>,
		fieldKey: string,
	) {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploadState("uploading");
		setUploadError("");
		setUploadedFileName(file.name);

		try {
			const fd = new FormData();
			fd.append("file", file);

			const res = await fetch("/api/agents/upload", {
				method: "POST",
				body: fd,
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Upload failed");
			}

			const data = await res.json();
			setFormData((prev) => ({ ...prev, [fieldKey]: data.url }));
			setUploadState("done");
		} catch (err) {
			setUploadState("error");
			setUploadError(err instanceof Error ? err.message : "Upload failed");
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsSubmitting(true);

		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(formData)) {
			if (value) params.set(key, value);
		}

		router.push(`/agents/${agent.id}/execute?${params.toString()}`);
	}

	return (
		<>
			<div className="flex items-center justify-between">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/agents">
						<ArrowLeft className="size-3 mr-1" />
						Agents
					</Link>
				</Button>
				<Button variant="outline" size="sm" asChild>
					<Link href={`/agents/${agent.id}/edit`}>
						<Pencil className="size-3 mr-1" />
						Edit
					</Link>
				</Button>
			</div>

			<div>
				<h1 className="text-lg font-semibold">{agent.name}</h1>
				<p className="text-sm text-muted-foreground mt-1">
					{agent.description}
				</p>
			</div>

			{/* Metadata */}
			<div className="flex flex-wrap gap-2">
				<Badge variant="outline" className="gap-1">
					<Zap className="size-3" />
					{agent.trigger.type}
				</Badge>
				<Badge variant="outline" className="gap-1">
					<Shield className="size-3" />
					{agent.oversight.mode}
				</Badge>
				<Badge variant="outline" className="gap-1">
					<Wrench className="size-3" />
					{agent.tools.length} tools
				</Badge>
				<Badge variant="secondary">v{agent.version}</Badge>
			</div>

			{/* Tools */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Tools</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-1.5">
						{agent.tools.map((tool) => (
							<Badge key={tool} variant="secondary" className="text-xs">
								{tool}
							</Badge>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Input Form */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Run Agent</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="flex flex-col gap-3">
						{agent.inputFields.map((field) => {
							const isUrl = field.key.toLowerCase().includes("url");

							return (
								<div key={field.key} className="flex flex-col gap-1.5">
									<Label htmlFor={field.key} className="text-xs">
										{field.label}
										{field.required && (
											<span className="text-destructive ml-0.5">*</span>
										)}
									</Label>

									{isUrl ? (
										<div className="flex flex-col gap-2">
											<div
												className="flex items-center gap-2 p-3 border border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
												onClick={() => fileInputRef.current?.click()}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														fileInputRef.current?.click();
													}
												}}
												role="button"
												tabIndex={0}
											>
												<input
													ref={fileInputRef}
													type="file"
													accept="image/*,application/pdf"
													className="hidden"
													onChange={(e) =>
														handleFileUpload(e, field.key)
													}
												/>
												{uploadState === "uploading" ? (
													<>
														<Loader2 className="size-4 animate-spin text-muted-foreground" />
														<span className="text-xs text-muted-foreground">
															Uploading {uploadedFileName}...
														</span>
													</>
												) : uploadState === "done" ? (
													<>
														<CheckCircle2 className="size-4 text-green-600" />
														<span className="text-xs text-green-600">
															{uploadedFileName}
														</span>
													</>
												) : (
													<>
														<Upload className="size-4 text-muted-foreground" />
														<span className="text-xs text-muted-foreground">
															Upload certificate image or PDF
														</span>
													</>
												)}
											</div>

											{uploadState === "error" && (
												<p className="text-xs text-destructive">
													{uploadError}
												</p>
											)}

											<div className="flex items-center gap-2">
												<div className="h-px flex-1 bg-border" />
												<span className="text-xs text-muted-foreground">
													or paste URL
												</span>
												<div className="h-px flex-1 bg-border" />
											</div>

											<Input
												id={field.key}
												placeholder={field.description}
												value={formData[field.key] || ""}
												onChange={(e) =>
													setFormData((prev) => ({
														...prev,
														[field.key]: e.target.value,
													}))
												}
												className="text-sm"
											/>
										</div>
									) : (
										<Input
											id={field.key}
											placeholder={field.description}
											value={formData[field.key] || ""}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													[field.key]: e.target.value,
												}))
											}
											className="text-sm"
										/>
									)}
								</div>
							);
						})}

						<Button
							type="submit"
							size="sm"
							disabled={isSubmitting || uploadState === "uploading"}
						>
							<Play className="size-3 mr-1" />
							Execute
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Prompt Preview */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Agent Prompt</CardTitle>
				</CardHeader>
				<CardContent>
					<pre className="text-xs whitespace-pre-wrap text-muted-foreground bg-muted p-3 rounded-md">
						{agent.systemPrompt}
					</pre>
				</CardContent>
			</Card>
		</>
	);
}
