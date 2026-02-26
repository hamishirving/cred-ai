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

export const faCreateCandidate = tool({
	description: `Create a candidate in First Advantage for background screening.
Must be called before initiating a screening. Returns the FA candidate ID needed for screening.
The candidate needs: name, email, dob, ssn, address (with ISO 3166-2 regionCode like "US-FL"), and driversLicense if required by the package.
For packages 626709 and 626711, a licenses array is required. Pass licenseNumber and licenseName from the candidate's professional registration.`,

	inputSchema: z.object({
		givenName: z.string().describe("Candidate first name"),
		familyName: z.string().describe("Candidate last name"),
		email: z.string().email().optional().describe("Candidate email"),
		clientReferenceId: z
			.string()
			.describe("Our internal reference (Credentially profile ID)"),
		dob: z
			.string()
			.optional()
			.describe("Date of birth (YYYY-MM-DD)"),
		ssn: z
			.string()
			.optional()
			.describe("Social Security Number (XXX-XX-XXXX)"),
		addressLine: z
			.string()
			.optional()
			.describe("Street address"),
		municipality: z
			.string()
			.optional()
			.describe("City"),
		regionCode: z
			.string()
			.optional()
			.describe("ISO 3166-2 state code (e.g. US-FL, US-TN)"),
		postalCode: z
			.string()
			.optional()
			.describe("ZIP code"),
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
			.describe("Professional license number (e.g. from professionalRegistration)"),
		licenseName: z
			.string()
			.optional()
			.describe("License name (e.g. 'Nursing License', 'RN License')"),
		licenseIssuingAgency: z
			.string()
			.optional()
			.describe("License issuing agency name (e.g. 'State Board of Nursing')"),
	}),

	execute: async (input) => {
		try {
			const client = getFAClient();

			// Build the candidate payload first — we may need it for create or update
			const buildPayload = () => {
			const payload: Record<string, unknown> = {
				givenName: input.givenName,
				familyName: input.familyName,
				clientReferenceId: input.clientReferenceId,
			};
			if (input.email) payload.email = input.email;
			if (input.dob) payload.dob = input.dob;
			if (input.ssn) payload.ssn = input.ssn;

			if (input.addressLine && input.regionCode) {
				payload.address = {
					addressLine: input.addressLine,
					municipality: input.municipality || "",
					regionCode: input.regionCode,
					postalCode: input.postalCode || "",
					countryCode: "US",
				};
			}

			if (input.driversLicenseNumber && input.driversLicenseState) {
				payload.driversLicense = {
					type: "personal",
					licenseNumber: input.driversLicenseNumber,
					issuingAgency: input.driversLicenseState,
				};
			}

			if (input.licenseNumber) {
				payload.licenses = [
					{
						issuingAgency: {
							name: input.licenseIssuingAgency || "State Board of Nursing",
							...(input.municipality || input.regionCode
								? {
										address: {
											municipality: input.municipality || "",
											regionCode: input.regionCode || "",
											countryCode: "US",
										},
									}
								: {}),
						},
						number: input.licenseNumber,
						name: input.licenseName || "Nursing License",
						status: "active",
					},
				];
			}

				return payload;
			};

			const payload = buildPayload();

			// Check if candidate already exists in FA
			if (input.email) {
				try {
					const existing = await client.findCandidateByEmail(input.email);
					if (existing) {
						// Update the existing candidate with full payload (adds licenses if missing)
						try {
							const updated = await client.updateCandidate(
								existing.id,
								payload as unknown as Parameters<typeof client.createCandidate>[0],
							);
							return { data: updated, note: "Candidate updated in FA with latest data" };
						} catch {
							// Update failed — return existing anyway
							return { data: existing, note: "Candidate already exists in FA (update failed)" };
						}
					}
				} catch {
					// Lookup failed — proceed with creation
				}
			}

			const candidate = await client.createCandidate(payload as unknown as Parameters<typeof client.createCandidate>[0]);
			return { data: candidate };
		} catch (error) {
			return {
				error: `Failed to create candidate: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
