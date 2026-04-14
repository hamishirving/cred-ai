import type {
	MedsolConditionalAssetPayload,
	TxmRequirementItem,
	TxmRequirementPayload,
} from "@/lib/requirement-compiler/source-types";
import type {
	CanonicalDependencyEdge,
	CanonicalGraph,
	CanonicalPath,
	CanonicalProvenance,
	CanonicalRequirement,
	CanonicalResultPredicate,
	CanonicalStep,
	CanonicalStepGroup,
	CanonicalValidityRule,
	CompileOptions,
	CompilerScenario,
	ConditionNode,
	GuidanceByAudience,
	PlacementContext,
	ProseEnrichment,
	ProseEnrichmentGroup,
	RequirementSourceAdapter,
	SourceRef,
} from "@/lib/requirement-compiler/types";

const FIXTURE_BASE_PATH = "lib/requirement-compiler/fixtures";

function slugify(text: string) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function stripHtml(value?: string | null) {
	if (!value) {
		return null;
	}

	return value
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function compactList(values: Array<string | null | undefined>) {
	return values.filter((value): value is string => Boolean(value?.trim()));
}

function unique(values: string[]) {
	return [...new Set(values)];
}

function buildMedsolRef(
	fixtureName: string,
	label: string,
	pointer?: string,
): SourceRef {
	return {
		label,
		sourcePath: `${FIXTURE_BASE_PATH}/${fixtureName}`,
		pointer,
	};
}

function buildRequirementId(prefix: string, title: string) {
	return `${prefix}-${slugify(title)}`;
}

function buildPathId(requirementId: string, label: string) {
	return `${requirementId}-${slugify(label)}`;
}

function buildAudienceGuidance(
	payload: MedsolConditionalAssetPayload,
	additionalInternalNotes?: string[],
): GuidanceByAudience {
	const internal = compactList([
		stripHtml(payload.msInternalinstructions),
		...compactList(additionalInternalNotes ?? []),
	]).join("\n\n");

	return {
		internal: internal || null,
		worker: stripHtml(payload.msTravelerinstructions),
		affiliate: stripHtml(payload.msAffiliateinstructions),
	};
}

function buildMedsolBaseGraph(
	payload: MedsolConditionalAssetPayload,
	scenario: CompilerScenario<MedsolConditionalAssetPayload>,
	context: PlacementContext,
	fixtureName: string,
	requirement: CanonicalRequirement,
	compilationNotes: string[],
): CanonicalGraph {
	const overlayNotes = compactList([
		stripHtml(payload.layerInternalInstructions),
		stripHtml(payload.layerAffiliateInstructions),
		stripHtml(payload.layerTravelerInstructions),
	]);

	return {
		sourceEnvelope: {
			sourceType: scenario.sourceType,
			scenarioId: scenario.id,
			scenarioName: scenario.name,
			description: scenario.description,
		},
		placementContext: context,
		requirements: [attachConditionTree(requirement)],
		guidance: {
			notes: overlayNotes,
		},
		provenance: {
			adapterId: "medsol-protocol-builder-adapter",
			compilationNotes: [
				`Fixture source: ${fixtureName}`,
				...compilationNotes,
				"No source concept is intentionally discarded; awkward concepts are surfaced through diagnostics.",
			],
		},
	};
}

function buildGroupRef(
	fixtureName: string,
	groupName: string,
	index: number,
): SourceRef {
	return buildMedsolRef(
		fixtureName,
		groupName,
		`protocolAssetGroups[${index}]`,
	);
}

function pathToConditionNode(path: CanonicalPath): ConditionNode {
	const stepLeaves: ConditionNode[] = path.steps.map((step) => ({
		kind: "leaf",
		step,
		provenance: step.provenance,
	}));

	if (stepLeaves.length === 1) {
		const onlyChild = stepLeaves[0];
		// Promote single-step path to a labelled leaf-equivalent group of one,
		// so the path label is still visible in the tree.
		return {
			kind: "group",
			operator: "AND",
			label: path.label,
			description: path.description,
			children: stepLeaves,
			provenance: path.provenance ?? onlyChild.provenance,
		};
	}

	return {
		kind: "group",
		operator: "AND",
		label: path.label,
		description: path.description,
		children: stepLeaves,
		provenance: path.provenance,
	};
}

function buildConditionTree(
	requirement: Pick<CanonicalRequirement, "satisfactionRule">,
): ConditionNode {
	const paths = requirement.satisfactionRule.paths;

	if (paths.length === 1) {
		return pathToConditionNode(paths[0]);
	}

	return {
		kind: "group",
		operator: "OR",
		label: "Acceptance paths",
		description: "Any one of the following paths satisfies this requirement.",
		children: paths.map(pathToConditionNode),
	};
}

function attachConditionTree(
	requirement: CanonicalRequirement,
): CanonicalRequirement {
	return {
		...requirement,
		conditionTree: buildConditionTree(requirement),
	};
}

function tagPathsWithProvenance(
	paths: CanonicalPath[],
	provenance: CanonicalProvenance,
): CanonicalPath[] {
	return paths.map((path) => ({
		...path,
		steps: path.steps.map((step) => ({
			...step,
			provenance: step.provenance ?? provenance,
			resultPredicates: step.resultPredicates?.map((predicate) => ({
				...predicate,
				provenance: predicate.provenance ?? provenance,
			})),
			validityRules: step.validityRules?.map((rule) => ({
				...rule,
				provenance: rule.provenance ?? provenance,
			})),
		})),
		stepGroups: path.stepGroups?.map((group) => ({
			...group,
			provenance: group.provenance ?? provenance,
		})),
		dependencyEdges: path.dependencyEdges?.map((edge) => ({
			...edge,
			provenance: edge.provenance ?? provenance,
		})),
	}));
}

function medsolSchemaPaths(
	payload: MedsolConditionalAssetPayload,
	requirementId: string,
	fixtureName: string,
): CanonicalPath[] {
	return payload.protocolAssetGroups.map((group, index) => {
		const pathId = buildPathId(requirementId, group.msName);
		const assetGuids = [
			group.msProtocolAsset1,
			group.msProtocolAsset2,
			group.msProtocolAsset3,
			group.msProtocolAsset4,
			group.msProtocolAsset5,
		].filter(
			(guid) =>
				Boolean(guid) && guid !== "00000000-0000-0000-0000-000000000000",
		);

		const steps: CanonicalStep[] = assetGuids.map((guid, stepIndex) => ({
			stepId: `${pathId}-asset-${stepIndex + 1}`,
			label: `Protocol asset ${stepIndex + 1}`,
			evidenceKinds: [],
			required: true,
			notes: [`GUID: ${guid}`],
			sourceRefs: [
				buildMedsolRef(
					fixtureName,
					`${group.msName} · msProtocolAsset${stepIndex + 1}`,
					`protocolAssetGroups[${index}].msProtocolAsset${stepIndex + 1}`,
				),
			],
			provenance: "schema",
		}));

		return {
			pathId,
			label: group.msName,
			description:
				"Accepted path from MedSol Protocol Builder. Schema view shows only the group label and the asset GUIDs it references — the instruction prose has not yet been interpreted.",
			branchingType: "single-step",
			steps,
			sourceRefs: [buildGroupRef(fixtureName, group.msName, index)],
			provenance: "schema",
		};
	});
}

function mergeProseEnrichmentOntoSchema(
	schemaPaths: CanonicalPath[],
	enrichment: ProseEnrichment,
	provenance: CanonicalProvenance,
): CanonicalPath[] {
	const groupByLabel = new Map<string, ProseEnrichmentGroup>(
		enrichment.groups.map((group) => [group.groupLabel, group]),
	);

	return schemaPaths.map((schemaPath) => {
		const group = groupByLabel.get(schemaPath.label);
		if (!group) return schemaPath;

		const steps: CanonicalStep[] = group.steps.map((step, index) => {
			const baseStepId = `${schemaPath.pathId}-enriched-${index + 1}`;

			const validityRules: CanonicalValidityRule[] | undefined = step.validityRule
				? [
						{
							type: step.validityRule.type,
							description: step.validityRule.description,
							value: step.validityRule.value,
							provenance,
							sourceQuote: step.validityRule.sourceQuote,
						},
					]
				: undefined;

			const resultPredicates: CanonicalResultPredicate[] | undefined =
				step.resultPredicate
					? [
							{
								predicateId: `${baseStepId}-predicate`,
								label: step.resultPredicate.label,
								field: step.resultPredicate.field,
								operator: step.resultPredicate.operator,
								value: step.resultPredicate.values,
								outcome: step.resultPredicate.outcome,
								provenance,
								sourceQuote: step.resultPredicate.sourceQuote,
							},
						]
					: undefined;

			return {
				stepId: baseStepId,
				label: step.label,
				evidenceKinds: step.evidenceKinds,
				required: true,
				validityRules,
				resultPredicates,
				notes: step.notes,
				sourceRefs: schemaPath.sourceRefs,
				provenance,
				sourceQuote: step.sourceQuote,
			};
		});

		const stepGroups: CanonicalStepGroup[] | undefined = group.andGroup
			? [
					{
						groupId: `${schemaPath.pathId}-and-group`,
						label: group.andGroup.label,
						operator: "AND",
						stepIds: group.andGroup.stepLabels.map((stepLabel) => {
							const matchIndex = group.steps.findIndex(
								(s) => s.label === stepLabel,
							);
							return `${schemaPath.pathId}-enriched-${
								(matchIndex >= 0 ? matchIndex : 0) + 1
							}`;
						}),
						provenance,
					},
				]
			: undefined;

		const dependencyEdges: CanonicalDependencyEdge[] | undefined =
			group.dependencyEdges?.map((edge, index) => ({
				edgeId: `${schemaPath.pathId}-edge-${index + 1}`,
				label: edge.label,
				triggerStepId: `${schemaPath.pathId}-enriched-1`,
				triggerPredicateId: `${schemaPath.pathId}-enriched-1-predicate`,
				description: edge.description,
				provenance,
			}));

		return {
			...schemaPath,
			description: group.description,
			branchingType: group.branchingType,
			steps,
			stepGroups,
			dependencyEdges,
		};
	});
}

function mmrPaths(
	payload: MedsolConditionalAssetPayload,
	requirementId: string,
): CanonicalPath[] {
	const fixtureName = "medsol-mmr.json";
	const groupIndexes = new Map(
		payload.protocolAssetGroups.map((group, index) => [group.msName, index]),
	);

	const vaccinesPath: CanonicalPath = {
		pathId: buildPathId(requirementId, "MMR Vaccines"),
		label: "MMR Vaccines",
		description:
			"Accept two documented MMR vaccines given at least 28 days apart.",
		branchingType: "single-step",
		steps: [
			{
				stepId: "mmr-vaccine-series",
				label: "Two documented MMR vaccines 28 days apart",
				evidenceKinds: ["vaccination_record"],
				required: true,
				validityRules: [
					{
						type: "window",
						description:
							"The two vaccines must be separated by at least 28 days.",
					},
				],
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"MMR Vaccines",
						groupIndexes.get("MMR Vaccines") ?? 0,
					),
				],
			},
		],
		sourceRefs: [
			buildGroupRef(
				fixtureName,
				"MMR Vaccines",
				groupIndexes.get("MMR Vaccines") ?? 0,
			),
		],
	};

	const positivePath: CanonicalPath = {
		pathId: buildPathId(requirementId, "MMR Positive Titer"),
		label: "MMR Positive Titer",
		description:
			"Accept positive or immune IGG titers for measles, mumps, and rubella.",
		branchingType: "single-step",
		steps: [
			{
				stepId: "mmr-positive-igg-titer",
				label: "Positive IGG titer for measles, mumps, and rubella",
				evidenceKinds: ["lab_titer"],
				required: true,
				resultPredicates: [
					{
						predicateId: "mmr-positive-titer-result",
						label: "Positive or immune titer",
						field: "lab_result.interpretation",
						operator: "in",
						value: ["positive", "immune", "reactive"],
						outcome: "satisfies_path",
					},
				],
				notes: [
					"Titers must be IGG, listed individually, and include the collection date.",
				],
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"MMR Positive Titer",
						groupIndexes.get("MMR Positive Titer") ?? 0,
					),
				],
			},
		],
		sourceRefs: [
			buildGroupRef(
				fixtureName,
				"MMR Positive Titer",
				groupIndexes.get("MMR Positive Titer") ?? 0,
			),
		],
	};

	const negativePredicate: CanonicalResultPredicate = {
		predicateId: "mmr-negative-or-equivocal",
		label: "Negative or equivocal IGG titer",
		field: "lab_result.interpretation",
		operator: "in",
		value: ["negative", "equivocal", "non-immune", "non-reactive"],
		outcome: "routes_to_alternative_path",
	};

	const boosterPath: CanonicalPath = {
		pathId: buildPathId(
			requirementId,
			"MMR Negative Equivocal Titer with Booster",
		),
		label: "MMR Negative/Equivocal Titer with Booster",
		description:
			"Accept a negative or equivocal titer only when it is followed by a booster vaccine.",
		branchingType: "result-dependent",
		steps: [
			{
				stepId: "mmr-negative-or-equivocal-titer",
				label: "Negative or equivocal IGG titer",
				evidenceKinds: ["lab_titer"],
				required: true,
				resultPredicates: [negativePredicate],
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"MMR Negative/Equivocal Titer with Booster",
						groupIndexes.get("MMR Negative/Equivocal Titer with Booster") ?? 0,
					),
				],
			},
			{
				stepId: "mmr-booster-vaccine",
				label: "Booster vaccine after the titer",
				evidenceKinds: ["vaccination_record"],
				required: true,
				validityRules: [
					{
						type: "window",
						description:
							"The booster must be dated after the negative or equivocal titer.",
					},
				],
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"MMR Negative/Equivocal Titer with Booster",
						groupIndexes.get("MMR Negative/Equivocal Titer with Booster") ?? 0,
					),
				],
			},
		],
		stepGroups: [
			{
				groupId: "mmr-negative-booster-and-group",
				label: "Negative/equivocal titer plus booster",
				operator: "AND",
				stepIds: ["mmr-negative-or-equivocal-titer", "mmr-booster-vaccine"],
			},
		],
		sourceRefs: [
			buildGroupRef(
				fixtureName,
				"MMR Negative/Equivocal Titer with Booster",
				groupIndexes.get("MMR Negative/Equivocal Titer with Booster") ?? 0,
			),
		],
	};

	const declinationPath: CanonicalPath = {
		pathId: buildPathId(
			requirementId,
			"MMR Negative Equivocal Titer with Declination",
		),
		label: "MMR Negative/Equivocal Titer with Declination",
		description:
			"Accept a negative or equivocal titer only when it is paired with the MedSol declination form.",
		branchingType: "result-dependent",
		steps: [
			{
				stepId: "mmr-negative-or-equivocal-titer-declination",
				label: "Negative or equivocal IGG titer",
				evidenceKinds: ["lab_titer"],
				required: true,
				resultPredicates: [negativePredicate],
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"MMR Negative/Equivocal Titer with Declination",
						groupIndexes.get("MMR Negative/Equivocal Titer with Declination") ??
							0,
					),
				],
			},
			{
				stepId: "mmr-declination-form",
				label: "Signed MedSol MMR declination form",
				evidenceKinds: ["declination_form"],
				required: true,
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"MMR Negative/Equivocal Titer with Declination",
						groupIndexes.get("MMR Negative/Equivocal Titer with Declination") ??
							0,
					),
				],
			},
		],
		stepGroups: [
			{
				groupId: "mmr-negative-declination-and-group",
				label: "Negative/equivocal titer plus declination",
				operator: "AND",
				stepIds: [
					"mmr-negative-or-equivocal-titer-declination",
					"mmr-declination-form",
				],
			},
		],
		sourceRefs: [
			buildGroupRef(
				fixtureName,
				"MMR Negative/Equivocal Titer with Declination",
				groupIndexes.get("MMR Negative/Equivocal Titer with Declination") ?? 0,
			),
		],
	};

	return [vaccinesPath, positivePath, boosterPath, declinationPath];
}

