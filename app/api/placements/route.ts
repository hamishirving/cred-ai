import { type NextRequest, NextResponse, connection } from "next/server";
import {
	checkPlacementCompliance,
	type PlacementContext,
} from "@/lib/compliance/resolve-requirements";
import { getPlacementsByOrganisationId } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
	await connection();
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

		const placementsWithLiveCompliance = await Promise.all(
			placements.map(async (placement) => {
				try {
					const context: PlacementContext = {
						roleSlug: placement.roleSlug,
						jurisdiction: placement.jurisdiction || "florida",
						facilityType: placement.facilityType,
						isLapseDeal: placement.dealType === "lapse",
					};

					const compliance = await checkPlacementCompliance(
						placement.organisationId,
						placement.profileId,
						context,
					);

					const percentage = compliance.summary.percentage;

					return {
						id: placement.id,
						candidateName: placement.candidateName,
						candidateEmail: placement.candidateEmail,
						roleName: placement.roleName,
						facilityName: placement.facilityName,
						jurisdiction: placement.jurisdiction,
						startDate: placement.startDate,
						status: placement.status,
						compliancePercentage: percentage,
						isCompliant: percentage >= 100,
						dealType: placement.dealType,
					};
				} catch (complianceError) {
					console.error(
						`Failed to compute live compliance for placement ${placement.id}:`,
						complianceError,
					);

					return {
						id: placement.id,
						candidateName: placement.candidateName,
						candidateEmail: placement.candidateEmail,
						roleName: placement.roleName,
						facilityName: placement.facilityName,
						jurisdiction: placement.jurisdiction,
						startDate: placement.startDate,
						status: placement.status,
						compliancePercentage: placement.compliancePercentage,
						isCompliant: placement.isCompliant,
						dealType: placement.dealType,
					};
				}
			}),
		);

		return NextResponse.json({ placements: placementsWithLiveCompliance });
	} catch (error) {
		console.error("Failed to fetch placements:", error);
		return NextResponse.json(
			{ error: "Failed to fetch placements" },
			{ status: 500 },
		);
	}
}
