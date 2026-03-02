/**
 * FA Initiate Screening Tool
 *
 * Initiates a background screening through First Advantage
 * and persists the record to the fa_screenings table.
 */

import { tool } from "ai";
import { z } from "zod";
import { getFAClient } from "@/lib/api/first-advantage/client";
import {
	buildFACandidatePayloadFromProfile,
	findMissingCandidateFields,
} from "@/lib/api/first-advantage/candidate-payload";
import {
	getActivePlacementByProfileId,
	getProfileById,
	upsertFAScreening,
} from "@/lib/db/queries";

function isRequiredDataError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return (
		message.includes("400#screening?required-data") ||
		message.includes("No credential data provided") ||
		message.includes("Please include valid credential data")
	);
}

async function repairCandidateFromProfile({
	client,
	candidateId,
	profileId,
}: {
	client: ReturnType<typeof getFAClient>;
	candidateId: string;
	profileId: string;
}) {
	const profile = await getProfileById({ id: profileId });
	if (!profile) {
		throw new Error(
			`Cannot repair FA candidate ${candidateId}: local profile ${profileId} not found`,
		);
	}

	const payload = buildFACandidatePayloadFromProfile(profile);
	await client.updateCandidate(candidateId, payload);
}

async function ensureCandidateMeetsPackageRequirements({
	client,
	candidateId,
	packageId,
	profileId,
}: {
	client: ReturnType<typeof getFAClient>;
	candidateId: string;
	packageId: string;
	profileId: string;
}) {
	const packages = await client.getPackages();
	const pkg = packages.find((entry) => entry.id === packageId);
	if (!pkg || !pkg.requiredFields || pkg.requiredFields.length === 0) {
		return;
	}

	let candidate = await client.getCandidate(candidateId);
	let missing = findMissingCandidateFields(candidate, pkg.requiredFields);

	if (missing.length > 0) {
		await repairCandidateFromProfile({ client, candidateId, profileId });
		candidate = await client.getCandidate(candidateId);
		missing = findMissingCandidateFields(candidate, pkg.requiredFields);
	}

	if (missing.length > 0) {
		throw new Error(
			`FA candidate is missing required package fields: ${missing.join(", ")}`,
		);
	}
}

export const faInitiateScreening = tool({
	description: `Initiate a background screening through First Advantage.
Requires a candidate ID (from faCreateCandidate) and a package ID (from faSelectPackage).
Also requires organisationId and profileId for DB persistence. The placement is auto-resolved.
Returns the screening ID for status tracking.

For drug/health screenings, provide drugScreening with the candidate's sex and address.
FA uses the address to route the candidate to the nearest collection clinic.`,

	inputSchema: z.object({
		candidateId: z.string().describe("FA candidate ID from faCreateCandidate"),
		packageId: z.string().describe("FA package ID from faSelectPackage"),
		organisationId: z
			.string()
			.describe("Organisation UUID for multi-tenant scoping"),
		profileId: z.string().describe("Candidate profile UUID from local DB"),
		drugScreening: z
			.object({
				sex: z.enum(["male", "female"]).describe("Candidate's sex from their profile"),
				addressLine: z.string(),
				municipality: z.string(),
				regionCode: z.string().describe("ISO 3166-2 state code, e.g. US-FL"),
				postalCode: z.string(),
			})
			.optional()
			.describe(
				"Required when package includes drug/health screening. Candidate's sex and address for clinic routing.",
			),
	}),

	execute: async (input) => {
		try {
			const client = getFAClient();
			const screeningRequest = {
				candidateId: input.candidateId,
				packageId: input.packageId,
				...(input.drugScreening
					? {
							drug: {
								sex: input.drugScreening.sex,
								reasonForTest: "Pre_Employment",
								applicantCopy: true,
								clientCopy: true,
								siteSelectionAddress: {
									addressLine: input.drugScreening.addressLine,
									municipality: input.drugScreening.municipality,
									regionCode: input.drugScreening.regionCode,
									postalCode: input.drugScreening.postalCode,
									countryCode: "US",
								},
							},
						}
					: {}),
			};

			await ensureCandidateMeetsPackageRequirements({
				client,
				candidateId: input.candidateId,
				packageId: input.packageId,
				profileId: input.profileId,
			});

			let screening;
			try {
				screening = await client.initiateScreening(screeningRequest);
			} catch (error) {
				if (!isRequiredDataError(error)) throw error;

				// Defensive retry path in case FA rejects stale credential payloads.
				await repairCandidateFromProfile({
					client,
					candidateId: input.candidateId,
					profileId: input.profileId,
				});
				screening = await client.initiateScreening(screeningRequest);
			}

			const placement = await getActivePlacementByProfileId({
				profileId: input.profileId,
				organisationId: input.organisationId,
			});

			await upsertFAScreening({
				organisationId: input.organisationId,
				profileId: input.profileId,
				placementId: placement?.id ?? null,
				faScreeningId: screening.id,
				faCandidateId: screening.candidateId,
				faPackageId: screening.packageId,
				status: screening.status as "Pending" | "In Progress" | "Complete",
				result: screening.result as "Pending" | "Clear" | "Consider" | "Adverse",
				reportItems: screening.reportItems,
				portalUrl: screening.links?.admin?.web ?? null,
				submittedAt: new Date(screening.submittedAt),
				estimatedCompletionAt: screening.estimatedCompletionTime
					? new Date(screening.estimatedCompletionTime)
					: null,
				rawResponse: screening as unknown as Record<string, unknown>,
			});

			return { data: screening };
		} catch (error) {
			return {
				error: `Failed to initiate screening: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
