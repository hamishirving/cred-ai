import { NextResponse } from "next/server";
import { getAllOrganisations } from "@/lib/db/queries";

export async function GET() {
	try {
		const organisations = await getAllOrganisations();
		return NextResponse.json({ organisations });
	} catch (error) {
		console.error("Failed to fetch organisations:", error);
		return NextResponse.json(
			{ error: "Failed to fetch organisations" },
			{ status: 500 },
		);
	}
}
