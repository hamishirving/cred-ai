import { NextRequest, NextResponse } from "next/server";
import { getWorkNodeDetail } from "@/lib/db/queries";

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ id: string }> },
) {
	try {
		const params = await props.params;
		const detail = await getWorkNodeDetail({ id: params.id });

		if (!detail) {
			return NextResponse.json(
				{ error: "Facility not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json(detail);
	} catch (error) {
		console.error("Failed to fetch facility:", error);
		return NextResponse.json(
			{ error: "Failed to fetch facility" },
			{ status: 500 },
		);
	}
}
