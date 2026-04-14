import {
	getAllEvidenceKinds,
	getRequirementSourceAdapter,
} from "@/lib/requirement-compiler/adapters";
import type { ScenarioDefinition } from "@/lib/requirement-compiler/scenarios";
import type {
	CanonicalGraph,
	CompilerPhase,
	CompilerRunResult,
	DiagnosticFinding,
	DiagnosticsReport,
	PlacementContext,
	ProjectionOutput,
	ProjectionPathProgress,
	ProjectionRequirement,
	ProseEnrichment,
	RequirementSourceAdapter,
} from "@/lib/requirement-compiler/types";

function buildDiagnosticsReport(
	findings: DiagnosticFinding[],
	phase: CompilerPhase,
): DiagnosticsReport {
	const visible = findings.filter(
		(finding) =>
			!finding.visibleInPhase || finding.visibleInPhase.includes(phase),
	);
	return {
		findings: visible,
		summary: {
			total: visible.length,
			covered: visible.filter(
				(finding) => finding.canonicalModelStatus === "Covered",
			).length,
			partial: visible.filter(
				(finding) => finding.canonicalModelStatus === "Partial",
			).length,
			gaps: visible.filter((finding) => finding.canonicalModelStatus === "Gap")
				.length,
			workarounds: visible.filter(
				(finding) => finding.canonicalModelStatus === "Workaround",
			).length,
		},
	};
}

function buildDefaultPathProgress(graph: CanonicalGraph) {
	const progressByRequirement = new Map<string, ProjectionPathProgress[]>();

	for (const requirement of graph.requirements) {
		progressByRequirement.set(
			requirement.requirementId,
			requirement.satisfactionRule.paths.map((path) => ({
				pathId: path.pathId,
				label: path.label,
				completionState: "not_started",
				completedSteps: 0,
				totalSteps: path.steps.length,
				nextStepLabel: path.steps[0]?.label,
			})),
		);
	}

	return progressByRequirement;
}

function projectCanonicalGraph(
	graph: CanonicalGraph,
	scenario: ScenarioDefinition,
	placementContextId: string,
): ProjectionOutput {
	const overridesForContext =
		scenario.projectionOverrides[placementContextId] ?? {};
	const defaultProgress = buildDefaultPathProgress(graph);

	const requirements: ProjectionRequirement[] = graph.requirements.map(
		(requirement) => {
			const override = overridesForContext[requirement.requirementId];
			const followOnAvailable = requirement.satisfactionRule.paths.some(
				(path) => (path.dependencyEdges?.length ?? 0) > 0,
			);
			const evidenceKinds = getAllEvidenceKinds(requirement);

			return {
				requirementId: requirement.requirementId,
				title: requirement.title,
				scope: requirement.scope,
				requirementState: override?.requirementState ?? "not_started",
				applicabilityStatus: override?.applicabilityStatus ?? "required",
				followOnStatus:
					override?.followOnStatus ??
					(followOnAvailable ? "available" : "none"),
				pathProgress:
					override?.pathProgress ??
					defaultProgress.get(requirement.requirementId) ??
					[],
				evidenceExpectations: {
					profileScoped: requirement.scope === "profile" ? evidenceKinds : [],
					placementScoped:
						requirement.scope === "placement" ? evidenceKinds : [],
				},
			};
		},
	);

	return {
		placementContext: graph.placementContext,
		requirements,
		summary: {
			totalRequirements: requirements.length,
			profileScoped: requirements.filter(
				(requirement) => requirement.scope === "profile",
			).length,
			placementScoped: requirements.filter(
				(requirement) => requirement.scope === "placement",
			).length,
			withFollowOns: requirements.filter(
				(requirement) => requirement.followOnStatus !== "none",
			).length,
			notDue: requirements.filter(
				(requirement) => requirement.applicabilityStatus === "not_due",
			).length,
		},
	};
}

export function runRequirementCompiler<TPayload>({
	scenario,
	rawPayload,
	placementContextId,
	placementContextOverride,
	phase = "prose",
	proseEnrichment,
}: {
	scenario: ScenarioDefinition<TPayload>;
	rawPayload: TPayload;
	placementContextId: string;
	placementContextOverride?: PlacementContext;
	phase?: CompilerPhase;
	proseEnrichment?: ProseEnrichment | null;
}): CompilerRunResult {
	const adapter = getRequirementSourceAdapter(scenario.sourceType) as
		| RequirementSourceAdapter<TPayload>
		| undefined;

	if (!adapter) {
		throw new Error(
			`No compiler adapter found for source type ${scenario.sourceType}.`,
		);
	}

	const placementContextEntry =
		scenario.placementContexts.find(
			(option) => option.id === placementContextId,
		) ?? scenario.placementContexts[0];

	if (!placementContextEntry) {
		throw new Error(
			`Scenario ${scenario.id} does not define a placement context.`,
		);
	}

	const effectiveContext: PlacementContext =
		placementContextOverride ?? placementContextEntry.context;

	const canonicalGraph = adapter.compileToCanonicalGraph(
		rawPayload,
		scenario,
		effectiveContext,
		{ phase, proseEnrichment: phase === "prose" ? proseEnrichment : null },
	);
	const projection = projectCanonicalGraph(
		canonicalGraph,
		scenario,
		placementContextEntry.id,
	);
	const diagnostics = buildDiagnosticsReport(
		scenario.diagnosticFindings,
		phase,
	);

	return {
		canonicalGraph,
		projection,
		diagnostics,
	};
}