function buildMedsolMmrGraph(
	payload: MedsolConditionalAssetPayload,
	scenario: CompilerScenario<MedsolConditionalAssetPayload>,
	context: PlacementContext,
	options?: CompileOptions,
) {
	const fixtureName = "medsol-mmr.json";
	const requirementId = buildRequirementId("medsol", payload.msDisplayname);
	const phase = options?.phase ?? "prose";
	const liveEnrichment = options?.proseEnrichment ?? null;

	let paths: CanonicalPath[];
	const notes: string[] = [];

	if (phase === "schema") {
		paths = medsolSchemaPaths(payload, requirementId, fixtureName);
		notes.push(
			"Schema-only view: four paths derived from protocolAssetGroups, each showing only the opaque msProtocolAssetN GUIDs. The instruction prose has not been interpreted.",
		);
	} else if (liveEnrichment) {
		const schemaPaths = medsolSchemaPaths(
			payload,
			requirementId,
			fixtureName,
		);
		paths = mergeProseEnrichmentOntoSchema(
			schemaPaths,
			liveEnrichment,
			liveEnrichment.source === "live-llm" ? "live-llm" : "prose-interpreted",
		);
		notes.push(
			liveEnrichment.source === "live-llm"
				? `Prose enrichment sourced from live LLM extraction${
						liveEnrichment.model ? ` (${liveEnrichment.model})` : ""
					}.`
				: "Prose enrichment sourced from a prefab structured mapping.",
		);
	} else {
		paths = tagPathsWithProvenance(
			mmrPaths(payload, requirementId),
			"prose-interpreted",
		);
		notes.push(
			"Prose interpretation: four canonical satisfaction paths hand-mapped from msInternalinstructions. This is the prefab output.",
			"Preserved separate internal, worker/traveller, and affiliate guidance instead of flattening it.",
		);
	}

	const requirement: CanonicalRequirement = {
		requirementId,
		title: payload.msDisplayname,
		category: payload.msProtocolassetcategoryname ?? "Health items",
		scope: payload.msIsglobal ? "profile" : "placement",
		satisfactionRule: {
			ruleKind: "multi-path",
			paths,
			validityRules: [],
		},
		guidanceByAudience: buildAudienceGuidance(payload),
		sourceRefs: [
			buildMedsolRef(fixtureName, payload.msDisplayname, "msDisplayname"),
			buildMedsolRef(fixtureName, "MMR groups", "protocolAssetGroups"),
			buildMedsolRef(
				fixtureName,
				"MMR internal guidance",
				"msInternalinstructions",
			),
		],
	};

	return buildMedsolBaseGraph(
		payload,
		scenario,
		context,
		fixtureName,
		requirement,
		notes,
	);
}

