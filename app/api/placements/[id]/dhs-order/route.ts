import { NextRequest, NextResponse } from "next/server";
import {
	getPlacementById,
	getProfileById,
	getFAScreeningsByProfileId,
	upsertFAScreening,
} from "@/lib/db/queries";
import { getFAClient } from "@/lib/api/first-advantage/client";
import {
	toAlacarteItems,
	DHS_PRODUCTS,
} from "@/lib/api/first-advantage/dhs-catalogue";

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ id: string }> },
) {
	try {
		const params = await props.params;
		const body = await request.json();
		const { productCodes } = body as { productCodes?: string[] };

		if (
			!productCodes ||
			!Array.isArray(productCodes) ||
			productCodes.length === 0
		) {
			return NextResponse.json(
				{ error: "productCodes array is required" },
				{ status: 400 },
			);
		}

		// Validate all codes exist in catalogue
		const invalidCodes = productCodes.filter((c) => !DHS_PRODUCTS[c]);
		if (invalidCodes.length > 0) {
			return NextResponse.json(
				{ error: `Unknown product codes: ${invalidCodes.join(", ")}` },
				{ status: 400 },
			);
		}

		// Look up placement
		const placement = await getPlacementById({ id: params.id });
		if (!placement) {
			return NextResponse.json(
				{ error: "Placement not found" },
				{ status: 404 },
			);
		}

		// Look up profile
		const profile = await getProfileById({ id: placement.profileId });
		if (!profile) {
			return NextResponse.json({ error: "Profile not found" }, { status: 404 });
		}

		const client = getFAClient();

		// Get or create FA candidate
		let faCandidateId: string;
		const existingScreenings = await getFAScreeningsByProfileId({
			profileId: profile.id,
		});

		if (existingScreenings.length > 0 && existingScreenings[0].faCandidateId) {
			faCandidateId = existingScreenings[0].faCandidateId;
		} else {
			try {
				const candidate = await client.createCandidate({
					givenName: profile.firstName,
					familyName: profile.lastName,
					email: profile.email,
					clientReferenceId: profile.id,
					dob: profile.dateOfBirth
						? new Date(profile.dateOfBirth).toISOString().split("T")[0]
						: undefined,
				});
				faCandidateId = candidate.id;
			} catch (err) {
				// 409 = candidate already exists in FA (e.g. created by background screening agent)
				if (err instanceof Error && err.message.includes("409")) {
					// Try local DB first
					const retryScreenings = await getFAScreeningsByProfileId({
						profileId: profile.id,
					});
					const existingId = retryScreenings.find(
						(s) => s.faCandidateId,
					)?.faCandidateId;
					if (existingId) {
						faCandidateId = existingId;
					} else {
						// Fall back to searching FA API by email
						const existing = await client.findCandidateByEmail(profile.email);
						if (existing) {
							faCandidateId = existing.id;
						} else {
							throw new Error("FA candidate exists but could not be resolved");
						}
					}
				} else {
					throw err;
				}
			}
		}

		// Build alacarte items
		const alacarte = toAlacarteItems(productCodes);

		// Build drug object (required for D&OHS clinic routing)
		const address = profile.address;
		const drug = {
			sex: (profile.sex || "male") as "male" | "female",
			reasonForTest: "PRE_EMPLOYMENT",
			siteSelectionAddress: {
				addressLine: address?.line1 || "123 Main St",
				municipality: address?.city || "Orlando",
				regionCode: address?.state
					? `US-${address.state.toUpperCase()}`
					: "US-FL",
				postalCode: address?.postcode || "32801",
			},
		};

		// Initiate screening
		const screening = await client.initiateScreening({
			candidateId: faCandidateId,
			alacarte,
			drug,
		});

		// Persist
		const record = await upsertFAScreening({
			organisationId: placement.organisationId,
			profileId: profile.id,
			placementId: placement.id,
			faScreeningId: screening.id,
			faCandidateId,
			faPackageId: "alacarte",
			status: screening.status as "Pending" | "In Progress" | "Complete",
			result: screening.result as "Pending" | "Clear" | "Consider" | "Adverse",
			reportItems: screening.reportItems,
			portalUrl: screening.links?.admin?.web ?? null,
			estimatedCompletionAt: screening.estimatedCompletionTime
				? new Date(screening.estimatedCompletionTime)
				: null,
			rawResponse: screening as unknown as Record<string, unknown>,
		});

		return NextResponse.json(record);
	} catch (error) {
		console.error("D&OHS order failed:", error);
		return NextResponse.json(
			{ error: "Failed to place D&OHS order" },
			{ status: 500 },
		);
	}
}
