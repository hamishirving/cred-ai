export type RequirementScope = "profile" | "placement";

export type CanonicalProvenance =
	| "schema"
	| "prose-interpreted"
	| "live-llm"
	| "manual-review";

export type CompilerPhase = "schema" | "prose";

export type CanonicalCoverageStatus =
	| "Covered"
	| "Partial"
	| "Gap"
	| "Workaround";

export type ProductCoverageStatus =
	| "Covered in placements"
	| "Covered in flexible compliance"
	| "Partial"
	| "Gap"
	| "Only in working notes";

export type RecommendedAction =
	| "canonical model extension"
	| "product brief update"
	| "adapter mapping only"
	| "guidance, not rule"
	| "explicitly out of scope";

export type AudienceKey = "internal" | "worker" | "affiliate";

export interface SourceEnvelope {
	sourceType: string;
	scenarioId: string;
	scenarioName: string;
	description: string;
}

export interface PlacementContext {
	roleSlug: string;
	jurisdiction: string;
	facilityType: string;
	startDate: string;
	reviewDate?: string | null;
	isOpenEnded?: boolean;
}

export interface GuidanceByAudience {
	internal?: string | null;
	worker?: string | null;
	affiliate?: string | null;
}

export interface SourceRef {
	label: string;
	sourcePath: string;
	pointer?: string;
}

export interface CanonicalPredicate {
	predicateId: string;
	label: string;
	field: string;
	operator:
		| "equals"
		| "not_equals"
		| "in"
		| "contains"
		| "lt"
		| "lte"
		| "gt"
		| "gte"
		| "exists";
	value: string | number | boolean | string[];
}

export interface CanonicalValidityRule {
	type:
		| "within_days_of_start"
		| "within_months_of_start"
		| "annual_review"
		| "review_cadence"
		| "physical_expiry"
		| "not_due"
		| "window"
		| "content_requirement";
	description: string;
	value?: number;
	placementPredicates?: CanonicalPredicate[];
	provenance?: CanonicalProvenance;
	sourceQuote?: string;
}

export interface CanonicalResultPredicate extends CanonicalPredicate {
	outcome:
		| "satisfies_path"
		| "routes_to_alternative_path"
		| "requires_follow_on"
		| "review_only";
	provenance?: CanonicalProvenance;
	sourceQuote?: string;
}

export interface CanonicalDependencyEdge {
	edgeId: string;
	label: string;
	triggerStepId: string;
	triggerPredicateId: string;
	description: string;
	targetRequirementId?: string;
	targetPathId?: string;
	targetStepId?: string;
	provenance?: CanonicalProvenance;
}

export interface CanonicalStep {
	stepId: string;
	label: string;
	evidenceKinds: string[];
	required: boolean;
	resultPredicates?: CanonicalResultPredicate[];
	validityRules?: CanonicalValidityRule[];
	notes?: string[];
	sourceRefs?: SourceRef[];
	provenance?: CanonicalProvenance;
	sourceQuote?: string;
}

export interface CanonicalStepGroup {
	groupId: string;
	label: string;
	operator: "AND";
	stepIds: string[];
	description?: string;
	provenance?: CanonicalProvenance;
}

export interface CanonicalPath {
	pathId: string;
	label: string;
	description: string;
	steps: CanonicalStep[];
	stepGroups?: CanonicalStepGroup[];
	branchingType: "single-step" | "and-group" | "result-dependent";
	dependencyEdges?: CanonicalDependencyEdge[];
	sourceRefs?: SourceRef[];
	provenance?: CanonicalProvenance;
}

export type ConditionGroupOperator = "AND" | "OR";

export interface ConditionLeaf {
	kind: "leaf";
	step: CanonicalStep;
	provenance?: CanonicalProvenance;
}

export interface ConditionGroup {
	kind: "group";
	operator: ConditionGroupOperator;
	label?: string;
	description?: string;
	children: ConditionNode[];
	provenance?: CanonicalProvenance;
}

export type ConditionNode = ConditionLeaf | ConditionGroup;

export interface CanonicalRequirement {
	requirementId: string;
	title: string;
	category: string;
	scope: RequirementScope;
	satisfactionRule: {
		ruleKind: "single-path" | "multi-path";
		paths: CanonicalPath[];
		validityRules: CanonicalValidityRule[];
	};
	conditionTree?: ConditionNode;
	guidanceByAudience: GuidanceByAudience;
	sourceRefs: SourceRef[];
}