function buildHepBOverlayRules(): CanonicalValidityRule[] {
	return [
		{
			type: "within_months_of_start",
			description:
				"Dialysis clinic overlay requires acceptable Hep B evidence within 12 months of placement start.",
			value: 12,
			placementPredicates: [
				{
					predicateId: "hep-b-dialysis-overlay",
					label: "Dialysis clinic facility overlay",
					field: "placement.facilityType",
					operator: "equals",
					value: "dialysis-clinic",
				},
			],
		},
		{
			type: "annual_review",
			description:
				"Dialysis clinic overlay requires annual review of the requirement.",
			value: 12,
			placementPredicates: [
				{
					predicateId: "hep-b-dialysis-annual",
					label: "Dialysis clinic annual overlay",
					field: "placement.facilityType",
					operator: "equals",
					value: "dialysis-clinic",
				},
			],
		},
		{
			type: "window",
			description:
				"Dialysis clinic overlay requires quantitative results and reference ranges.",
			placementPredicates: [
				{
					predicateId: "hep-b-dialysis-content",
					label: "Dialysis clinic content overlay",
					field: "placement.facilityType",
					operator: "equals",
					value: "dialysis-clinic",
				},
			],
		},
	];
}

function buildHepBFollowOnEdge(): CanonicalDependencyEdge {
	return {
		edgeId: "hep-b-incidental-escalation",
		label: "Clinical escalation",
		triggerStepId: "hep-b-positive-titer",
		triggerPredicateId: "hep-b-incidental-positive",
		description:
			"Positive incidental Hep C or HIV content should route to clinical review rather than silently fail the requirement.",
		targetRequirementId: "clinical-review",
	};
}

