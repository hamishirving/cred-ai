import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { organisations } from "@/lib/db/schema";
import { SYSTEM_PROMPT } from "@/lib/ai/agents/compliance-companion/prompts";

// Database connection
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

/**
 * POST /api/organisations/[id]/preview-email
 * Generate a sample email preview using the org's AI settings
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();

		// Get organisation
		const [org] = await db
			.select()
			.from(organisations)
			.where(eq(organisations.id, id))
			.limit(1);

		if (!org) {
			return NextResponse.json(
				{ error: "Organisation not found" },
				{ status: 404 },
			);
		}

		const orgPrompt = body.orgPrompt || "";
		const complianceContact = body.complianceContact || {
			name: "Compliance Team",
			email: `compliance@${org.slug}.com`,
		};

		// Build sample context
		const sampleContext = `## Candidate Information

Name: Sarah Thompson
Email: sarah.thompson@email.com
Role: Band 5 Nurse
Start Date: Monday, 13 January (7 days away)
Days in Onboarding: 12

## Compliance Status

Progress: 5 of 7 items complete (71%)

### Items Needing Candidate Action (1)
- DBS Certificate: Upload your DBS Certificate

### Items We're Reviewing (0)
None currently under review

### Items With External Providers (1)
- Employment Reference: Awaiting response from previous employer

## Communication History

Days Since Last Email: 2
Total Emails Sent: 3

## Organisation

Name: ${org.name}
Compliance Contact: ${complianceContact.name} (${complianceContact.email})
${complianceContact.phone ? `Phone: ${complianceContact.phone}` : ""}`;

		const orgLayer = orgPrompt
			? `\n## Organisation Voice\n\n${orgPrompt}\n`
			: "";

		const fullPrompt = `${SYSTEM_PROMPT}
${orgLayer}
---

${sampleContext}

---

Now generate a sample email for this candidate. This is a preview to show how emails will look with the current settings.

Return your response as a JSON object with "subject", "body", and "reasoning" fields.`;

		// Generate email using AI
		const anthropic = createAnthropic({
			apiKey: process.env.ANTHROPIC_API_KEY,
		});

		const result = await generateText({
			model: anthropic("claude-sonnet-4-5"),
			prompt: fullPrompt,
			maxTokens: 1000,
		});

		// Parse JSON response
		const text = result.text.trim();
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("No JSON object found in response");
		}

		const parsed = JSON.parse(jsonMatch[0]);

		return NextResponse.json({
			email: {
				to: "sarah.thompson@email.com",
				subject: parsed.subject || "Sample compliance update",
				body: parsed.body || "Sample email body",
			},
			reasoning: parsed.reasoning,
		});
	} catch (error) {
		console.error("Failed to generate preview email:", error);
		return NextResponse.json(
			{ error: "Failed to generate preview email" },
			{ status: 500 },
		);
	}
}
