import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { myProvider } from "@/lib/ai/providers";
import { getAcceptableDocumentsByElementIds } from "@/lib/db/queries";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { complianceElements, evidence } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

const standardVerificationSchema = z.object({
	decision: z.enum(["approved", "rejected", "needs_review", "accepted"]),
	reasoning: z.string(),
	extractedFields: z
		.array(
			z.object({
				key: z.string().describe("Field name"),
				value: z.string().describe("Field value"),
			}),
		)
		.default([])
		.describe("Key-value pairs extracted from the document"),
	nextStep: z.string().nullable().optional(),
	matchedDocumentType: z.string().optional(),
});

const cvWorkHistoryItemSchema = z.object({
	employer: z.string().optional(),
	role: z.string().optional(),
	title: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	isCurrent: z.boolean().optional(),
	location: z.string().optional(),
	responsibilities: z.array(z.string()).optional(),
	specialty: z.string().optional(),
	environment: z.string().optional(),
});

const cvExtractionSchema = z.object({
	candidateName: z.string().optional(),
	location: z.string().optional(),
	email: z.string().optional(),
	phone: z.string().optional(),
	profession: z.string().optional(),
	yearsOfExperience: z.string().optional(),
	specialty: z.string().optional(),
	currentPosition: z.string().optional(),
	education: z.array(z.string()).optional(),
	licenses: z.array(z.string()).optional(),
	certifications: z.array(z.string()).optional(),
	skills: z.array(z.string()).optional(),
	workHistory: z.array(cvWorkHistoryItemSchema).default([]),
});

const cvVerificationSchema = z.object({
	decision: z.enum(["approved", "rejected", "needs_review", "accepted"]),
	reasoning: z.string(),
	extractedFields: cvExtractionSchema,
	nextStep: z.string().nullable().optional(),
	matchedDocumentType: z.string().optional(),
});

