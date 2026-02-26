/**
 * FA Initiate Screening Tool
 *
 * Initiates a background screening through First Advantage
 * and persists the record to the fa_screenings table.
 */

import { tool } from "ai";
import { z } from "zod";
import { getFAClient } from "@/lib/api/first-advantage/client";
import { upsertFAScreening, getActivePlacementByProfileId } from "@/lib/db/queries";

export const faInitiateScreening = tool({
	description: `Initiate a background screening through First Advantage.
Requires a candidate ID (from faCreateCandidate) and a package ID (from faSelectPackage).
Also requires organisationId and profileId for DB persistence. The placement is auto-resolved.
Returns the screening ID for status tracking.

For drug/health screenings, provide drugScreening with the candidate's sex and address.
FA uses the address to route the candidate to the nearest collection clinic.`,

	inputSchema: z.object({
		candidateId: z
			.string()
			.describe("FA candidate ID from faCreateCandidate"),
		packageId: z
			.string()
			.describe("FA package ID from faSelectPackage"),
		organisationId: z
			.string()
			.describe("Organisation UUID for multi-tenant scoping"),
		profileId: z
			.string()
			.describe("Candidate profile UUID from local DB"),
		drugScreening: z
			.object({
				sex: z.enum(["male", "female"]).describe("Candidate's sex from their profile"),
				addressLine: z.string(),
				municipality: z.string(),
				regionCode: z.string().describe("ISO 3166-2 state code, e.g. US-FL"),
				postalCode: z.string(),
			})
			.optional()
			.describe("Required when package includes drug/health screening. Candidate's sex and address for clinic routing."),
	}),

	execute: async (input) => {
		try {
			const client = getFAClient();
			const screening = await client.initiateScreening({
				candidateId: input.candidateId,
				packageId: input.packageId,
				...(input.drugScreening ? {
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
				} : {}),
			});

			// Auto-resolve placement from profile + org
			const placement = await getActivePlacementByProfileId({
				profileId: input.profileId,
				organisationId: input.organisationId,
			});

			// Persist to DB
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
