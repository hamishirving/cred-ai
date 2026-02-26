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
The candidate needs: name, email, dob, ssn, address (with ISO 3166-2 regionCode like "US-FL"), and driversLicense if required by the package.`,

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
	}),

	execute: async (input) => {
		try {
			const client = getFAClient();

			// Check if candidate already exists in FA
			if (input.email) {
				try {
					const existing = await client.findCandidateByEmail(input.email);
					if (existing) {
						return { data: existing, note: "Candidate already exists in FA" };
					}
				} catch {
					// Lookup failed — proceed with creation
				}
			}

			// Build the candidate payload
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

			const candidate = await client.createCandidate(payload as unknown as Parameters<typeof client.createCandidate>[0]);
			return { data: candidate };
		} catch (error) {
			return {
				error: `Failed to create candidate: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
