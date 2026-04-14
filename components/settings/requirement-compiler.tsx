"use client";

import {
	CheckCircle2,
	ChevronDown,
	Loader2,
	RefreshCw,
	Sparkles,
	Wrench,
} from "lucide-react";
import { useState } from "react";
import {
	CodeBlock,
	CodeBlockCopyButton,
} from "@/components/elements/code-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { runRequirementCompiler } from "@/lib/requirement-compiler/compiler";
import {
	compilerScenarios,
	getScenarioById,
} from "@/lib/requirement-compiler/scenarios";
import type {
	CanonicalProvenance,
	CanonicalRequirement,
	CanonicalStep,
	CompilerRunResult,
	ConditionGroup,
	ConditionNode,
	DiagnosticFinding,
	ProseEnrichment,
} from "@/lib/requirement-compiler/types";
import { cn } from "@/lib/utils";

function prettyJson(value: unknown) {
	return JSON.stringify(value, null, 2);
}

function stripHtml(value: string) {
	return value
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function humaniseToken(value: string) {
	return value.replace(/_/g, " ");
}

function getScenarioProse(
	scenario: { sourceType: string },
	parsedPayload: unknown,
): string | null {
	if (scenario.sourceType !== "medsol-protocol-builder") return null;
	if (!parsedPayload || typeof parsedPayload !== "object") return null;
	const raw = (parsedPayload as { msInternalinstructions?: string })
		.msInternalinstructions;
	if (!raw) return null;
	const stripped = stripHtml(raw);
	return stripped.length > 0 ? stripped : null;
}

function getScenarioGroupLabels(
	scenario: { sourceType: string },
	parsedPayload: unknown,
): string[] {
	if (scenario.sourceType !== "medsol-protocol-builder") return [];
	if (!parsedPayload || typeof parsedPayload !== "object") return [];
	const groups = (
		parsedPayload as { protocolAssetGroups?: Array<{ msName: string }> }
	).protocolAssetGroups;
	return groups?.map((g) => g.msName) ?? [];
}

export function RequirementCompiler() {
	const [selectedScenarioId, setSelectedScenarioId] = useState(
		compilerScenarios[0]?.id ?? "medsol-mmr",
	);
	const [rawJsonByScenario, setRawJsonByScenario] = useState(() =>
		Object.fromEntries(
			compilerScenarios.map((s) => [s.id, prettyJson(s.rawPayload)]),
		),
	);
	const [schemaCompiledByScenario, setSchemaCompiledByScenario] = useState<
		Record<string, boolean>
	>(() => Object.fromEntries(compilerScenarios.map((s) => [s.id, false])));
	const [liveExtractionByScenario, setLiveExtractionByScenario] = useState<
		Record<string, ProseEnrichment | null>
	>(() => Object.fromEntries(compilerScenarios.map((s) => [s.id, null])));
	const [extractionStatus, setExtractionStatus] = useState<
		"idle" | "running" | "error"
	>("idle");
	const [extractionError, setExtractionError] = useState<string | null>(null);

	const scenario = getScenarioById(selectedScenarioId) ?? compilerScenarios[0];
	const rawJson =
		rawJsonByScenario[scenario.id] ?? prettyJson(scenario.rawPayload);
	const schemaCompiled = schemaCompiledByScenario[scenario.id] ?? false;
	const liveExtraction = liveExtractionByScenario[scenario.id] ?? null;

	let parsedPayload: unknown = null;
	let parseError: string | null = null;
	try {
		parsedPayload = JSON.parse(rawJson);
	} catch (error) {
		parseError = error instanceof Error ? error.message : "Invalid JSON";
	}

	const scenarioProse = getScenarioProse(scenario, parsedPayload);
	const scenarioGroupLabels = getScenarioGroupLabels(scenario, parsedPayload);
	const hasProse = scenarioProse !== null;

	// Schema-phase compilation
	let schemaRun: CompilerRunResult | null = null;
	let schemaError: string | null = null;
	if (!parseError && schemaCompiled) {
		try {
			schemaRun = runRequirementCompiler({
				scenario,
				rawPayload: parsedPayload,
				placementContextId: scenario.placementContexts[0]?.id ?? "",
				phase: "schema",
			});
		} catch (error) {
			schemaError =
				error instanceof Error ? error.message : "Schema compilation failed.";
		}
	}

	// Prose-phase compilation (once LLM has run)
	let proseRun: CompilerRunResult | null = null;
	let proseError: string | null = null;
	if (!parseError && schemaCompiled && liveExtraction) {
		try {
			proseRun = runRequirementCompiler({
				scenario,
				rawPayload: parsedPayload,
				placementContextId: scenario.placementContexts[0]?.id ?? "",
				phase: "prose",
				proseEnrichment: liveExtraction,
			});
		} catch (error) {
			proseError =
				error instanceof Error ? error.message : "Prose compilation failed.";
		}
	}

	// Final output = prose run if available, else schema run
	const finalRun = proseRun ?? schemaRun;

	const updateRawJson = (value: string) => {
		setRawJsonByScenario((c) => ({ ...c, [scenario.id]: value }));
		setSchemaCompiledByScenario((c) => ({ ...c, [scenario.id]: false }));
		setLiveExtractionByScenario((c) => ({ ...c, [scenario.id]: null }));
	};

	const resetScenario = () => {
		setRawJsonByScenario((c) => ({
			...c,
			[scenario.id]: prettyJson(scenario.rawPayload),
		}));
		setSchemaCompiledByScenario((c) => ({ ...c, [scenario.id]: false }));
		setLiveExtractionByScenario((c) => ({ ...c, [scenario.id]: null }));
		setExtractionStatus("idle");
		setExtractionError(null);
	};

	const compileSchema = () => {
		setSchemaCompiledByScenario((c) => ({ ...c, [scenario.id]: true }));
	};

	const runLiveExtraction = async () => {
		if (!scenarioProse || scenarioGroupLabels.length === 0) return;
		setExtractionStatus("running");
		setExtractionError(null);
		try {
			const response = await fetch("/api/requirement-compiler/interpret", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sourceType: scenario.sourceType,
					displayName:
						(parsedPayload as { msDisplayname?: string })?.msDisplayname ??
						scenario.name,
					prose: scenarioProse,
					groupLabels: scenarioGroupLabels,
				}),
			});
			if (!response.ok) {
				const body = await response.json().catch(() => null);
				throw new Error(
					body?.error ?? `Extraction failed (HTTP ${response.status})`,
				);
			}
			const data = (await response.json()) as {
				extraction: { summary?: string; groups: ProseEnrichment["groups"] };
				usage: { inputTokens: number | null; outputTokens: number | null };
				model?: string;
				generatedAt?: string;
			};
			const enrichment: ProseEnrichment = {
				source: "live-llm",
				generatedAt: data.generatedAt,
				model: data.model,
				inputTokens: data.usage.inputTokens ?? undefined,
				outputTokens: data.usage.outputTokens ?? undefined,
				groups: data.extraction.groups,
				summary: data.extraction.summary,
			};
			setLiveExtractionByScenario((c) => ({
				...c,
				[scenario.id]: enrichment,
			}));
			setExtractionStatus("idle");
		} catch (error) {
			setExtractionError(
				error instanceof Error ? error.message : "Extraction failed.",
			);
			setExtractionStatus("error");
		}
	};

	return (
		<div className="flex flex-col gap-4">
			<Card className="border-border bg-secondary shadow-none">
				<CardHeader className="gap-2 p-3 pb-0">
					<div className="flex items-start justify-between gap-3">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<div className="rounded-md border border-primary/30 bg-card p-1.5 text-primary">
									<Wrench className="h-4 w-4" />
								</div>
								<CardTitle className="text-base font-semibold text-foreground">
									Requirement Compiler
								</CardTitle>
							</div>
							<CardDescription className="max-w-[72ch] text-xs">
								Takes a third-party protocol payload and walks through turning
								it into compliance requirements Credentially can track — step by
								step, so you can see what comes from the source schema and what
								gets inferred from prose instructions by AI.
							</CardDescription>
						</div>
						<Button
							size="sm"
							variant="outline"
							className="h-8 border-border bg-card text-xs"
							onClick={resetScenario}
						>
							<RefreshCw className="mr-1.5 h-3.5 w-3.5" />
							Reset
						</Button>
					</div>
				</CardHeader>
				<CardContent className="p-3">
					<div className="flex flex-wrap items-end gap-3">
						<div className="space-y-1.5">
							<div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
								Scenario
							</div>
							<Select
								value={scenario.id}
								onValueChange={(value) => {
									setSelectedScenarioId(value);
									setExtractionStatus("idle");
									setExtractionError(null);
								}}
							>
								<SelectTrigger className="h-8 w-[240px] bg-white text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{compilerScenarios.map((option) => (
										<SelectItem key={option.id} value={option.id}>
											{option.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex-1 text-xs text-muted-foreground">
							{scenario.description}
						</div>
					</div>
				</CardContent>
			</Card>

			<StepSection
				number={1}
				title="Source schema"
				subtitle="The raw JSON payload from the vendor. This is what comes in over the wire — no interpretation yet."
				status={schemaCompiled ? "done" : "ready"}
			>
				<div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
					<Card className="border-border bg-card shadow-none">
						<CardHeader className="flex-row items-center justify-between gap-2 p-3 pb-2">
							<CardTitle className="text-sm font-medium">
								Source payload
							</CardTitle>
							<Badge className="border-border bg-muted text-[10px] text-muted-foreground">
								JSON · editable
							</Badge>
						</CardHeader>
						<CardContent className="p-3 pt-0">
							<Textarea
								value={rawJson}
								onChange={(event) => updateRawJson(event.target.value)}
								className="min-h-[360px] resize-y border-border bg-card font-mono text-xs leading-5"
							/>
							{parseError ? (
								<div className="mt-2 rounded-md border border-negative/30 bg-negative-subtle p-2 text-[11px] text-negative-strong">
									{parseError}
								</div>
							) : null}
						</CardContent>
					</Card>

					<Card className="border-border bg-card shadow-none">
						<CardHeader className="p-3 pb-2">
							<CardTitle className="text-sm font-medium">
								Deterministic mapping
							</CardTitle>
							<CardDescription className="text-xs">
								Translates the schema fields directly. No prose is read. Asset
								GUIDs stay opaque — we only know there are N alternative paths
								and how many asset references each contains.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 p-3 pt-0">
							{!schemaCompiled ? (
								<Button
									size="sm"
									className="h-8 w-fit"
									onClick={compileSchema}
									disabled={Boolean(parseError)}
								>
									Map schema → requirements
								</Button>
							) : schemaError ? (
								<div className="rounded-md border border-negative/30 bg-negative-subtle p-2 text-[11px] text-negative-strong">
									{schemaError}
								</div>
							) : schemaRun ? (
								<SchemaResultSummary run={schemaRun} />
							) : null}
						</CardContent>
					</Card>
				</div>
			</StepSection>

			<StepSection
				number={2}
				title="Instruction prose"
				subtitle="The unstructured text instructions that came alongside the JSON. Click to ask AI to read these and produce structured rules."
				status={
					!schemaCompiled
						? "blocked"
						: !hasProse
							? "skipped"
							: liveExtraction
								? "done"
								: "ready"
				}
				disabled={!schemaCompiled}
			>
				{!schemaCompiled ? (
					<div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
						Run step 1 first — we need the schema mapping before we can attach
						rules to it.
					</div>
				) : !hasProse ? (
					<div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
						This scenario's payload is already structured — there are no prose
						instructions to interpret. Skip straight to step 3.
					</div>
				) : (
					<div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
						<Card className="border-border bg-card shadow-none">
							<CardHeader className="p-3 pb-2">
								<CardTitle className="text-sm font-medium">
									Instruction text
								</CardTitle>
								<CardDescription className="text-xs">
									From{" "}
									<code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
										msInternalinstructions
									</code>{" "}
									— the internal notes. The payload also carries traveller and
									affiliate variants; only internal is sent to the LLM.
								</CardDescription>
							</CardHeader>
							<CardContent className="p-3 pt-0">
								<div className="max-h-[300px] overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs leading-6 text-foreground">
									{scenarioProse}
								</div>
							</CardContent>
						</Card>

						<Card className="border-border bg-card shadow-none">
							<CardHeader className="p-3 pb-2">
								<CardTitle className="text-sm font-medium">
									AI extraction
								</CardTitle>
								<CardDescription className="text-xs">
									Sends the prose + group labels to Claude Sonnet 4.5 and asks
									for structured evidence kinds, validity rules, result
									predicates, and AND-groupings.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-3 p-3 pt-0">
								<Button
									size="sm"
									className="h-8 w-fit gap-1.5"
									onClick={runLiveExtraction}
									disabled={extractionStatus === "running"}
								>
									{extractionStatus === "running" ? (
										<Loader2 className="h-3.5 w-3.5 animate-spin" />
									) : (
										<Sparkles className="h-3.5 w-3.5" />
									)}
									{liveExtraction
										? "Re-extract rules with AI"
										: "Extract rules with AI"}
								</Button>
								{extractionStatus === "running" ? (
									<div className="text-[11px] text-muted-foreground">
										Calling the LLM — expect 10–30 seconds.
									</div>
								) : null}
								{extractionStatus === "error" && extractionError ? (
									<div className="rounded-md border border-negative/30 bg-negative-subtle p-2 text-[11px] text-negative-strong">
										{extractionError}
									</div>
								) : null}
								{liveExtraction ? (
									<LiveExtractionMeta enrichment={liveExtraction} />
								) : null}
							</CardContent>
						</Card>
					</div>
				)}
			</StepSection>

			<StepSection
				number={3}
				title="Compliance requirements"
				subtitle="Individual items Credentially would track. Each acceptance path becomes one requirement. Anything marked 'inferred' came from AI reading the prose — everything else is direct from the schema."
				status={
					!schemaCompiled ? "blocked" : liveExtraction ? "done" : "partial"
				}
				disabled={!schemaCompiled}
			>
				{!schemaCompiled ? (
					<div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
						Run step 1 first.
					</div>
				) : proseError ? (
					<div className="rounded-md border border-negative/30 bg-negative-subtle p-2 text-[11px] text-negative-strong">
						{proseError}
					</div>
				) : finalRun ? (
					<ComplianceRequirementsList
						run={finalRun}
						hasLiveExtraction={liveExtraction !== null}
					/>
				) : null}
			</StepSection>
		</div>
	);
}