function buildMedsolHepBGraph(
	payload: MedsolConditionalAssetPayload,
	scenario: CompilerScenario<MedsolConditionalAssetPayload>,
	context: PlacementContext,
	options?: CompileOptions,
) {
	const fixtureName = "medsol-hep-b.json";
	const requirementId = buildRequirementId("medsol", payload.msDisplayname);
	const phase = options?.phase ?? "prose";

	if (phase === "schema") {
		const schemaRequirement: CanonicalRequirement = {
			requirementId,
			title: payload.msDisplayname,
			category: payload.msProtocolassetcategoryname ?? "Health items",
			scope: payload.msIsglobal ? "profile" : "placement",
			satisfactionRule: {
				ruleKind: "multi-path",
				paths: medsolSchemaPaths(payload, requirementId, fixtureName),
				validityRules: [],
			},
			guidanceByAudience: buildAudienceGuidance(payload),
			sourceRefs: [
				buildMedsolRef(fixtureName, payload.msDisplayname, "msDisplayname"),
				buildMedsolRef(fixtureName, "Hep B groups", "protocolAssetGroups"),
			],
		};
		return buildMedsolBaseGraph(
			payload,
			scenario,
			context,
			fixtureName,
			schemaRequirement,
			[
				"Schema-only view: paths derived from protocolAssetGroups, opaque asset GUIDs only. Instruction prose has not been interpreted.",
			],
		);
	}

	const groupIndexes = new Map(
		payload.protocolAssetGroups.map((group, index) => [group.msName, index]),
	);

	const positivePath: CanonicalPath = {
		pathId: buildPathId(requirementId, "Hepatitis B Positive Titer"),
		label: "Hepatitis B Positive Titer",
		description: "Accept a positive or immune Hep B antibody titer.",
		branchingType: "single-step",
		steps: [
			{
				stepId: "hep-b-positive-titer",
				label: "Positive or immune Hep B antibody titer",
				evidenceKinds: ["lab_titer"],
				required: true,
				resultPredicates: [
					{
						predicateId: "hep-b-positive-antibody",
						label: "Positive or immune antibody result",
						field: "lab_result.interpretation",
						operator: "in",
						value: ["positive", "immune", "reactive"],
						outcome: "satisfies_path",
					},
					{
						predicateId: "hep-b-incidental-positive",
						label: "Incidental positive Hep C or HIV content",
						field: "lab_panel.incidental_findings",
						operator: "contains",
						value: "positive",
						outcome: "requires_follow_on",
					},
				],
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"Hepatitis B Positive Titer",
						groupIndexes.get("Hepatitis B Positive Titer") ?? 0,
					),
				],
			},
		],
		dependencyEdges: [buildHepBFollowOnEdge()],
		sourceRefs: [
			buildGroupRef(
				fixtureName,
				"Hepatitis B Positive Titer",
				groupIndexes.get("Hepatitis B Positive Titer") ?? 0,
			),
		],
	};

	const negativePath: CanonicalPath = {
		pathId: buildPathId(
			requirementId,
			"Hepatitis B Neg Equivocal Titer Declination",
		),
		label: "Hepatitis B Neg/Equivocal Titer & Declination",
		description:
			"Accept a negative, non-immune, or equivocal titer only when the MedSol declination form is also provided.",
		branchingType: "and-group",
		steps: [
			{
				stepId: "hep-b-negative-or-equivocal-titer",
				label: "Negative, non-immune, or equivocal Hep B titer",
				evidenceKinds: ["lab_titer"],
				required: true,
				resultPredicates: [
					{
						predicateId: "hep-b-negative-antibody",
						label: "Negative, non-immune, or equivocal titer",
						field: "lab_result.interpretation",
						operator: "in",
						value: ["negative", "non-immune", "equivocal", "non-reactive"],
						outcome: "routes_to_alternative_path",
					},
				],
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"Hepatitis B Neg/Equivocal Titer & Declination",
						groupIndexes.get("Hepatitis B Neg/Equivocal Titer & Declination") ??
							0,
					),
				],
			},
			{
				stepId: "hep-b-declination-form",
				label: "Signed Medical Solutions Hep B declination form",
				evidenceKinds: ["declination_form"],
				required: true,
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"Hepatitis B Neg/Equivocal Titer & Declination",
						groupIndexes.get("Hepatitis B Neg/Equivocal Titer & Declination") ??
							0,
					),
				],
			},
		],
		stepGroups: [
			{
				groupId: "hep-b-negative-declination-group",
				label: "Negative/equivocal titer plus declination",
				operator: "AND",
				stepIds: [
					"hep-b-negative-or-equivocal-titer",
					"hep-b-declination-form",
				],
			},
		],
		sourceRefs: [
			buildGroupRef(
				fixtureName,
				"Hepatitis B Neg/Equivocal Titer & Declination",
				groupIndexes.get("Hepatitis B Neg/Equivocal Titer & Declination") ?? 0,
			),
		],
	};

	const requirement: CanonicalRequirement = {
		requirementId,
		title: payload.msDisplayname,
		category: payload.msProtocolassetcategoryname ?? "Health items",
		scope: payload.msIsglobal ? "profile" : "placement",
		satisfactionRule: {
			ruleKind: "multi-path",
			paths: tagPathsWithProvenance(
				[positivePath, negativePath],
				"prose-interpreted",
			),
			validityRules: buildHepBOverlayRules(),
		},
		guidanceByAudience: buildAudienceGuidance(payload, [
			stripHtml(payload.layerInternalInstructions) ?? "",
		]),
		sourceRefs: [
			buildMedsolRef(fixtureName, payload.msDisplayname, "msDisplayname"),
			buildMedsolRef(fixtureName, "Hep B groups", "protocolAssetGroups"),
			buildMedsolRef(
				fixtureName,
				"Dialysis clinic overlay",
				"layerInternalInstructions",
			),
		],
	};

	return buildMedsolBaseGraph(
		payload,
		scenario,
		context,
		fixtureName,
		requirement,
		[
			"Compiled the facility overlay into placement-predicate validity rules instead of a MedSol-specific runtime branch.",
			"Kept redaction and escalation behaviour in guidance plus follow-on edges, because they are adjacent to the rule rather than the rule itself.",
		],
	);
}