/** Determine media type from a URL */
function inferMediaType(url: string): string {
	const lower = url.toLowerCase().split("?")[0];
	if (lower.endsWith(".pdf")) return "application/pdf";
	if (lower.endsWith(".png")) return "image/png";
	if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
	if (lower.endsWith(".webp")) return "image/webp";
	if (lower.endsWith(".gif")) return "image/gif";
	return "image/jpeg";
}

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ id: string }> },
) {
	try {
		const params = await props.params;
		const body = await request.json();
		const { elementSlug, organisationId, profileId, documentUrl } = body;

		if (!elementSlug || !organisationId || !documentUrl) {
			return NextResponse.json(
				{ error: "elementSlug, organisationId, and documentUrl are required" },
				{ status: 400 },
			);
		}

		// Look up element ID from slug
		const [element] = await db
			.select({ id: complianceElements.id, name: complianceElements.name })
			.from(complianceElements)
			.where(
				and(
					eq(complianceElements.slug, elementSlug),
					eq(complianceElements.organisationId, organisationId),
				),
			);

		if (!element) {
			return NextResponse.json(
				{ error: "Compliance element not found" },
				{ status: 404 },
			);
		}

		// Fetch all acceptable documents for this element
		const acceptableDocs = await getAcceptableDocumentsByElementIds({
			elementIds: [element.id],
		});

		const hasCriteria = acceptableDocs.length > 0;
		const isResumeCv = elementSlug === "resume-cv";

		// Build criteria block for each acceptable document type (if any)
		const criteriaBlock = hasCriteria
			? acceptableDocs
					.map((doc, i) => {
						const label = `${i + 1}. ${doc.name} [${doc.status.toUpperCase()}]`;
						const criteria =
							doc.acceptanceCriteria || "No specific criteria defined.";
						return `${label}\n${criteria}`;
					})
					.join("\n\n")
			: null;

		const mediaType = inferMediaType(documentUrl);

		const systemPrompt = hasCriteria
			? `You are a compliance document verification specialist for healthcare staffing. Your job is to examine a document and determine whether it meets the acceptance criteria for a compliance requirement.

The requirement accepts multiple document types. First identify what type of document has been submitted, then check it against the matching criteria.

You must be precise and reference specific criteria when explaining your decision. If a document partially meets criteria, explain exactly what is missing or unclear.`
			: `You are a compliance document verification specialist for healthcare staffing. Your job is to examine a document and determine whether it appears to be a valid, authentic document for the given compliance requirement.

Since no specific acceptance criteria are defined, use your professional judgement to assess: is this the right type of document? Does it appear complete, legible, and authentic? Extract any relevant fields.`;

		const userPrompt = hasCriteria
			? `Compliance requirement: ${element.name}

ACCEPTABLE DOCUMENT TYPES AND CRITERIA:

${criteriaBlock}

Please examine the attached document and determine:
1. Which acceptable document type does this match (if any)?
2. Does it satisfy ALL the acceptance criteria for that type?
3. Extract any relevant fields (names, dates, results, etc.)

Be strict — if any required element is missing or unclear, the document should be rejected or flagged for review. If the document doesn't match any of the acceptable types, reject it and explain why.`
			: `Compliance requirement: ${element.name}

No specific acceptance criteria are defined for this requirement. Please examine the attached document and determine:
1. What type of document is this?
2. Does it appear to be a valid document for the "${element.name}" compliance requirement?
3. Is it complete, legible, and authentic-looking?
4. Extract any relevant fields (names, dates, results, etc.)

Use your best judgement. Flag for review if anything looks incomplete or questionable.`;

		const schema = isResumeCv
			? cvVerificationSchema
			: standardVerificationSchema;
		const result = await generateObject({
			model: myProvider.languageModel("chat-model"),
			schema,
			messages: [
				{
					role: "system",
					content: `${systemPrompt}

Return a structured object matching the output schema exactly.
${isResumeCv ? "\nFor CV extraction, extract full work history into extractedFields.workHistory as an ARRAY of objects, one per role (do not merge into a single text field). Include employer, role, startDate, endDate, isCurrent, location, and responsibilities where available. Capture all visible roles." : ""}`,
				},
				{
					role: "user",
					content: [
						{
							type: "text",
							text: userPrompt,
						},
						{
							type: "file",
							data: new URL(documentUrl),
							mediaType,
						},
					],
				},
			],
		});

		const parsed = result.object;

		// Normalise legacy "accepted" → "approved"
		const decision =
			parsed.decision === "accepted"
				? "approved"
				: parsed.decision || "needs_review";
		const reasoning = parsed.reasoning || "No reasoning provided";
		const extractedFields: Record<string, unknown> = Array.isArray(
			parsed.extractedFields,
		)
			? Object.fromEntries(parsed.extractedFields.map((f) => [f.key, f.value]))
			: typeof parsed.extractedFields === "object" &&
					parsed.extractedFields !== null
				? (parsed.extractedFields as Record<string, unknown>)
				: {};
		const matchedDocumentType =
			parsed.matchedDocumentType ||
			(isResumeCv ? "Professional Resume/CV" : "Unknown");

		// Persist verification results to evidence record
		const [evidenceRecord] = await db
			.select({ id: evidence.id })
			.from(evidence)
			.where(
				and(
					eq(evidence.complianceElementId, element.id),
					eq(evidence.organisationId, organisationId),
					...(profileId ? [eq(evidence.profileId, profileId)] : []),
				),
			);

		if (evidenceRecord) {
			const evidenceStatus =
				decision === "approved"
					? ("approved" as const)
					: decision === "rejected"
						? ("rejected" as const)
						: ("requires_review" as const);

			await db
				.update(evidence)
				.set({
					verificationStatus: "auto_verified",
					status: evidenceStatus,
					extractedData: {
						...extractedFields,
						_verification: {
							decision,
							reasoning,
							matchedDocumentType,
							nextStep: parsed.nextStep || null,
							verifiedAt: new Date().toISOString(),
						},
					},
					verifiedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(evidence.id, evidenceRecord.id));
		}

		return NextResponse.json({
			placementId: params.id,
			elementSlug,
			decision,
			reasoning,
			extractedFields,
			nextStep: parsed.nextStep || null,
			matchedDocumentType,
		});
	} catch (error) {
		console.error("Failed to verify document:", error);
		return NextResponse.json(
			{
				error: `Verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
			{ status: 500 },
		);
	}
}