// ============================================
// Step section wrapper
// ============================================

type StepStatus = "ready" | "running" | "done" | "partial" | "blocked" | "skipped";

function StepSection({
	number,
	title,
	subtitle,
	status,
	disabled,
	children,
}: {
	number: number;
	title: string;
	subtitle: string;
	status: StepStatus;
	disabled?: boolean;
	children: React.ReactNode;
}) {
	return (
		<Card
			className={cn(
				"border-border bg-card shadow-none",
				disabled && "opacity-70",
			)}
		>
			<CardHeader className="gap-1 p-3 pb-2">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-2.5">
						<span
							className={cn(
								"mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
								status === "done"
									? "bg-positive-subtle text-positive-strong"
									: status === "blocked" || status === "skipped"
										? "bg-muted text-muted-foreground"
										: "bg-primary/10 text-primary",
							)}
						>
							{status === "done" ? (
								<CheckCircle2 className="h-3.5 w-3.5" />
							) : (
								number
							)}
						</span>
						<div>
							<CardTitle className="text-sm font-semibold text-foreground">
								{title}
							</CardTitle>
							<CardDescription className="mt-0.5 max-w-[84ch] text-xs">
								{subtitle}
							</CardDescription>
						</div>
					</div>
					<StepStatusBadge status={status} />
				</div>
			</CardHeader>
			<CardContent className="p-3 pt-1">{children}</CardContent>
		</Card>
	);
}

