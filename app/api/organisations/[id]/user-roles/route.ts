import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userRoles } from "@/lib/db/schema";

/**
 * GET /api/organisations/[id]/user-roles
 *
 * Returns all user roles for a specific organisation.
 * Used by the registration form to populate the role dropdown.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;

		const roles = await db
			.select({
				id: userRoles.id,
				name: userRoles.name,
				slug: userRoles.slug,
				description: userRoles.description,
				isDefault: userRoles.isDefault,
			})
			.from(userRoles)
			.where(eq(userRoles.organisationId, id));

		return NextResponse.json({ roles });
	} catch (error) {
		console.error("Failed to fetch user roles:", error);
		return NextResponse.json(
			{ error: "Failed to fetch user roles" },
			{ status: 500 }
		);
	}
}