export interface CanonicalGraph {
	sourceEnvelope: SourceEnvelope;
	placementContext: PlacementContext;
	requirements: CanonicalRequirement[];
	guidance: {
		notes: string[];
	};
	provenance: {
		adapterId: string;
		compilationNotes: string[];
	};
}

export interface ProjectionPathProgress {
	pathId: string;
	label: string;
	completionState: "not_started" | "in_progress" | "complete" | "blocked";
	completedSteps: number;
	totalSteps: number;
	nextStepLabel?: string;
}

export interface ProjectionRequirement {
	requirementId: string;
	title: string;
	scope: RequirementScope;
	requirementState:
		| "not_started"
		| "in_progress"
		| "satisfied"
		| "blocked"
		| "waived";
	applicabilityStatus: "required" | "not_due" | "already_covered";
	followOnStatus: "none" | "available" | "triggered";
	pathProgress: ProjectionPathProgress[];
	evidenceExpectations: {
		profileScoped: string[];
		placementScoped: string[];
	};
}

export interface ProjectionOutput {
	placementContext: PlacementContext;
	requirements: ProjectionRequirement[];
	summary: {
		totalRequirements: number;
		profileScoped: number;
		placementScoped: number;
		withFollowOns: number;
		notDue: number;
	};
}

export interface DiagnosticFinding {
	id: string;
	sourceConcept: string;
	description: string;
	canonicalModelStatus: CanonicalCoverageStatus;
	productDirectionStatus: ProductCoverageStatus;
	reason: string;
	recommendedAction: RecommendedAction;
	credentiallyWorkaround?: string;
	visibleInPhase?: CompilerPhase[];
	sourceRefs: SourceRef[];
	canonicalRefs: string[];
	projectionRefs: string[];
}

export interface DiagnosticsReport {
	findings: DiagnosticFinding[];
	summary: {
		total: number;
		covered: number;
		partial: number;
		gaps: number;
		workarounds: number;
	};
}

export interface CompilerScenario<TPayload = unknown> {
	id: string;
	name: string;
	sourceType: string;
	description: string;
	defaultAudience: AudienceKey;
	placementContexts: Array<{
		id: string;
		label: string;
		context: PlacementContext;
	}>;
	rawPayload: TPayload;
}

export interface CompilerRunResult {
	canonicalGraph: CanonicalGraph;
	projection: ProjectionOutput;
	diagnostics: DiagnosticsReport;
}

export interface RequirementSourceAdapter<TPayload = unknown> {
	id: string;
	canHandle(sourceType: string): boolean;
	compileToCanonicalGraph(
		payload: TPayload,
		scenario: CompilerScenario<TPayload>,
		context: PlacementContext,
		options?: CompileOptions,
	): CanonicalGraph;
}

export interface CompileOptions {
	phase?: CompilerPhase;
	proseEnrichment?: ProseEnrichment | null;
}

export interface ProseEnrichmentStep {
	groupLabel: string;
	label: string;
	evidenceKinds: string[];
	validityRule?: {
		type: CanonicalValidityRule["type"];
		description: string;
		value?: number;
		sourceQuote?: string;
	};
	resultPredicate?: {
		label: string;
		field: string;
		operator: CanonicalResultPredicate["operator"];
		values: string[];
		outcome: CanonicalResultPredicate["outcome"];
		sourceQuote?: string;
	};
	notes?: string[];
	sourceQuote?: string;
}

export interface ProseEnrichmentGroup {
	groupLabel: string;
	branchingType: CanonicalPath["branchingType"];
	description: string;
	steps: ProseEnrichmentStep[];
	andGroup?: {
		label: string;
		stepLabels: string[];
	};
	dependencyEdges?: Array<{
		label: string;
		triggerStepLabel: string;
		description: string;
	}>;
}

export interface ProseEnrichment {
	source: "prefab" | "live-llm";
	generatedAt?: string;
	model?: string;
	inputTokens?: number;
	outputTokens?: number;
	groups: ProseEnrichmentGroup[];
	summary?: string;
}
