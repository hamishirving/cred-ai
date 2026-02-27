import { NextRequest, NextResponse } from "next/server";
import {
	getFAScreeningsByProfileId,
	getPlacementById,
	getProfileById,
	upsertFAScreening,
} from "@/lib/db/queries";
import { getFAClient } from "@/lib/api/first-advantage/client";
import { buildFACandidatePayloadFromProfile } from "@/lib/api/first-advantage/candidate-payload";
import { DHS_PRODUCTS, toAlacarteItems } from "@/lib/api/first-advantage/dhs-catalogue";

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ id: string }> },
) {
	try {
		const params = await props.params;
		const body = await request.json();
		const { productCodes } = body as { productCodes?: string[] };

		if (!productCodes || !Array.isArray(productCodes) || productCodes.length === 0) {
			return NextResponse.json(
				{ error: "productCodes array is required" },
				{ status: 400 },
			);
		}

		const invalidCodes = productCodes.filter((code) => !DHS_PRODUCTS[code]);
		if (invalidCodes.length > 0) {
			return NextResponse.json(
				{ error: `Unknown product codes: ${invalidCodes.join(", ")}` },
				{ status: 400 },
			);
		}

		const placement = await getPlacementById({ id: params.id });
		if (!placement) {
			return NextResponse.json({ error: "Placement not found" }, { status: 404 });
		}

		const profile = await getProfileById({ id: placement.profileId });
		if (!profile) {
			return NextResponse.json({ error: "Profile not found" }, { status: 404 });
		}

		const client = getFAClient();
		const candidatePayload = buildFACandidatePayloadFromProfile(profile);

		let faCandidateId: string;
		let createdNewCandidate = false;
		const existingScreenings = await getFAScreeningsByProfileId({
			profileId: profile.id,
		});

		if (existingScreenings.length > 0 && existingScreenings[0].faCandidateId) {
			faCandidateId = existingScreenings[0].faCandidateId;
		} else {
			try {
				const candidate = await client.createCandidate(candidatePayload);
				faCandidateId = candidate.id;
				createdNewCandidate = true;
			} catch (error) {
				if (!(error instanceof Error) || !error.message.includes("409")) {
					throw error;
				}

				const retryScreenings = await getFAScreeningsByProfileId({
					profileId: profile.id,
				});
				const existingId = retryScreenings.find(
					(screening) => screening.faCandidateId,
				)?.faCandidateId;

				if (existingId) {
					faCandidateId = existingId;
				} else {
					const existing = await client.findCandidateByEmail(profile.email);
					if (!existing) {
						throw new Error("FA candidate exists but could not be resolved");
					}
					faCandidateId = existing.id;
				}
			}
		}

		// Reused candidates may have stale payloads from earlier flows.
		if (!createdNewCandidate) {
			await client.updateCandidate(faCandidateId, candidatePayload);
		}

		const alacarte = toAlacarteItems(productCodes);
		const address = profile.address;
		const drug = {
			sex: (profile.sex || "male") as "male" | "female",
			reasonForTest: "PRE_EMPLOYMENT",
			siteSelectionAddress: {
				addressLine: address?.line1 || "123 Main St",
				municipality: address?.city || "Orlando",
				regionCode: address?.state ? `US-${address.state.toUpperCase()}` : "US-FL",
				postalCode: address?.postcode || "32801",
			},
		};

		const screening = await client.initiateScreening({
			candidateId: faCandidateId,
			alacarte,
			drug,
		});

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
