import { NextRequest, NextResponse } from "next/server";
import { getPlacementById } from "@/lib/db/queries";
import {
	checkPlacementCompliance,
	resolvePlacementRequirements,
	type PlacementContext,
} from "@/lib/compliance/resolve-requirements";

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ id: string }> },
) {
	try {
		const params = await props.params;
		const placement = await getPlacementById({ id: params.id });

		if (!placement) {
			return NextResponse.json(
				{ error: "Placement not found" },
				{ status: 404 },
			);
		}

		// Build placement context for compliance resolution
		const context: PlacementContext = {
			roleSlug: placement.roleSlug,
			jurisdiction: placement.jurisdiction || "florida",
			facilityType: placement.facilityType,
			isLapseDeal: placement.dealType === "lapse",
		};

		// Resolve requirements and check compliance
		const [groups, compliance] = await Promise.all([
			resolvePlacementRequirements(placement.organisationId, context),
			checkPlacementCompliance(
				placement.organisationId,
				placement.profileId,
				context,
			),
		]);

		return NextResponse.json({
			placement,
			context,
			requirementGroups: groups,
			compliance,
		});
	} catch (error) {
		console.error("Failed to fetch placement:", error);
		return NextResponse.json(
			{ error: "Failed to fetch placement" },
			{ status: 500 },
		);
	}
}
