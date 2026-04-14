import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { auth } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";
import { proseExtractionSchema } from "@/lib/requirement-compiler/extraction-schema";

const bodySchema = z.object({
	sourceType: z.string(),
	displayName: z.string(),
	prose: z.string().min(10),
	groupLabels: z.array(z.string()).min(1),
});

const SYSTEM_PROMPT = `You interpret healthcare-compliance protocol payloads from vendors such as MedSol and return a structured canonical representation.

You receive:
1. A payload header (vendor name, protocol display name, source type).
2. A list of protocol-asset group labels — these are the OR paths a candidate can take to satisfy the protocol.
3. The prose "instructions" text that describes the actual acceptance rules for the protocol.

For each group label provided, infer:
- The kinds of evidence that satisfy the path (snake_case identifiers like vaccination_record, lab_titer, declination_form, chest_xray, signed_form).
- Validity rules (time windows, review cadences, collection-date constraints).
- Result predicates (when evidence content routes the candidate — e.g. a negative titer result routing to a booster-or-declination path).
- Whether multiple steps within a path must all be satisfied together (AND groups).
- Whether a step triggers a follow-on dependency (e.g. positive result triggering clinical escalation).

Rules:
- Use EXACT group labels as provided. Do not rename them.
- If the prose does not describe a concept, omit it — do not invent.
- Prefer snake_case for evidence kinds and field paths.
- Field paths follow dot notation (e.g. lab_result.interpretation).
- Be precise: if the prose says "28 days", use within_days_of_start with value 28, not within_months_of_start.
- For rules about evidence format/content (e.g. "must be signed", "must include collection date"), use type "content_requirement". Do not use time-window types for these.
- Return one group entry per provided group label, even if some fields are empty.
- For every step, validity rule, and result predicate you emit, include a sourceQuote field with the exact short snippet from the instruction prose that supports it. This is for user transparency. Keep quotes under 120 characters. If no snippet directly supports a field, leave sourceQuote empty.`;

export async function POST(request: Request) {
	const session = await auth();
	if (!session?.user) {
		return new ChatSDKError("unauthorized:chat").toResponse();
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid JSON body" },
			{ status: 400 },
		);
	}

	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid request", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { sourceType, displayName, prose, groupLabels } = parsed.data;

	try {
		const userPrompt = `Source vendor: ${sourceType}
Protocol display name: ${displayName}

Group labels (return one output entry per label, preserving order and exact text):
${groupLabels.map((label, index) => `${index + 1}. ${label}`).join("\n")}

Instruction prose:
"""
${prose}
"""`;

		const result = await generateObject({
			model: myProvider.languageModel("chat-model"),
			schema: proseExtractionSchema,
			messages: [
				{
					role: "system",
					content: SYSTEM_PROMPT,
					providerOptions: {
						anthropic: { cacheControl: { type: "ephemeral" } },
					},
				},
				{
					role: "user",
					content: userPrompt,
				},
			],
		});

		return NextResponse.json({
			extraction: result.object,
			usage: {
				inputTokens: result.usage?.inputTokens ?? null,
				outputTokens: result.usage?.outputTokens ?? null,
				totalTokens: result.usage?.totalTokens ?? null,
			},
			model: "claude-sonnet-4-5",
			generatedAt: new Date().toISOString(),
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Extraction failed",
				detail: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
