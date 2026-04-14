import { z } from "zod";

const branchingTypeSchema = z.enum([
	"single-step",
	"and-group",
	"result-dependent",
]);

const validityRuleTypeSchema = z.enum([
	"within_days_of_start",
	"within_months_of_start",
	"annual_review",
	"review_cadence",
	"physical_expiry",
	"window",
	"content_requirement",
]);

const predicateOperatorSchema = z.enum([
	"equals",
	"not_equals",
	"in",
	"contains",
	"lt",
	"lte",
	"gt",
	"gte",
	"exists",
]);

const predicateOutcomeSchema = z.enum([
	"satisfies_path",
	"routes_to_alternative_path",
	"requires_follow_on",
	"review_only",
]);

const validityRuleSchema = z.object({
	type: validityRuleTypeSchema.describe(
		"Pick content_requirement for format/metadata rules like 'must be signed' or 'must include date'. Pick within_days_of_start / within_months_of_start for collection-date windows. Pick annual_review or review_cadence for periodic review. Pick physical_expiry for hard expiry dates. Pick window for other time-boxed rules.",
	),
	description: z.string(),
	value: z.number().optional(),
	sourceQuote: z
		.string()
		.optional()
		.describe(
			"The exact snippet from the instruction prose that this rule was inferred from. Keep it short (<120 chars).",
		),
});

const resultPredicateSchema = z.object({
	label: z.string(),
	field: z.string().describe("Dotted path, e.g. 'lab_result.interpretation'."),
	operator: predicateOperatorSchema,
	values: z
		.array(z.string())
		.describe("Values compared against the field. Use a single-item array for scalar operators."),
	outcome: predicateOutcomeSchema,
	sourceQuote: z
		.string()
		.optional()
		.describe(
			"The exact snippet from the instruction prose that this predicate was inferred from. Keep it short (<120 chars).",
		),
});

const stepSchema = z.object({
	groupLabel: z
		.string()
		.describe("The msName of the protocolAssetGroup this step belongs to."),
	label: z.string().describe("Plain-English step label."),
	evidenceKinds: z
		.array(z.string())
		.describe(
			"Evidence kinds in snake_case, e.g. 'vaccination_record', 'lab_titer', 'declination_form'.",
		),
	validityRule: validityRuleSchema.optional(),
	resultPredicate: resultPredicateSchema.optional(),
	notes: z.array(z.string()).optional(),
	sourceQuote: z
		.string()
		.optional()
		.describe(
			"The exact snippet from the instruction prose that this step was inferred from. Keep it short (<120 chars).",
		),
});

const andGroupSchema = z.object({
	label: z.string(),
	stepLabels: z
		.array(z.string())
		.describe(
			"Step labels (matching the `label` field of this group's steps) that must all be satisfied together.",
		),
});

const dependencyEdgeSchema = z.object({
	label: z.string(),
	triggerStepLabel: z.string(),
	description: z.string(),
});

const groupSchema = z.object({
	groupLabel: z.string().describe("Exact msName of the protocolAssetGroup."),
	branchingType: branchingTypeSchema,
	description: z
		.string()
		.describe("One-sentence plain-English description of what this path accepts."),
	steps: z.array(stepSchema),
	andGroup: andGroupSchema.optional(),
	dependencyEdges: z.array(dependencyEdgeSchema).optional(),
});

export const proseExtractionSchema = z.object({
	summary: z
		.string()
		.describe(
			"One-sentence summary of what this protocol asset expresses, in plain English.",
		),
	groups: z
		.array(groupSchema)
		.describe(
			"One entry per protocolAssetGroup in the source payload. Preserve order and exact group labels.",
		),
});

export type ProseExtractionOutput = z.infer<typeof proseExtractionSchema>;
