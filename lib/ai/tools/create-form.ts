import { tool } from "ai";
import { z } from "zod";

// Schema for form fields
const formFieldSchema = z.object({
	id: z.string().describe("Unique field identifier"),
	type: z
		.enum([
			"text",
			"textarea",
			"email",
			"number",
			"select",
			"radio",
			"checkbox",
			"rating",
			"date",
		])
		.describe("Field type"),
	label: z.string().describe("Field label shown to user"),
	placeholder: z.string().optional().describe("Placeholder text"),
	required: z.boolean().default(true).describe("Whether field is required"),
	defaultValue: z
		.union([z.string(), z.number(), z.boolean()])
		.optional()
		.describe("Pre-populated default value for the field"),
	options: z
		.array(
			z.object({
				value: z.string(),
				label: z.string(),
			}),
		)
		.optional()
		.describe("Options for select/radio fields"),
	min: z.number().optional().describe("Min value for number/rating"),
	max: z.number().optional().describe("Max value for number/rating"),
});

const formSchema = z.object({
	title: z.string().describe("Form title"),
	description: z.string().optional().describe("Form description/instructions"),
	fields: z.array(formFieldSchema).describe("Form fields"),
	submitLabel: z.string().default("Submit").describe("Submit button text"),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type FormSchema = z.infer<typeof formSchema>;

export const createForm = tool({
	description: `Create a simple, focused web form based on the user's requirements. Use this when the user asks to:
- Create a form, survey, or questionnaire
- Build an evaluation or feedback form
- Generate a data collection form

IMPORTANT: Keep forms SHORT and SIMPLE:
- Maximum 4-6 fields unless user explicitly requests more
- Prefer simple field types (text, textarea, radio, rating)
- Only add fields that are essential to the form's purpose
- Avoid over-engineering - a feedback form needs 2-3 fields, not 10`,

	inputSchema: z.object({
		title: z.string().describe("Form title"),
		description: z.string().optional().describe("Form description"),
		fields: z.array(formFieldSchema).describe("Array of form fields"),
		submitLabel: z.string().default("Submit").describe("Submit button label"),
	}),

	execute: async (input): Promise<FormSchema> => {
		// The AI generates the form schema, we just pass it through
		return {
			title: input.title,
			description: input.description,
			fields: input.fields,
			submitLabel: input.submitLabel,
		};
	},
});
