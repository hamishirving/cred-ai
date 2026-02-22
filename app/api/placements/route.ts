import { NextRequest, NextResponse } from "next/server";
import { getPlacementsByOrganisationId } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const organisationId = searchParams.get("organisationId");

		if (!organisationId) {
			return NextResponse.json(
				{ error: "organisationId is required" },
				{ status: 400 },
			);
		}

		const placements = await getPlacementsByOrganisationId({ organisationId });

		return NextResponse.json({ placements });
	} catch (error) {
		console.error("Failed to fetch placements:", error);
		return NextResponse.json(
			{ error: "Failed to fetch placements" },
			{ status: 500 },
		);
	}
}
