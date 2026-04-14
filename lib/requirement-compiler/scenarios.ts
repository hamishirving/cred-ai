import medsolHepBPayload from "@/lib/requirement-compiler/fixtures/medsol-hep-b.json";
import medsolMmrPayload from "@/lib/requirement-compiler/fixtures/medsol-mmr.json";
import medsolTbPayload from "@/lib/requirement-compiler/fixtures/medsol-tb.json";
import txmBaselinePayload from "@/lib/requirement-compiler/fixtures/txm-baseline.json";
import type {
	MedsolConditionalAssetPayload,
	TxmRequirementPayload,
} from "@/lib/requirement-compiler/source-types";
import type {
	CompilerScenario,
	DiagnosticFinding,
	ProjectionPathProgress,
} from "@/lib/requirement-compiler/types";

export interface RequirementProjectionOverride {
	requirementState:
		| "not_started"
		| "in_progress"
		| "satisfied"
		| "blocked"
		| "waived";
	applicabilityStatus: "required" | "not_due" | "already_covered";
	followOnStatus: "none" | "available" | "triggered";
	pathProgress: ProjectionPathProgress[];
}

export interface ScenarioDefinition<TPayload = unknown>
	extends CompilerScenario<TPayload> {
	projectionOverrides: Record<
		string,
		Record<string, RequirementProjectionOverride>
	>;
	diagnosticFindings: DiagnosticFinding[];
}

const medsolSourcePath = "lib/requirement-compiler/fixtures";

