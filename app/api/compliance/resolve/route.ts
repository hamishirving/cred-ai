import { NextRequest, NextResponse } from "next/server";
import {
	resolvePlacementRequirements,
	type RequirementGroup,
} from "@/lib/compliance/resolve-requirements";

export interface ResolveResponse {
	groups: RequirementGroup[];
	summary: {
		total: number;
		candidateScoped: number;
		placementScoped: number;
		faHandled: number;
		carryForwardEligible: number;
	};
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			organisationId,
			roleSlug,
			jurisdiction,
			facilityType,
			isLapseDeal,
			stateRequiresOigSam,
			facilityRequiresOigSam,
		} = body;

		if (!organisationId || !roleSlug) {
			return NextResponse.json(
				{
					error: "organisationId and roleSlug are required",
				},
				{ status: 400 },
			);
		}

		const groups = await resolvePlacementRequirements(organisationId, {
			roleSlug,
			jurisdiction: jurisdiction || "",
			facilityType: facilityType || "",
			isLapseDeal: isLapseDeal ?? false,
			stateRequiresOigSam: stateRequiresOigSam ?? false,
			facilityRequiresOigSam: facilityRequiresOigSam ?? false,
		});

		// Compute summary from resolved groups
		const allElements = groups.flatMap((g) => g.elements);
		const candidateScoped = allElements.filter(
			(e) => e.scope === "candidate",
		).length;
		const placementScoped = allElements.filter(
			(e) => e.scope === "placement",
		).length;
		const faHandled = allElements.filter((e) => e.faHandled).length;
		const carryForwardEligible = allElements.filter(
			(e) => e.scope === "candidate" && !e.expiryDays,
		).length;

		const response: ResolveResponse = {
			groups,
			summary: {
				total: allElements.length,
				candidateScoped,
				placementScoped,
				faHandled,
				carryForwardEligible,
			},
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Failed to resolve compliance requirements:", error);
		return NextResponse.json(
			{ error: "Failed to resolve compliance requirements" },
			{ status: 500 },
		);
	}
}
