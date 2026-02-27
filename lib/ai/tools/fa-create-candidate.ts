/**
 * FA Create Candidate Tool
 *
 * Creates a candidate in First Advantage for background screening.
 * Candidate must have all requiredFields from the target package filled in
 * before a screening can be initiated.
 */

import { tool } from "ai";
import { z } from "zod";
import { getFAClient } from "@/lib/api/first-advantage/client";
import {
	buildFACandidatePayload,
	isUuid,
} from "@/lib/api/first-advantage/candidate-payload";
import { getProfileById } from "@/lib/db/queries";

export const faCreateCandidate = tool({
	description: `Create a candidate in First Advantage for background screening.
Must be called before initiating a screening. Returns the FA candidate ID needed for screening.
The candidate needs: name, email, dob, ssn, address (with ISO 3166-2 regionCode like "US-FL"), and driversLicense if required by the package.
For packages 626709 and 626711, a licenses array is required.
If clientReferenceId is a local profile UUID, this tool auto-derives licenses[] from professionalRegistration.`,

	inputSchema: z.object({
		givenName: z.string().describe("Candidate first name"),
		familyName: z.string().describe("Candidate last name"),
		email: z.string().email().optional().describe("Candidate email"),
		clientReferenceId: z
			.string()
			.describe("Our internal reference (Credentially profile ID)"),
		dob: z.string().optional().describe("Date of birth (YYYY-MM-DD)"),
		ssn: z
			.string()
			.optional()
			.describe("Social Security Number (XXX-XX-XXXX)"),
		addressLine: z.string().optional().describe("Street address"),
		municipality: z.string().optional().describe("City"),
		regionCode: z
			.string()
			.optional()
			.describe("ISO 3166-2 state code (e.g. US-FL, US-TN)"),
		postalCode: z.string().optional().describe("ZIP code"),
		driversLicenseNumber: z
			.string()
			.optional()
			.describe("Driver's license number"),
		driversLicenseState: z
			.string()
			.optional()
			.describe("Driver's license issuing state (ISO 3166-2, e.g. US-FL)"),
		licenseNumber: z
			.string()
			.optional()
			.describe(
				"Professional license number (e.g. from professionalRegistration)",
			),
		licenseName: z
			.string()
			.optional()
			.describe("License name (e.g. 'Nursing License', 'RN License')"),
		licenseIssuingAgency: z
			.string()
			.optional()
			.describe("License issuing agency name (e.g. 'State Board of Nursing')"),
		professionalRegistration: z
			.string()
			.optional()
			.describe(
				"Professional registration from profile (used to derive FA licenses[] deterministically)",
			),
	}),

	execute: async (input) => {
		try {
			const client = getFAClient();
			const profile =
				isUuid(input.clientReferenceId)
					? await getProfileById({ id: input.clientReferenceId })
					: null;

			const profileDob =
				profile?.dateOfBirth instanceof Date
					? profile.dateOfBirth.toISOString().split("T")[0]
					: undefined;
			const profileAddress = profile?.address;

			const payload = buildFACandidatePayload({
				givenName: input.givenName || profile?.firstName || "",
				familyName: input.familyName || profile?.lastName || "",
				clientReferenceId: input.clientReferenceId,
				email: input.email || profile?.email,
				dob: input.dob || profileDob,
				ssn: input.ssn || profile?.nationalId,
				addressLine: input.addressLine || profileAddress?.line1,
				municipality: input.municipality || profileAddress?.city,
				regionCode: input.regionCode || profileAddress?.state,
				postalCode: input.postalCode || profileAddress?.postcode,
				driversLicenseNumber: input.driversLicenseNumber,
				driversLicenseState: input.driversLicenseState,
				licenseNumber: input.licenseNumber,
				licenseName: input.licenseName,
				licenseIssuingAgency: input.licenseIssuingAgency,
				professionalRegistration:
					input.professionalRegistration || profile?.professionalRegistration,
			});

			const candidateEmail = payload.email;
			if (candidateEmail) {
				let existing = null;
				try {
					existing = await client.findCandidateByEmail(candidateEmail);
				} catch {
					// Lookup failed — proceed with creation.
				}

				if (existing) {
					try {
						const updated = await client.updateCandidate(existing.id, payload);
						return {
							data: updated,
							note: "Candidate updated in FA with latest data",
						};
					} catch (error) {
						throw new Error(
							`Candidate already exists in FA but update failed: ${error instanceof Error ? error.message : String(error)}`,
						);
					}
				}
			}

			const candidate = await client.createCandidate(payload);
			return { data: candidate };
		} catch (error) {
			return {
				error: `Failed to create candidate: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