export const medsolMmrScenario: ScenarioDefinition<MedsolConditionalAssetPayload> =
	{
		id: "medsol-mmr",
		name: "MedSol MMR",
		sourceType: "medsol-protocol-builder",
		description:
			"MedSol's MMR protocol is one requirement with four alternative paths (vaccine series, positive titer, or negative/equivocal titer followed by booster OR declination). It's the sharpest example of where MedSol's expressive model exceeds what Credentially's flat package model can capture — specifically around result-dependent routing off titer values.",
		defaultAudience: "internal",
		rawPayload: medsolMmrPayload,
		placementContexts: [
			{
				id: "standard-placement",
				label: "Standard placement",
				context: {
					roleSlug: "travel-rn",
					jurisdiction: "texas",
					facilityType: "dialysis-clinic",
					startDate: "2026-02-23",
				},
			},
		],
		projectionOverrides: {
			"standard-placement": {
				"medsol-mmr-results": {
					requirementState: "in_progress",
					applicabilityStatus: "required",
					followOnStatus: "available",
					pathProgress: [
						{
							pathId: "medsol-mmr-results-mmr-vaccines",
							label: "MMR Vaccines",
							completionState: "not_started",
							completedSteps: 0,
							totalSteps: 1,
							nextStepLabel: "Two vaccines 28 days apart",
						},
						{
							pathId: "medsol-mmr-results-mmr-positive-titer",
							label: "MMR Positive Titer",
							completionState: "complete",
							completedSteps: 1,
							totalSteps: 1,
						},
						{
							pathId:
								"medsol-mmr-results-mmr-negative-equivocal-titer-with-booster",
							label: "MMR Negative/Equivocal Titer with Booster",
							completionState: "in_progress",
							completedSteps: 1,
							totalSteps: 2,
							nextStepLabel: "Booster vaccine after titer",
						},
						{
							pathId:
								"medsol-mmr-results-mmr-negative-equivocal-titer-with-declination",
							label: "MMR Negative/Equivocal Titer with Declination",
							completionState: "not_started",
							completedSteps: 0,
							totalSteps: 2,
							nextStepLabel: "Negative or equivocal titer",
						},
					],
				},
			},
		},
		diagnosticFindings: [
			{
				id: "mmr-evidence-taxonomy",
				visibleInPhase: ["prose"],
				sourceConcept: "Evidence kinds (vaccination record, lab titer, declination form)",
				description:
					"Each MMR path asks for a standard evidence kind that Credentially already carries in its evidence type enum.",
				canonicalModelStatus: "Covered",
				productDirectionStatus: "Covered in placements",
				reason:
					"vaccination_record, lab_titer and declination_form all map cleanly onto existing evidenceType slots used by the Packages tab.",
				recommendedAction: "adapter mapping only",
				sourceRefs: [
					{
						label: "MMR groups",
						sourcePath: `${medsolSourcePath}/medsol-mmr.json`,
						pointer: "protocolAssetGroups",
					},
				],
				canonicalRefs: ["requirements[0].satisfactionRule.paths[*].steps[*].evidenceKinds"],
				projectionRefs: ["requirements[0].evidenceExpectations"],
			},
			{
				id: "mmr-global-scope",
				visibleInPhase: ["schema", "prose"],
				sourceConcept: "Global conditional (applies across placements)",
				description:
					"msIsglobal=true means this rule follows the worker, not a specific assignment.",
				canonicalModelStatus: "Covered",
				productDirectionStatus: "Covered in placements",
				reason:
					"Global conditionals land cleanly as a Conditional package that Credentially can assign across roles or facilities.",
				recommendedAction: "adapter mapping only",
				sourceRefs: [
					{
						label: "Global flag",
						sourcePath: `${medsolSourcePath}/medsol-mmr.json`,
						pointer: "msIsglobal",
					},
				],
				canonicalRefs: ["requirements[0].scope"],
				projectionRefs: ["requirements[0]"],
			},
			{
				id: "mmr-multi-path-or",
				visibleInPhase: ["schema", "prose"],
				sourceConcept: "Multi-path OR acceptance (any of four paths satisfies)",
				description:
					"MedSol says MMR is met by any one of: two vaccines 28d apart, a positive IGG titer, or a negative/equivocal titer plus booster OR declination.",
				canonicalModelStatus: "Covered",
				productDirectionStatus: "Covered in flexible compliance",
				reason:
					"Flexible compliance can express 'any of these' using FA-handled requirements, so Credentially has a path to express this — but only as four unrelated requirements with manual selection, not as one parent requirement with alternative paths.",
				recommendedAction: "canonical model extension",
				credentiallyWorkaround:
					"Today this compiles to 4 separate elements in a Conditional package. The reviewer decides which one applies and marks the others as N/A. The system has no native concept of 'one of these four satisfies the parent'.",
				sourceRefs: [
					{
						label: "Four protocol asset groups",
						sourcePath: `${medsolSourcePath}/medsol-mmr.json`,
						pointer: "protocolAssetGroups",
					},
				],
				canonicalRefs: ["requirements[0].satisfactionRule"],
				projectionRefs: ["requirements[0].pathProgress"],
			},
			{
				id: "mmr-result-routing",
				visibleInPhase: ["prose"],
				sourceConcept: "Result-dependent routing (titer value decides the next step)",
				description:
					"A negative or equivocal titer must route the candidate to EITHER a booster OR a signed declination — not both, and not a free choice between all four paths.",
				canonicalModelStatus: "Gap",
				productDirectionStatus: "Gap",
				reason:
					"Credentially's model has no predicate on evidence content. It can store the titer PDF but can't inspect lab_result.interpretation and conditionally require a follow-on step. This is the single biggest expressive gap vs MedSol.",
				recommendedAction: "canonical model extension",
				credentiallyWorkaround:
					"Reviewer reads the titer manually, then attaches the correct follow-on requirement by hand. There is no automated routing, no evidence-content predicate, and no way to make the booster/declination requirement appear only when the titer is negative.",
				sourceRefs: [
					{
						label: "MMR instructions",
						sourcePath: `${medsolSourcePath}/medsol-mmr.json`,
						pointer: "msInternalinstructions",
					},
				],
				canonicalRefs: ["requirements[0].satisfactionRule.paths[2].steps[0].resultPredicates"],
				projectionRefs: ["requirements[0].pathProgress[2]"],
			},
			{
				id: "mmr-and-subgroup",
				visibleInPhase: ["prose"],
				sourceConcept: "AND-grouped steps within a single path",
				description:
					"Inside the 'negative titer + booster' path, BOTH steps must be satisfied together to complete that path — not as two independent requirements.",
				canonicalModelStatus: "Covered",
				productDirectionStatus: "Gap",
				reason:
					"The canonical graph captures this via stepGroups with operator:AND, but Credentially's packages have no concept of 'two sub-elements that count as one satisfied path'.",
				recommendedAction: "canonical model extension",
				credentiallyWorkaround:
					"Credentially would have to expose titer + booster as two separate Conditional package elements, both required individually. The candidate can't satisfy path 3 without accidentally also being blocked on path 4's titer step.",
				sourceRefs: [
					{
						label: "Negative/Equivocal titer with Booster group",
						sourcePath: `${medsolSourcePath}/medsol-mmr.json`,
						pointer: "protocolAssetGroups[0]",
					},
				],
				canonicalRefs: ["requirements[0].satisfactionRule.paths[2].stepGroups"],
				projectionRefs: ["requirements[0].pathProgress[2]"],
			},
			{
				id: "mmr-path-progress",
				visibleInPhase: ["schema", "prose"],
				sourceConcept: "Per-path progress (which route is the candidate on?)",
				description:
					"A traveller can be 1/2 through the booster path while 0/2 on declination — the UI needs to show path-scoped state, not a single parent progress bar.",
				canonicalModelStatus: "Covered",
				productDirectionStatus: "Gap",
				reason:
					"The projection holds per-path completion states, but Credentially's package UI only renders a flat 'elements complete' count on each compliance row.",
				recommendedAction: "product brief update",
				credentiallyWorkaround:
					"Credentially shows 'MMR: 1 of 4 elements complete' without telling the reviewer that the candidate has fully satisfied the positive-titer route. It can look incomplete when it's actually done.",
				sourceRefs: [
					{
						label: "Path progress model",
						sourcePath: `${medsolSourcePath}/medsol-mmr.json`,
						pointer: "protocolAssetGroups",
					},
				],
				canonicalRefs: ["requirements[0].satisfactionRule.paths"],
				projectionRefs: ["requirements[0].pathProgress"],
			},
			{
				id: "mmr-audience-guidance",
				visibleInPhase: ["schema", "prose"],
				sourceConcept: "Audience-specific guidance (internal / worker / affiliate)",
				description:
					"MedSol keeps three separate guidance bodies so each audience sees language tuned to them.",
				canonicalModelStatus: "Covered",
				productDirectionStatus: "Only in working notes",
				reason:
					"The compiler preserves all three, but Credentially today has one free-text 'instructions' field per element; affiliate-specific and worker-specific phrasing gets merged or lost.",
				recommendedAction: "product brief update",
				credentiallyWorkaround:
					"One blended instructions string. Affiliate nuance tends to live in Notion or operator-only runbooks rather than the candidate-facing UI.",
				sourceRefs: [
					{
						label: "Internal guidance",
						sourcePath: `${medsolSourcePath}/medsol-mmr.json`,
						pointer: "msInternalinstructions",
					},
					{
						label: "Traveller guidance",
						sourcePath: `${medsolSourcePath}/medsol-mmr.json`,
						pointer: "msTravelerinstructions",
					},
				],
				canonicalRefs: ["requirements[0].guidanceByAudience"],
				projectionRefs: ["requirements[0]"],
			},
		],
	};