function StepStatusBadge({ status }: { status: StepStatus }) {
	const label =
		status === "done"
			? "Complete"
			: status === "partial"
				? "Schema only"
				: status === "blocked"
					? "Waiting"
					: status === "skipped"
						? "Not applicable"
						: status === "running"
							? "Running"
							: "Ready";
	const className =
		status === "done"
			? "border-positive/30 bg-positive-subtle text-positive-strong"
			: status === "partial"
				? "border-warning/30 bg-warning-subtle text-warning-strong"
				: status === "blocked"
					? "border-border bg-muted text-muted-foreground"
					: status === "skipped"
						? "border-border bg-muted text-muted-foreground"
						: "border-primary/30 bg-primary/5 text-primary";
	return (
		<Badge
			variant="outline"
			className={cn("h-5 px-1.5 text-[10px]", className)}
		>
			{label}
		</Badge>
	);
}

// ============================================
// Step 1 result
// ============================================

function SchemaResultSummary({ run }: { run: CompilerRunResult }) {
	const requirements = run.canonicalGraph.requirements;
	const totalPaths = requirements.reduce(
		(acc, r) => acc + r.satisfactionRule.paths.length,
		0,
	);
	const totalAssetRefs = requirements.reduce(
		(acc, r) =>
			acc +
			r.satisfactionRule.paths.reduce(
				(pAcc, path) => pAcc + path.steps.length,
				0,
			),
		0,
	);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap gap-3">
				<SummaryStat label="Parent requirements" value={requirements.length} />
				<SummaryStat label="Acceptance paths" value={totalPaths} />
				<SummaryStat label="Opaque asset refs" value={totalAssetRefs} />
			</div>
			<div className="flex flex-col gap-2">
				{requirements.map((requirement) => (
					<div
						key={requirement.requirementId}
						className="rounded-md border border-border bg-muted/30 p-2"
					>
						<div className="flex items-center justify-between gap-2">
							<div className="text-xs font-medium text-foreground">
								{requirement.title}
							</div>
							<Badge
								variant="outline"
								className="h-4 px-1.5 text-[10px] capitalize"
							>
								{requirement.scope}
							</Badge>
						</div>
						<div className="mt-1.5 flex flex-col gap-1">
							{requirement.satisfactionRule.paths.map((path) => (
								<div
									key={path.pathId}
									className="flex items-center justify-between gap-2 text-[11px]"
								>
									<span className="text-foreground">{path.label}</span>
									<span className="text-muted-foreground">
										{path.steps.length} opaque ref
										{path.steps.length !== 1 ? "s" : ""}
									</span>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function SummaryStat({
	label,
	value,
}: {
	label: string;
	value: number | string;
}) {
	return (
		<div className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
			<div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
				{label}
			</div>
			<div className="font-mono text-sm font-semibold tabular-nums text-foreground">
				{value}
			</div>
		</div>
	);
}

function LiveExtractionMeta({
	enrichment,
}: {
	enrichment: ProseEnrichment;
}) {
	return (
		<div className="flex flex-col gap-1.5 rounded-md border border-positive/30 bg-positive-subtle p-2 text-[11px] text-positive-strong">
			<div className="flex items-center gap-1.5 font-medium">
				<CheckCircle2 className="h-3 w-3" />
				Extraction complete
			</div>
			<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-positive-strong/80">
				<span>Model: {enrichment.model ?? "claude-sonnet-4-5"}</span>
				{typeof enrichment.inputTokens === "number" ? (
					<span>
						{enrichment.inputTokens} in / {enrichment.outputTokens} out tokens
					</span>
				) : null}
				{enrichment.generatedAt ? (
					<span>
						{new Date(enrichment.generatedAt).toLocaleTimeString()}
					</span>
				) : null}
				<span>
					{enrichment.groups.length} group
					{enrichment.groups.length !== 1 ? "s" : ""} enriched
				</span>
			</div>
			{enrichment.summary ? (
				<div className="mt-0.5 text-positive-strong/90 italic">
					{enrichment.summary}
				</div>
			) : null}
		</div>
	);
}

// ============================================
// Step 3 — compliance requirements list
// ============================================

function ComplianceRequirementsList({
	run,
	hasLiveExtraction,
}: {
	run: CompilerRunResult;
	hasLiveExtraction: boolean;
}) {
	const requirements = run.canonicalGraph.requirements;
	const gapFindings = run.diagnostics.findings.filter(
		(f) =>
			f.canonicalModelStatus === "Gap" || f.productDirectionStatus === "Gap",
	);

	return (
		<div className="flex flex-col gap-3">
			{!hasLiveExtraction ? (
				<div className="rounded-md border border-warning/30 bg-warning-subtle p-2.5 text-[11px] leading-5 text-warning-strong">
					Showing schema-only output. Run step 2 to enrich these requirements
					with rules, evidence kinds, and predicates from the instruction
					prose.
				</div>
			) : null}

			{requirements.map((requirement) => (
				<RequirementCard
					key={requirement.requirementId}
					requirement={requirement}
				/>
			))}

			{gapFindings.length > 0 ? (
				<details className="group rounded-md border border-border bg-card">
					<summary className="flex cursor-pointer items-center justify-between gap-2 p-3 text-xs font-medium text-foreground hover:bg-muted/40">
						<span>
							Not yet expressible in Credentially ({gapFindings.length})
						</span>
						<ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
					</summary>
					<div className="flex flex-col gap-2 border-t border-border p-3">
						{gapFindings.map((finding) => (
							<GapRow key={finding.id} finding={finding} />
						))}
					</div>
				</details>
			) : null}

			<details className="group rounded-md border border-border bg-card">
				<summary className="flex cursor-pointer items-center justify-between gap-2 p-3 text-xs font-medium text-muted-foreground hover:text-foreground">
					<span>Inspect canonical graph (raw JSON)</span>
					<ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
				</summary>
				<ScrollArea className="h-[360px] border-t border-border">
					<CodeBlock
						code={prettyJson(run.canonicalGraph)}
						language="json"
						className="rounded-none border-0"
					>
						<CodeBlockCopyButton className="h-7 w-7" />
					</CodeBlock>
				</ScrollArea>
			</details>
		</div>
	);
}

function RequirementCard({
	requirement,
}: {
	requirement: CanonicalRequirement;
}) {
	const paths = requirement.satisfactionRule.paths;
	const ruleKind = requirement.satisfactionRule.ruleKind;

	return (
		<div className="rounded-lg border border-border bg-card p-3">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<div className="text-sm font-semibold text-foreground">
							{requirement.title}
						</div>
						<Badge
							variant="outline"
							className="h-4 px-1.5 text-[10px] capitalize"
						>
							{requirement.scope}
						</Badge>
						{ruleKind === "multi-path" ? (
							<Badge
								variant="outline"
								className="h-4 px-1.5 text-[10px] border-warning/30 bg-warning-subtle text-warning-strong"
							>
								any of {paths.length} paths satisfies
							</Badge>
						) : null}
					</div>
					<div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
						{requirement.requirementId}
					</div>
				</div>
			</div>

			{requirement.conditionTree ? (
				<div className="mt-3">
					<ConditionTreeRenderer node={requirement.conditionTree} depth={0} />
				</div>
			) : null}

			{(() => {
				const allEdges = paths.flatMap((p) => p.dependencyEdges ?? []);
				if (allEdges.length === 0) return null;
				return (
					<div className="mt-3 rounded-md border border-warning/30 bg-warning-subtle p-2 text-[11px] leading-5 text-warning-strong">
						<div className="mb-1 font-medium">
							Follow-on dependencies ({allEdges.length})
						</div>
						{allEdges.map((edge) => (
							<div
								key={edge.edgeId}
								className="flex flex-wrap items-center gap-1.5"
							>
								<span>
									<span className="font-medium">{edge.label}:</span>{" "}
									{edge.description}
								</span>
								<ProvenanceChip provenance={edge.provenance} />
							</div>
						))}
					</div>
				);
			})()}
		</div>
	);
}

const MAX_TREE_DEPTH_VISIBLE = 3;

function ConditionTreeRenderer({
	node,
	depth,
}: {
	node: ConditionNode;
	depth: number;
}) {
	if (node.kind === "leaf") {
		return <StepRow step={node.step} />;
	}
	return <ConditionGroupBlock group={node} depth={depth} />;
}

function ConditionGroupBlock({
	group,
	depth,
}: {
	group: ConditionGroup;
	depth: number;
}) {
	const isOr = group.operator === "OR";
	const isLeafGroup = group.children.every((c) => c.kind === "leaf");
	const operatorClasses = isOr
		? "border-warning/30 bg-warning-subtle text-warning-strong"
		: "border-primary/30 bg-primary/10 text-primary";
	const explainer = isOr
		? `Any one of the ${group.children.length} children satisfies this group`
		: `All ${group.children.length} children must be satisfied`;

	// At depth >= MAX_TREE_DEPTH_VISIBLE, render compact (no nested indent panel)
	const compact = depth >= MAX_TREE_DEPTH_VISIBLE;

	return (
		<div
			className={cn(
				"rounded-md border bg-card",
				compact ? "border-dashed border-border p-2" : "border-border p-2.5",
			)}
		>
			<div className="flex flex-wrap items-center gap-2">
				<span
					className={cn(
						"inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
						operatorClasses,
					)}
				>
					{group.operator}
				</span>
				{group.label ? (
					<span className="text-xs font-medium text-foreground">
						{group.label}
					</span>
				) : null}
				<span className="text-[10px] text-muted-foreground">{explainer}</span>
				<ProvenanceChip provenance={group.provenance} />
			</div>
			{group.description && depth === 0 ? (
				<div className="mt-1 text-[11px] text-muted-foreground">
					{group.description}
				</div>
			) : null}

			<div
				className={cn(
					"mt-2 flex flex-col gap-1.5",
					!compact &&
						"border-l-2 pl-2.5 " +
							(isOr
								? "border-l-warning/40"
								: "border-l-primary/40"),
				)}
			>
				{group.children.map((child, index) => (
					<div
						key={`${depth}-${index}`}
						className="flex flex-col gap-1.5"
					>
						{index > 0 ? (
							<div className="flex items-center gap-2">
								<div className="h-px flex-1 bg-border" />
								<span
									className={cn(
										"text-[9px] font-semibold uppercase tracking-wider",
										isOr ? "text-warning-strong" : "text-primary",
									)}
								>
									{group.operator}
								</span>
								<div className="h-px flex-1 bg-border" />
							</div>
						) : null}
						<ConditionTreeRenderer node={child} depth={depth + 1} />
					</div>
				))}
			</div>

			{isLeafGroup && depth === 0 && group.children.length === 1 ? null : null}
		</div>
	);
}

function ruleTypeLabel(
	type: CanonicalRequirement["satisfactionRule"]["paths"][number]["steps"][number]["validityRules"] extends
		| (infer R)[]
		| undefined
		? R extends { type: infer T }
			? T
			: never
		: never,
): string {
	switch (type) {
		case "within_days_of_start":
		case "within_months_of_start":
		case "window":
			return "Timing";
		case "annual_review":
		case "review_cadence":
			return "Review";
		case "physical_expiry":
			return "Expiry";
		case "content_requirement":
			return "Format";
		default:
			return "Rule";
	}
}

function StepRow({
	step,
}: {
	step: CanonicalRequirement["satisfactionRule"]["paths"][number]["steps"][number];
}) {
	const visibleRules =
		step.validityRules?.filter((rule) => rule.type !== "not_due") ?? [];

	return (
		<div className="rounded-md border border-border bg-card p-2 text-xs">
			<div className="flex flex-wrap items-center gap-1.5">
				<span className="font-medium text-foreground">{step.label}</span>
				<ProvenanceChip provenance={step.provenance} />
			</div>
			{step.sourceQuote ? <SourceQuote text={step.sourceQuote} /> : null}

			<div className="mt-1.5 flex flex-col gap-1">
				{step.evidenceKinds.length > 0 ? (
					<Row label="Evidence">
						{step.evidenceKinds.map((kind) => (
							<Badge
								key={kind}
								variant="outline"
								className="h-4 px-1.5 text-[10px] font-normal"
							>
								{humaniseToken(kind)}
							</Badge>
						))}
					</Row>
				) : step.notes?.some((n) => n.startsWith("GUID:")) ? (
					<Row label="Ref">
						{step.notes
							?.filter((n) => n.startsWith("GUID:"))
							.map((note) => (
								<span
									key={note}
									className="font-mono text-[10px] text-muted-foreground"
								>
									{note.replace("GUID: ", "")}
								</span>
							))}
					</Row>
				) : null}

				{visibleRules.map((rule) => (
					<div
						key={`${rule.type}-${rule.description}`}
						className="flex flex-col gap-0.5"
					>
						<Row label={ruleTypeLabel(rule.type)}>
							<span className="text-foreground">{rule.description}</span>
							<ProvenanceChip provenance={rule.provenance} />
						</Row>
						{rule.sourceQuote ? <SourceQuote text={rule.sourceQuote} /> : null}
					</div>
				))}

				{step.resultPredicates?.map((predicate) => (
					<div key={predicate.predicateId} className="flex flex-col gap-0.5">
						<Row label="If result">
							<span className="font-mono text-[10px] text-muted-foreground">
								{predicate.field} {predicate.operator}{" "}
								{Array.isArray(predicate.value)
									? predicate.value.join(" / ")
									: String(predicate.value)}
							</span>
							<span className="text-muted-foreground">
								→ {humaniseToken(predicate.outcome)}
							</span>
							<ProvenanceChip provenance={predicate.provenance} />
						</Row>
						{predicate.sourceQuote ? (
							<SourceQuote text={predicate.sourceQuote} />
						) : null}
					</div>
				))}
			</div>
		</div>
	);
}

function SourceQuote({ text }: { text: string }) {
	return (
		<div className="ml-[72px] flex items-start gap-1.5 text-[10px] italic leading-5 text-muted-foreground">
			<span className="mt-0.5">↳</span>
			<span>from prose: "{text}"</span>
		</div>
	);
}

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-center gap-1.5 text-[11px]">
			<span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground min-w-[64px]">
				{label}
			</span>
			<span className="flex flex-wrap items-center gap-1.5">{children}</span>
		</div>
	);
}

function GapRow({ finding }: { finding: DiagnosticFinding }) {
	return (
		<div className="rounded-md border border-negative/30 bg-negative-subtle p-2 text-[11px] leading-5 text-negative-strong">
			<div className="font-medium text-foreground">{finding.sourceConcept}</div>
			<div className="mt-0.5 text-muted-foreground">{finding.description}</div>
			{finding.credentiallyWorkaround ? (
				<div className="mt-1 text-negative-strong">
					<span className="font-medium">Credentially today:</span>{" "}
					{finding.credentiallyWorkaround}
				</div>
			) : null}
		</div>
	);
}

function ProvenanceChip({
	provenance,
}: {
	provenance: CanonicalProvenance | undefined;
}) {
	if (!provenance || provenance === "schema") return null;
	const label =
		provenance === "live-llm"
			? "AI inferred"
			: provenance === "manual-review"
				? "reviewed"
				: "inferred";
	const classes =
		provenance === "live-llm"
			? "border-primary/30 bg-primary/10 text-primary"
			: provenance === "manual-review"
				? "border-positive/30 bg-positive-subtle text-positive-strong"
				: "border-warning/30 bg-warning-subtle text-warning-strong";
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-sm border px-1 py-0 text-[9px] font-medium uppercase tracking-wide",
				classes,
			)}
		>
			{label}
		</span>
	);
}
