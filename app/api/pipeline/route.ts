import { NextRequest, NextResponse } from "next/server";
import { getDefaultProfilePipeline } from "@/lib/db/queries";

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

		const pipeline = await getDefaultProfilePipeline({ organisationId });

		return NextResponse.json({ pipeline });
	} catch (error) {
		console.error("Failed to fetch pipeline:", error);
		return NextResponse.json(
			{ error: "Failed to fetch pipeline" },
			{ status: 500 },
		);
	}
}