export const medsolHepBScenario: ScenarioDefinition<MedsolConditionalAssetPayload> =
	{
		id: "medsol-hep-b",
		name: "MedSol Hep B",
		sourceType: "medsol-protocol-builder",
		description:
			"Placement-specific conditional rule with a facility overlay, internal-only escalation guidance, and a two-step negative/equivocal route.",
		defaultAudience: "internal",
		rawPayload: medsolHepBPayload,
		placementContexts: [
			{
				id: "dialysis-clinic",
				label: "Dialysis Clinic Inc",
				context: {
					roleSlug: "travel-rn",
					jurisdiction: "texas",
					facilityType: "dialysis-clinic",
					startDate: "2026-02-23",
				},
			},
			{
				id: "standard-hospital",
				label: "Standard hospital",
				context: {
					roleSlug: "travel-rn",
					jurisdiction: "texas",
					facilityType: "hospital",
					startDate: "2026-02-23",
				},
			},
		],
		projectionOverrides: {
			"dialysis-clinic": {
				"medsol-hepatitis-b": {
					requirementState: "in_progress",
					applicabilityStatus: "required",
					followOnStatus: "available",
					pathProgress: [
						{
							pathId: "medsol-hepatitis-b-hepatitis-b-positive-titer",
							label: "Hepatitis B Positive Titer",
							completionState: "not_started",
							completedSteps: 0,
							totalSteps: 1,
							nextStepLabel: "Positive antibody titer",
						},
						{
							pathId:
								"medsol-hepatitis-b-hepatitis-b-neg-equivocal-titer-declination",
							label: "Hepatitis B Neg/Equivocal Titer & Declination",
							completionState: "in_progress",
							completedSteps: 1,
							totalSteps: 2,
							nextStepLabel: "Medical Solutions Hep B declination form",
						},
					],
				},
			},
			"standard-hospital": {
				"medsol-hepatitis-b": {
					requirementState: "satisfied",
					applicabilityStatus: "required",
					followOnStatus: "none",
					pathProgress: [
						{
							pathId: "medsol-hepatitis-b-hepatitis-b-positive-titer",
							label: "Hepatitis B Positive Titer",
							completionState: "complete",
							completedSteps: 1,
							totalSteps: 1,
						},
						{
							pathId:
								"medsol-hepatitis-b-hepatitis-b-neg-equivocal-titer-declination",
							label: "Hepatitis B Neg/Equivocal Titer & Declination",
							completionState: "not_started",
							completedSteps: 0,
							totalSteps: 2,
							nextStepLabel: "Negative or equivocal titer",
						},
					],
				},
			},
		},
		diagnosticFindings: [
			{
				id: "hep-b-alt-paths",
				sourceConcept: "Alternative satisfaction paths",
				description:
					"Hep B can be met through a positive titer or through a negative/equivocal titer plus declination.",
				canonicalModelStatus: "Covered",
				productDirectionStatus: "Partial",
				reason:
					"The shared graph handles the two paths cleanly, but the current brief still frames this as a future builder capability rather than an intake shape we must honour.",
				recommendedAction: "product brief update",
				sourceRefs: [
					{
						label: "Hep B groups",
						sourcePath: `${medsolSourcePath}/medsol-hep-b.json`,
						pointer: "protocolAssetGroups",
					},
				],
				canonicalRefs: ["requirements[0].satisfactionRule.paths"],
				projectionRefs: ["requirements[0].pathProgress"],
			},
			{
				id: "hep-b-facility-overlay",
				sourceConcept: "Facility overlay on the same requirement",
				description:
					"Dialysis Clinic Inc tightens the base rule with quantitative-only and reference-range requirements.",
				canonicalModelStatus: "Covered",
				productDirectionStatus: "Covered in placements",
				reason:
					"The canonical rule keeps facility-specific validity and evidence notes separate from the base requirement, which matches the placements direction on package-level overlays.",
				recommendedAction: "adapter mapping only",
				sourceRefs: [
					{
						label: "Hep B layer instructions",
						sourcePath: `${medsolSourcePath}/medsol-hep-b.json`,
						pointer: "layerInternalInstructions",
					},
				],
				canonicalRefs: ["requirements[0].satisfactionRule.validityRules"],
				projectionRefs: ["requirements[0]"],
			},
			{
				id: "hep-b-operational-guidance",
				sourceConcept: "Internal-only operational guidance",
				description:
					"Clinical escalation, redaction rules, and lab ordering guidance sit alongside the compliance logic but should not be merged into it.",
				canonicalModelStatus: "Partial",
				productDirectionStatus: "Gap",
				reason:
					"The compiler preserves these as audience guidance, but the model does not yet distinguish operational workflow guidance from rule logic strongly enough.",
				recommendedAction: "canonical model extension",
				sourceRefs: [
					{
						label: "Hep B internal instructions",
						sourcePath: `${medsolSourcePath}/medsol-hep-b.json`,
						pointer: "msInternalinstructions",
					},
				],
				canonicalRefs: ["requirements[0].guidanceByAudience.internal"],
				projectionRefs: ["requirements[0]"],
			},
			{
				id: "hep-b-escalation",
				sourceConcept: "Escalation from evidence content",
				description:
					"If Hep C or HIV is positive, the item should be routed to clinical review rather than silently blocked.",
				canonicalModelStatus: "Partial",
				productDirectionStatus: "Partial",
				reason:
					"The projection can show a non-terminal state, but there is not yet a distinct workflow action model tied to the evaluation result.",
				recommendedAction: "canonical model extension",
				sourceRefs: [
					{
						label: "Hep B escalation note",
						sourcePath: `${medsolSourcePath}/medsol-hep-b.json`,
						pointer: "msInternalinstructions",
					},
				],
				canonicalRefs: ["requirements[0].guidanceByAudience.internal"],
				projectionRefs: ["requirements[0].followOnStatus"],
			},
		],
	};