function buildTbFollowOnEdges(stepId: string, predicateId: string) {
	return [
		{
			edgeId: `${stepId}-tb-screening-form`,
			label: "TB screening form follow-on",
			triggerStepId: stepId,
			triggerPredicateId: predicateId,
			description: "Positive TB results require a TB Screening Form.",
			targetRequirementId: "tb-screening-form",
		},
		{
			edgeId: `${stepId}-tb-clearance-physical`,
			label: "TB clearance physical follow-on",
			triggerStepId: stepId,
			triggerPredicateId: predicateId,
			description: "Positive TB results require a TB clearance physical.",
			targetRequirementId: "tb-clearance-physical",
		},
		{
			edgeId: `${stepId}-tb-chest-xray`,
			label: "Chest X-ray follow-on",
			triggerStepId: stepId,
			triggerPredicateId: predicateId,
			description:
				"Positive TB results require a chest X-ray noting a past positive history.",
			targetRequirementId: "tb-chest-xray",
		},
		{
			edgeId: `${stepId}-tb-authorised-review`,
			label: "Authorised review",
			triggerStepId: stepId,
			triggerPredicateId: predicateId,
			description:
				"Positive TB results must be reviewed by authorised personnel before clearance.",
			targetRequirementId: "tb-authorised-review",
		},
	] satisfies CanonicalDependencyEdge[];
}

