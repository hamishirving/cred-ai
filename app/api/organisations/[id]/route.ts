import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { organisations } from "@/lib/db/schema";
import type { OrgSettings } from "@/lib/db/schema/organisations";

// Database connection
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

/**
 * GET /api/organisations/[id]
 * Get organisation details including settings
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

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

		return NextResponse.json({ organisation: org });
	} catch (error) {
		console.error("Failed to fetch organisation:", error);
		return NextResponse.json(
			{ error: "Failed to fetch organisation" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/organisations/[id]
 * Update organisation settings (partial update)
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();

		// Get current org
		const [currentOrg] = await db
			.select()
			.from(organisations)
			.where(eq(organisations.id, id))
			.limit(1);

		if (!currentOrg) {
			return NextResponse.json(
				{ error: "Organisation not found" },
				{ status: 404 },
			);
		}

		// Merge settings
		const currentSettings = (currentOrg.settings || {}) as OrgSettings;
		const newSettings: OrgSettings = {
			...currentSettings,
		};

		// Update AI companion settings if provided
		if (body.aiCompanion !== undefined) {
			newSettings.aiCompanion = {
				...currentSettings.aiCompanion,
				...body.aiCompanion,
			};
		}

		// Update compliance contact if provided
		if (body.complianceContact !== undefined) {
			newSettings.complianceContact = body.complianceContact;
		}

		// Update support contact if provided
		if (body.supportContact !== undefined) {
			newSettings.supportContact = body.supportContact;
		}

		// Update name if provided
		const updateData: { name?: string; settings: OrgSettings; updatedAt: Date } = {
			settings: newSettings,
			updatedAt: new Date(),
		};

		if (body.name) {
			updateData.name = body.name;
		}

		// Update org
		const [updatedOrg] = await db
			.update(organisations)
			.set(updateData)
			.where(eq(organisations.id, id))
			.returning();

		return NextResponse.json({ organisation: updatedOrg });
	} catch (error) {
		console.error("Failed to update organisation:", error);
		return NextResponse.json(
			{ error: "Failed to update organisation" },
			{ status: 500 },
		);
	}
}