export const medsolTbScenario: ScenarioDefinition<MedsolConditionalAssetPayload> =
	{
		id: "medsol-tb",
		name: "MedSol TB",
		sourceType: "medsol-protocol-builder",
		description:
			"Placement-specific conditional rule with multiple entry paths, timing rules, positive-result follow-ons, and the 2099 expiry workaround.",
		defaultAudience: "internal",
		rawPayload: medsolTbPayload,
		placementContexts: [
			{
				id: "new-placement",
				label: "New placement",
				context: {
					roleSlug: "travel-rn",
					jurisdiction: "texas",
					facilityType: "dialysis-clinic",
					startDate: "2026-02-23",
				},
			},
			{
				id: "annual-review-covered",
				label: "Annual review already covered",
				context: {
					roleSlug: "travel-rn",
					jurisdiction: "texas",
					facilityType: "dialysis-clinic",
					startDate: "2026-02-23",
					reviewDate: "2027-02-01",
				},
			},
		],
		projectionOverrides: {
			"new-placement": {
				"medsol-tb-2-skin-tests-or-tb-quant-tb-spot": {
					requirementState: "blocked",
					applicabilityStatus: "required",
					followOnStatus: "triggered",
					pathProgress: [
						{
							pathId:
								"medsol-tb-2-skin-tests-or-tb-quant-tb-spot-tb-quantiferon",
							label: "TB Quantiferon",
							completionState: "blocked",
							completedSteps: 1,
							totalSteps: 1,
							nextStepLabel: "TB Screening Form follow-on",
						},
						{
							pathId: "medsol-tb-2-skin-tests-or-tb-quant-tb-spot-tb-spot",
							label: "TB Spot",
							completionState: "not_started",
							completedSteps: 0,
							totalSteps: 1,
							nextStepLabel: "TB Spot within 30 days",
						},
						{
							pathId:
								"medsol-tb-2-skin-tests-or-tb-quant-tb-spot-tb-skin-tests-12-mo-30-days",
							label: "TB Skin Tests (12 mo & 30 days)",
							completionState: "in_progress",
							completedSteps: 1,
							totalSteps: 2,
							nextStepLabel: "TB skin test within 30 days of start",
						},
					],
				},
			},
			"annual-review-covered": {
				"medsol-tb-2-skin-tests-or-tb-quant-tb-spot": {
					requirementState: "satisfied",
					applicabilityStatus: "not_due",
					followOnStatus: "none",
					pathProgress: [
						{
							pathId:
								"medsol-tb-2-skin-tests-or-tb-quant-tb-spot-tb-quantiferon",
							label: "TB Quantiferon",
							completionState: "complete",
							completedSteps: 1,
							totalSteps: 1,
						},
						{
							pathId: "medsol-tb-2-skin-tests-or-tb-quant-tb-spot-tb-spot",
							label: "TB Spot",
							completionState: "not_started",
							completedSteps: 0,
							totalSteps: 1,
							nextStepLabel: "TB Spot within 30 days",
						},
						{
							pathId:
								"medsol-tb-2-skin-tests-or-tb-quant-tb-spot-tb-skin-tests-12-mo-30-days",
							label: "TB Skin Tests (12 mo & 30 days)",
							completionState: "not_started",
							completedSteps: 0,
							totalSteps: 2,
							nextStepLabel: "TB skin test within 12 months of start",
						},
					],
				},
			},
		},
		diagnosticFindings: [
			{
				id: "tb-entry-paths",
				sourceConcept: "Multiple entry paths with grouped steps",
				description:
					"TB has three accepted initial routes, with the skin-test route requiring two separate pieces of evidence.",
				canonicalModelStatus: "Covered",
				productDirectionStatus: "Partial",
				reason:
					"The graph handles the grouped steps, but the existing brief still only gestures at AND/OR without spelling out grouped progress and intake.",
				recommendedAction: "product brief update",
				sourceRefs: [
					{
						label: "TB groups",
						sourcePath: `${medsolSourcePath}/medsol-tb.json`,
						pointer: "protocolAssetGroups",
					},
				],
				canonicalRefs: ["requirements[0].satisfactionRule.paths"],
				projectionRefs: ["requirements[0].pathProgress"],
			},
			{
				id: "tb-timing-windows",
				sourceConcept: "Placement-relative timing windows",
				description:
					"Each accepted TB route carries timing rules relative to the placement start date, not just a generic expiry date.",
				canonicalModelStatus: "Covered",
				productDirectionStatus: "Partial",
				reason:
					"The compiler models timing rules explicitly, but the product direction still treats date windows more generally than this placement-specific timing pattern requires.",
				recommendedAction: "product brief update",
				sourceRefs: [
					{
						label: "TB internal instructions",
						sourcePath: `${medsolSourcePath}/medsol-tb.json`,
						pointer: "msInternalinstructions",
					},
				],
				canonicalRefs: ["requirements[0].satisfactionRule.validityRules"],
				projectionRefs: ["requirements[0].applicabilityStatus"],
			},
			{
				id: "tb-follow-on-chain",
				sourceConcept: "Positive-result follow-on requirements",
				description:
					"A positive TB result triggers screening form, clearance physical, chest X-ray, and authorised review.",
				canonicalModelStatus: "Partial",
				productDirectionStatus: "Gap",
				reason:
					"The compiler can expose a triggered follow-on state, but it does not yet represent the full downstream workflow as first-class dependent requirements.",
				recommendedAction: "canonical model extension",
				sourceRefs: [
					{
						label: "TB follow-on note",
						sourcePath: `${medsolSourcePath}/medsol-tb.json`,
						pointer: "msInternalinstructions",
					},
				],
				canonicalRefs: [
					"requirements[0].satisfactionRule.paths[0].dependencyEdges",
				],
				projectionRefs: ["requirements[0].followOnStatus"],
			},
			{
				id: "tb-admin-date-normalisation",
				sourceConcept: "Derived evidence normalisation",
				description:
					"If only the read date is present, the administered date should be derived as three days earlier.",
				canonicalModelStatus: "Gap",
				productDirectionStatus: "Gap",
				reason:
					"The current canonical model has nowhere to store executable normalisation transforms on extracted evidence fields.",
				recommendedAction: "canonical model extension",
				sourceRefs: [
					{
						label: "TB date normalisation rule",
						sourcePath: `${medsolSourcePath}/medsol-tb.json`,
						pointer: "msInternalinstructions",
					},
				],
				canonicalRefs: ["requirements[0].satisfactionRule.paths[2].steps[1]"],
				projectionRefs: ["requirements[0].pathProgress[2]"],
			},
			{
				id: "tb-2099-workaround",
				sourceConcept: "Fake-expiry workaround for annual coverage",
				description:
					"The current operational answer to ‘not due right now’ is to set a far-future expiry date of 1/01/2099.",
				canonicalModelStatus: "Workaround",
				productDirectionStatus: "Gap",
				reason:
					"The prototype surfaces a `not_due` applicability state, but that still reflects a workaround being translated into a clearer output rather than a fully owned product concept.",
				recommendedAction: "product brief update",
				sourceRefs: [
					{
						label: "TB workaround note",
						sourcePath: `${medsolSourcePath}/medsol-tb.json`,
						pointer: "msInternalinstructions",
					},
				],
				canonicalRefs: ["requirements[0].satisfactionRule.validityRules"],
				projectionRefs: ["requirements[0].applicabilityStatus"],
			},
		],
	};