function buildMedsolTbGraph(
	payload: MedsolConditionalAssetPayload,
	scenario: CompilerScenario<MedsolConditionalAssetPayload>,
	context: PlacementContext,
	options?: CompileOptions,
) {
	const fixtureName = "medsol-tb.json";
	const requirementId = buildRequirementId("medsol", payload.msDisplayname);
	const phase = options?.phase ?? "prose";

	if (phase === "schema") {
		const schemaRequirement: CanonicalRequirement = {
			requirementId,
			title: payload.msDisplayname,
			category: payload.msProtocolassetcategoryname ?? "Health items",
			scope: payload.msIsglobal ? "profile" : "placement",
			satisfactionRule: {
				ruleKind: "multi-path",
				paths: medsolSchemaPaths(payload, requirementId, fixtureName),
				validityRules: [],
			},
			guidanceByAudience: buildAudienceGuidance(payload),
			sourceRefs: [
				buildMedsolRef(fixtureName, payload.msDisplayname, "msDisplayname"),
				buildMedsolRef(fixtureName, "TB groups", "protocolAssetGroups"),
			],
		};
		return buildMedsolBaseGraph(
			payload,
			scenario,
			context,
			fixtureName,
			schemaRequirement,
			[
				"Schema-only view: paths derived from protocolAssetGroups, opaque asset GUIDs only. Instruction prose has not been interpreted.",
			],
		);
	}

	const groupIndexes = new Map(
		payload.protocolAssetGroups.map((group, index) => [group.msName, index]),
	);

	const quantPositivePredicateId = "tb-quant-positive";
	const spotPositivePredicateId = "tb-spot-positive";
	const skinPositivePredicateId = "tb-skin-positive";

	const quantiferonPath: CanonicalPath = {
		pathId: buildPathId(requirementId, "TB Quantiferon"),
		label: "TB Quantiferon",
		description:
			"Accept a TB Quantiferon lab result collected within 30 days of start.",
		branchingType: "single-step",
		steps: [
			{
				stepId: "tb-quantiferon",
				label: "TB Quantiferon within 30 days of start",
				evidenceKinds: ["tb_quant_lab"],
				required: true,
				resultPredicates: [
					{
						predicateId: "tb-quant-negative",
						label: "Negative Quantiferon result",
						field: "lab_result.interpretation",
						operator: "equals",
						value: "negative",
						outcome: "satisfies_path",
					},
					{
						predicateId: quantPositivePredicateId,
						label: "Positive Quantiferon result",
						field: "lab_result.interpretation",
						operator: "equals",
						value: "positive",
						outcome: "requires_follow_on",
					},
				],
				validityRules: [
					{
						type: "within_days_of_start",
						description:
							"The Quantiferon must be collected within 30 days of placement start.",
						value: 30,
					},
				],
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"TB Quantiferon",
						groupIndexes.get("TB Quantiferon") ?? 0,
					),
				],
			},
		],
		dependencyEdges: buildTbFollowOnEdges(
			"tb-quantiferon",
			quantPositivePredicateId,
		),
		sourceRefs: [
			buildGroupRef(
				fixtureName,
				"TB Quantiferon",
				groupIndexes.get("TB Quantiferon") ?? 0,
			),
		],
	};

	const tbSpotPath: CanonicalPath = {
		pathId: buildPathId(requirementId, "TB Spot"),
		label: "TB Spot",
		description: "Accept a TB T-Spot result collected within 30 days of start.",
		branchingType: "single-step",
		steps: [
			{
				stepId: "tb-spot",
				label: "TB T-Spot within 30 days of start",
				evidenceKinds: ["tb_spot_lab"],
				required: true,
				resultPredicates: [
					{
						predicateId: "tb-spot-negative",
						label: "Negative T-Spot result",
						field: "lab_result.interpretation",
						operator: "equals",
						value: "negative",
						outcome: "satisfies_path",
					},
					{
						predicateId: spotPositivePredicateId,
						label: "Positive T-Spot result",
						field: "lab_result.interpretation",
						operator: "equals",
						value: "positive",
						outcome: "requires_follow_on",
					},
				],
				validityRules: [
					{
						type: "within_days_of_start",
						description:
							"The T-Spot must be collected within 30 days of placement start.",
						value: 30,
					},
				],
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"TB Spot",
						groupIndexes.get("TB Spot") ?? 0,
					),
				],
			},
		],
		dependencyEdges: buildTbFollowOnEdges("tb-spot", spotPositivePredicateId),
		sourceRefs: [
			buildGroupRef(fixtureName, "TB Spot", groupIndexes.get("TB Spot") ?? 0),
		],
	};

	const skinTestsPath: CanonicalPath = {
		pathId: buildPathId(requirementId, "TB Skin Tests 12 mo 30 days"),
		label: "TB Skin Tests (12 mo & 30 days)",
		description:
			"Accept two skin tests: one within 12 months of start and one within 30 days of start.",
		branchingType: "and-group",
		steps: [
			{
				stepId: "tb-skin-test-12-months",
				label: "TB skin test within 12 months of start",
				evidenceKinds: ["tb_skin_test"],
				required: true,
				validityRules: [
					{
						type: "within_months_of_start",
						description:
							"The older TB skin test must fall within 12 months of the placement start date.",
						value: 12,
					},
				],
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"TB Skin Tests (12 mo & 30 days)",
						groupIndexes.get("TB Skin Tests (12 mo & 30 days)") ?? 0,
					),
				],
			},
			{
				stepId: "tb-skin-test-30-days",
				label: "TB skin test within 30 days of start",
				evidenceKinds: ["tb_skin_test"],
				required: true,
				resultPredicates: [
					{
						predicateId: "tb-skin-negative",
						label: "Negative skin test result",
						field: "screening_result.interpretation",
						operator: "equals",
						value: "negative",
						outcome: "satisfies_path",
					},
					{
						predicateId: skinPositivePredicateId,
						label: "Positive skin test result",
						field: "screening_result.interpretation",
						operator: "equals",
						value: "positive",
						outcome: "requires_follow_on",
					},
				],
				validityRules: [
					{
						type: "within_days_of_start",
						description:
							"The newer TB skin test must fall within 30 days of placement start.",
						value: 30,
					},
				],
				notes: [
					"The read date must be 48 to 72 hours after the administered date.",
					"If only a read date exists, the administered date should be derived three days earlier.",
				],
				sourceRefs: [
					buildGroupRef(
						fixtureName,
						"TB Skin Tests (12 mo & 30 days)",
						groupIndexes.get("TB Skin Tests (12 mo & 30 days)") ?? 0,
					),
				],
			},
		],
		stepGroups: [
			{
				groupId: "tb-skin-tests-group",
				label: "Two-step TB skin test route",
				operator: "AND",
				stepIds: ["tb-skin-test-12-months", "tb-skin-test-30-days"],
				description:
					"Both the 12-month and 30-day evidence points must be satisfied for this path.",
			},
		],
		dependencyEdges: buildTbFollowOnEdges(
			"tb-skin-test-30-days",
			skinPositivePredicateId,
		),
		sourceRefs: [
			buildGroupRef(
				fixtureName,
				"TB Skin Tests (12 mo & 30 days)",
				groupIndexes.get("TB Skin Tests (12 mo & 30 days)") ?? 0,
			),
		],
	};

	const requirement: CanonicalRequirement = {
		requirementId,
		title: payload.msDisplayname,
		category: payload.msProtocolassetcategoryname ?? "Health items",
		scope: payload.msIsglobal ? "profile" : "placement",
		satisfactionRule: {
			ruleKind: "multi-path",
			paths: tagPathsWithProvenance(
				[quantiferonPath, tbSpotPath, skinTestsPath],
				"prose-interpreted",
			),
			validityRules: [
				{
					type: "annual_review",
					description:
						"TB is reviewed on an annual cadence once an acceptable route is satisfied.",
					value: 12,
				},
				{
					type: "not_due",
					description:
						"If a current TB already covers the current window, mark the requirement as `not_due` instead of inventing a 2099 expiry date.",
				},
			],
		},
		guidanceByAudience: buildAudienceGuidance(payload),
		sourceRefs: [
			buildMedsolRef(fixtureName, payload.msDisplayname, "msDisplayname"),
			buildMedsolRef(fixtureName, "TB groups", "protocolAssetGroups"),
			buildMedsolRef(
				fixtureName,
				"TB internal guidance",
				"msInternalinstructions",
			),
		],
	};

	return buildMedsolBaseGraph(
		payload,
		scenario,
		context,
		fixtureName,
		requirement,
		[
			"Mapped placement-relative timing windows directly onto canonical validity rules.",
			"Represented the positive-result clearance chain as dependency edges, while keeping the 2099 expiry note explicit as a workaround in diagnostics rather than encoding it as expiry logic.",
		],
	);
}

