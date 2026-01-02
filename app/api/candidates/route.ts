import { NextRequest, NextResponse } from "next/server";
import { getCandidatesByOrganisationId } from "@/lib/db/queries";

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

		const candidates = await getCandidatesByOrganisationId({ organisationId });

		return NextResponse.json({ candidates });
	} catch (error) {
		console.error("Failed to fetch candidates:", error);
		return NextResponse.json(
			{ error: "Failed to fetch candidates" },
			{ status: 500 },
		);
	}
}