export const txmBaselineScenario: ScenarioDefinition<TxmRequirementPayload> = {
	id: "txm-baseline",
	name: "TXM baseline",
	sourceType: "txm-requirement-payload",
	description:
		"Curated flat requirement payload derived from the TXM walkthrough to stress review cadence, waivers, placement scope, and profile carry-forward.",
	defaultAudience: "internal",
	rawPayload: txmBaselinePayload as TxmRequirementPayload,
	placementContexts: [
		{
			id: "rolling-window",
			label: "Rolling three-month window",
			context: {
				roleSlug: "agency-rn",
				jurisdiction: "england",
				facilityType: "nhs-trust",
				startDate: "2026-04-01",
				reviewDate: "2026-07-01",
				isOpenEnded: true,
			},
		},
		{
			id: "new-placement",
			label: "New placement",
			context: {
				roleSlug: "agency-rn",
				jurisdiction: "england",
				facilityType: "nhs-trust",
				startDate: "2026-04-01",
				isOpenEnded: false,
			},
		},
	],
	projectionOverrides: {
		"rolling-window": {
			"txm-dbs": {
				requirementState: "in_progress",
				applicabilityStatus: "required",
				followOnStatus: "none",
				pathProgress: [
					{
						pathId: "txm-dbs-default-path",
						label: "Default path",
						completionState: "in_progress",
						completedSteps: 1,
						totalSteps: 1,
						nextStepLabel: "Annual review decision",
					},
				],
			},
			"txm-rtw": {
				requirementState: "satisfied",
				applicabilityStatus: "already_covered",
				followOnStatus: "none",
				pathProgress: [
					{
						pathId: "txm-rtw-default-path",
						label: "Default path",
						completionState: "complete",
						completedSteps: 1,
						totalSteps: 1,
					},
				],
			},
			"txm-client-induction": {
				requirementState: "satisfied",
				applicabilityStatus: "required",
				followOnStatus: "none",
				pathProgress: [
					{
						pathId: "txm-client-induction-default-path",
						label: "Default path",
						completionState: "complete",
						completedSteps: 1,
						totalSteps: 1,
					},
				],
			},
			"txm-training-variance": {
				requirementState: "waived",
				applicabilityStatus: "required",
				followOnStatus: "none",
				pathProgress: [
					{
						pathId: "txm-training-variance-default-path",
						label: "Default path",
						completionState: "blocked",
						completedSteps: 0,
						totalSteps: 1,
						nextStepLabel: "Client waiver approval",
					},
				],
			},
		},
		"new-placement": {
			"txm-dbs": {
				requirementState: "satisfied",
				applicabilityStatus: "already_covered",
				followOnStatus: "none",
				pathProgress: [
					{
						pathId: "txm-dbs-default-path",
						label: "Default path",
						completionState: "complete",
						completedSteps: 1,
						totalSteps: 1,
					},
				],
			},
			"txm-rtw": {
				requirementState: "satisfied",
				applicabilityStatus: "already_covered",
				followOnStatus: "none",
				pathProgress: [
					{
						pathId: "txm-rtw-default-path",
						label: "Default path",
						completionState: "complete",
						completedSteps: 1,
						totalSteps: 1,
					},
				],
			},
			"txm-client-induction": {
				requirementState: "not_started",
				applicabilityStatus: "required",
				followOnStatus: "none",
				pathProgress: [
					{
						pathId: "txm-client-induction-default-path",
						label: "Default path",
						completionState: "not_started",
						completedSteps: 0,
						totalSteps: 1,
						nextStepLabel: "Signed assignment pack",
					},
				],
			},
			"txm-training-variance": {
				requirementState: "in_progress",
				applicabilityStatus: "required",
				followOnStatus: "available",
				pathProgress: [
					{
						pathId: "txm-training-variance-default-path",
						label: "Default path",
						completionState: "in_progress",
						completedSteps: 0,
						totalSteps: 1,
						nextStepLabel: "Client sign-off email",
					},
				],
			},
		},
	},
	diagnosticFindings: [
		{
			id: "txm-flat-single-path",
			sourceConcept: "Flat single-path requirements",
			description:
				"TXM-style requirements are the simpler case and should compile into the same canonical shape as MedSol using one default path each.",
			canonicalModelStatus: "Covered",
			productDirectionStatus: "Covered in flexible compliance",
			reason:
				"The shared graph handles the flatter TXM payload without any market-specific constructs or a separate execution path.",
			recommendedAction: "adapter mapping only",
			sourceRefs: [
				{
					label: "TXM baseline",
					sourcePath: `${medsolSourcePath}/txm-baseline.json`,
					pointer: "requirements",
				},
			],
			canonicalRefs: ["requirements"],
			projectionRefs: ["requirements"],
		},
		{
			id: "txm-review-cadence",
			sourceConcept: "Review cadence distinct from physical expiry",
			description:
				"A DBS can physically expire in three years but still require annual review, and placements themselves can have a separate rolling review cadence.",
			canonicalModelStatus: "Covered",
			productDirectionStatus: "Partial",
			reason:
				"The canonical model can express review cadence explicitly, but the current source briefs still need this to be anchored more strongly as a shared mechanism.",
			recommendedAction: "product brief update",
			sourceRefs: [
				{
					label: "TXM DBS",
					sourcePath: `${medsolSourcePath}/txm-baseline.json`,
					pointer: "requirements[0]",
				},
			],
			canonicalRefs: ["requirements[0].satisfactionRule.validityRules"],
			projectionRefs: ["requirements[0].applicabilityStatus"],
		},
		{
			id: "txm-waived-state",
			sourceConcept: "Waived requirement with audit trail",
			description:
				"TXM needs an intentional exception state when a client signs off on an otherwise unmet placement-specific requirement.",
			canonicalModelStatus: "Covered",
			productDirectionStatus: "Only in working notes",
			reason:
				"The prototype supports a waived projection state, but the product direction still treats this as a refinement coming from research rather than a settled source-of-truth concept.",
			recommendedAction: "product brief update",
			sourceRefs: [
				{
					label: "TXM waiver case",
					sourcePath: `${medsolSourcePath}/txm-baseline.json`,
					pointer: "requirements[3]",
				},
			],
			canonicalRefs: ["requirements[3]"],
			projectionRefs: ["requirements[3].requirementState"],
		},
		{
			id: "txm-scope-carry-forward",
			sourceConcept: "Profile carry-forward plus placement scope",
			description:
				"Profile-scoped evidence should carry forward, while placement-specific packs still need to be fulfilled in the context of a new placement.",
			canonicalModelStatus: "Covered",
			productDirectionStatus: "Covered in placements",
			reason:
				"The same scope model handles TXM and MedSol cleanly without introducing market-specific rules.",
			recommendedAction: "adapter mapping only",
			sourceRefs: [
				{
					label: "TXM requirements",
					sourcePath: `${medsolSourcePath}/txm-baseline.json`,
					pointer: "requirements",
				},
			],
			canonicalRefs: ["requirements[0].scope", "requirements[2].scope"],
			projectionRefs: [
				"requirements[0].applicabilityStatus",
				"requirements[2].applicabilityStatus",
			],
		},
	],
};

export const compilerScenarios = [
	medsolMmrScenario,
	medsolHepBScenario,
	medsolTbScenario,
	txmBaselineScenario,
] as const;

export function getScenarioById(id: string) {
	return compilerScenarios.find((scenario) => scenario.id === id);
}