function titleCaseFromEvidence(evidenceKind: string) {
	return evidenceKind
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function buildTxmRules(item: TxmRequirementItem): CanonicalValidityRule[] {
	const rules: CanonicalValidityRule[] = [];

	if (typeof item.physicalExpiryMonths === "number") {
		rules.push({
			type: "physical_expiry",
			description: `${item.title} physically expires after ${item.physicalExpiryMonths} months.`,
			value: item.physicalExpiryMonths,
		});
	}

	if (typeof item.reviewCadenceMonths === "number") {
		rules.push({
			type: "review_cadence",
			description: `${item.title} must be reviewed every ${item.reviewCadenceMonths} months.`,
			value: item.reviewCadenceMonths,
		});
	}

	if (item.carryForward) {
		rules.push({
			type: "window",
			description:
				"Profile-scoped evidence can carry forward across placements until the next review window opens.",
		});
	}

	return rules;
}

function buildTxmGraph(
	payload: TxmRequirementPayload,
	scenario: CompilerScenario<TxmRequirementPayload>,
	context: PlacementContext,
) {
	const requirements: CanonicalRequirement[] = payload.requirements.map(
		(item, index) => {
			const requirementId = item.id;
			const defaultPathId = `${item.id}-default-path`;

			return {
				requirementId,
				title: item.title,
				category: item.category,
				scope: item.scope,
				satisfactionRule: {
					ruleKind: "single-path",
					paths: [
						{
							pathId: defaultPathId,
							label: "Default path",
							description:
								item.scope === "profile"
									? "Single-path profile requirement compiled from the flat TXM payload."
									: "Single-path placement requirement compiled from the flat TXM payload.",
							branchingType: "single-step",
							steps: [
								{
									stepId: `${item.id}-evidence`,
									label: `Provide ${item.evidenceKinds
										.map(titleCaseFromEvidence)
										.join(" or ")}`,
									evidenceKinds: item.evidenceKinds,
									required: true,
									notes: compactList([
										item.carryForward
											? "Carry-forward is allowed when the profile evidence remains in window."
											: null,
										item.allowsWaiver
											? "This requirement can be intentionally waived with an audit trail."
											: null,
									]),
									sourceRefs: [
										{
											label: item.title,
											sourcePath: `${FIXTURE_BASE_PATH}/txm-baseline.json`,
											pointer: `requirements[${index}]`,
										},
									],
								},
							],
							sourceRefs: [
								{
									label: item.title,
									sourcePath: `${FIXTURE_BASE_PATH}/txm-baseline.json`,
									pointer: `requirements[${index}]`,
								},
							],
						},
					],
					validityRules: buildTxmRules(item),
				},
				guidanceByAudience: {
					internal: item.notes.join("\n\n"),
					worker:
						item.scope === "placement"
							? "Placement-specific evidence will be checked in the context of the current booking."
							: "Profile evidence can carry forward when still in review window.",
					affiliate: item.allowsWaiver
						? "An intentional client waiver should stay attached to the requirement audit trail."
						: null,
				},
				sourceRefs: [
					{
						label: item.title,
						sourcePath: `${FIXTURE_BASE_PATH}/txm-baseline.json`,
						pointer: `requirements[${index}]`,
					},
				],
			};
		},
	);

	return {
		sourceEnvelope: {
			sourceType: scenario.sourceType,
			scenarioId: scenario.id,
			scenarioName: scenario.name,
			description: scenario.description,
		},
		placementContext: context,
		requirements: requirements.map(attachConditionTree),
		guidance: {
			notes: [
				`Placement review cadence: ${payload.placementReviewCadenceMonths} months`,
				"TXM is deliberately flatter than MedSol, but it should still compile into the same canonical graph shape.",
			],
		},
		provenance: {
			adapterId: "txm-requirement-adapter",
			compilationNotes: [
				"Each TXM item compiles into one canonical requirement with a default single path.",
				"Review cadence is modelled separately from physical expiry.",
				"No source concept is intentionally discarded; waiver and carry-forward concepts remain explicit in guidance and diagnostics.",
			],
		},
	} satisfies CanonicalGraph;
}

export const medsolProtocolBuilderAdapter: RequirementSourceAdapter<MedsolConditionalAssetPayload> =
	{
		id: "medsol-protocol-builder-adapter",
		canHandle(sourceType) {
			return sourceType === "medsol-protocol-builder";
		},
		compileToCanonicalGraph(payload, scenario, context, options) {
			switch (scenario.id) {
				case "medsol-mmr":
					return buildMedsolMmrGraph(payload, scenario, context, options);
				case "medsol-hep-b":
					return buildMedsolHepBGraph(payload, scenario, context, options);
				case "medsol-tb":
					return buildMedsolTbGraph(payload, scenario, context, options);
				default:
					throw new Error(
						`No MedSol adapter blueprint is defined for scenario ${scenario.id}.`,
					);
			}
		},
	};

export const txmRequirementAdapter: RequirementSourceAdapter<TxmRequirementPayload> =
	{
		id: "txm-requirement-adapter",
		canHandle(sourceType) {
			return sourceType === "txm-requirement-payload";
		},
		compileToCanonicalGraph(payload, scenario, context, _options) {
			return buildTxmGraph(payload, scenario, context);
		},
	};

export const requirementSourceAdapters = [
	medsolProtocolBuilderAdapter,
	txmRequirementAdapter,
];

export function getRequirementSourceAdapter(sourceType: string) {
	return requirementSourceAdapters.find((adapter) =>
		adapter.canHandle(sourceType),
	);
}

export function getAllEvidenceKinds(requirement: CanonicalRequirement) {
	return unique(
		requirement.satisfactionRule.paths.flatMap((path) =>
			path.steps.flatMap((step) => step.evidenceKinds),
		),
	);
}
