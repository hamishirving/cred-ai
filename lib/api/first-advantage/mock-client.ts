/**
 * Mock FA Client
 *
 * Simulates realistic FA behaviour with time-based status progression.
 * Response shapes match the real Sterling API v2 (see API-REFERENCE.md).
 */

import type {
	FAClient,
	FAAuthToken,
	FAPackage,
	FACreateCandidateInput,
	FACandidate,
	FAInitiateScreeningInput,
	FAScreening,
	FAReportLink,
} from "./types";

// In-memory store for mock screenings
const mockScreenings = new Map<string, FAScreening & { createdAt: number }>();
let nextScreeningId = 5000;

export class MockFAClient implements FAClient {
	async authenticate(): Promise<FAAuthToken> {
		return {
			access_token: "mock-token-" + Date.now(),
			token_type: "bearer",
			expires_in: "3600",
			expiresAt: Date.now() + 3600_000,
		};
	}

	async getPackages(): Promise<FAPackage[]> {
		return [
			{
				id: "571732",
				title: "Medical Solutions Package TEST",
				active: true,
				type: "Standard",
				components: [
					"State Criminal Repository",
					"County Criminal Record",
					"SSN Trace",
					"HealthCare - Excluded Parties",
					"Criminal Enhanced Nationwide (7 year)",
					"FACISL",
					"DOJ Sex Offender Search",
					"Drivers Record",
					"National Wants Warrants",
				],
				products: [
					{ code: "CRST", description: "State Criminal Repository", variants: [] },
					{ code: "EXOIG", description: "HealthCare - Excluded Parties", variants: [{ id: "3604", root: "GSA", description: "General Services Administration", subtypes: [] }] },
					{ code: "MSMJVII", description: "Criminal Enhanced Nationwide (7 year)", variants: [] },
					{ code: "CRFM", description: "County Criminal Record", variants: [] },
					{ code: "CRSEXDOJ", description: "DOJ Sex Offender Search", variants: [] },
					{ code: "CRNW", description: "National Wants Warrants", variants: [] },
					{ code: "SSV1", description: "SSN Trace", variants: [] },
					{ code: "DR", description: "Drivers Record", variants: [] },
					{ code: "FACISL", description: "FACISL", variants: [{ id: "5114", root: "FACIS", description: "L3", subtypes: [] }] },
				],
				requiredFields: ["address.addressLine", "address.countryCode", "address.municipality", "address.postalCode", "address.regionCode", "dob", "driversLicense.issuingAgency", "driversLicense.licenseNumber", "email", "familyName", "givenName", "ssn"],
			},
			{
				id: "587791",
				title: "Medical Solution Package 0",
				active: true,
				type: "Standard",
				components: ["SSN Trace"],
				products: [
					{ code: "SSV1", description: "SSN Trace", variants: [] },
				],
				requiredFields: ["address.addressLine", "address.countryCode", "address.municipality", "address.postalCode", "address.regionCode", "dob", "familyName", "givenName", "ssn"],
			},
		];
	}

	async createCandidate(input: FACreateCandidateInput): Promise<FACandidate> {
		const id = crypto.randomUUID();
		return {
			id,
			clientReferenceId: input.clientReferenceId,
			email: input.email,
			givenName: input.givenName,
			familyName: input.familyName,
			confirmedNoMiddleName: false,
			dob: input.dob,
			ssn: input.ssn,
			address: input.address,
			screeningIds: [],
			driversLicense: input.driversLicense,
		};
	}

	async initiateScreening(input: FAInitiateScreeningInput): Promise<FAScreening> {
		const id = String(nextScreeningId++);
		const now = new Date().toISOString();
		const screening: FAScreening & { createdAt: number } = {
			id,
			packageId: input.packageId,
			packageName: input.packageId === "571732" ? "Medical Solutions Package TEST" : "Medical Solution Package 0",
			accountName: "Medical Solutions_Old",
			candidateId: input.candidateId,
			status: "Pending",
			result: "Pending",
			links: {
				admin: {
					web: `https://demo.sterlingcheck.app/order/${id}`,
				},
			},
			reportItems: [
				{ id: `${id}-1`, type: "SSN Trace", status: "pending", result: null, updatedAt: now, estimatedCompletionTime: now },
				{ id: `${id}-2`, type: "Enhanced Nationwide Criminal Search (7 year)", status: "pending", result: null, updatedAt: now, estimatedCompletionTime: now },
				{ id: `${id}-3`, type: "County Criminal Record", status: "pending", result: null, root: "FL", description: "DUVAL", updatedAt: now, estimatedCompletionTime: now },
				{ id: `${id}-4`, type: "State Criminal Repository", status: "pending", result: null, root: "FL", description: "Florida Dept of Law Enforcement", updatedAt: now, estimatedCompletionTime: now },
				{ id: `${id}-5`, type: "OIG-Excluded Parties", status: "pending", result: null, root: "OIG", description: "Office of Inspector General", updatedAt: now, estimatedCompletionTime: now },
				{ id: `${id}-6`, type: "GSA-Excluded Parties", status: "pending", result: null, root: "GSA", description: "General Services Administration", updatedAt: now, estimatedCompletionTime: now },
				{ id: `${id}-7`, type: "FACIS L3", status: "pending", result: null, root: "FACIS", description: "L3", updatedAt: now, estimatedCompletionTime: now },
				{ id: `${id}-8`, type: "DOJ Sex Offender Search", status: "pending", result: null, updatedAt: now, estimatedCompletionTime: now },
			],
			submittedAt: now,
			updatedAt: now,
			estimatedCompletionTime: now,
			createdAt: Date.now(),
		};
		mockScreenings.set(id, screening);
		return screening;
	}

	async getScreening(screeningId: string): Promise<FAScreening> {
		const screening = mockScreenings.get(screeningId);
		if (!screening) {
			throw new Error(`Screening ${screeningId} not found`);
		}

		// Time-based progression
		const elapsed = Date.now() - screening.createdAt;
		const items = screening.reportItems;

		if (elapsed > 15_000) {
			// After 15s: all complete
			screening.status = "Complete";
			screening.result = "Clear";
			for (const item of items) {
				item.status = "complete";
				item.result = "clear";
			}
		} else if (elapsed > 5_000) {
			// After 5s: in progress, some components done
			screening.status = "In Progress";
			const doneCount = Math.min(
				Math.floor((elapsed - 5000) / 2000),
				items.length - 1,
			);
			for (let i = 0; i < items.length; i++) {
				if (i < doneCount) {
					items[i].status = "complete";
					items[i].result = "clear";
				}
			}
		}

		const { createdAt: _, ...result } = screening;
		return { ...result };
	}

	async getReportLink(screeningId: string): Promise<FAReportLink> {
		return { href: `https://demo.sterlingcheck.app/reports/${screeningId}` };
	}
}
