/**
 * First Advantage / Sterling API Types
 *
 * Matches the Sterling REST API v2 response shapes.
 * See: API-REFERENCE.md for documented response examples.
 */

export interface FAAuthToken {
	access_token: string;
	token_type: string;
	expires_in: string | number; // API returns string "3600"
	expiresAt: number; // Computed: unix timestamp of when token expires
}

// -- Packages --

export interface FAPackageProduct {
	code: string;
	description: string;
	variants: Array<{
		id: string;
		root: string;
		description: string;
		subtypes: string[];
	}>;
}

export interface FAPackage {
	id: string;
	title: string;
	active: boolean;
	type: string;
	components: string[];
	products: FAPackageProduct[];
	requiredFields: string[];
}

// -- Candidates --

export interface FAAddress {
	addressLine: string;
	municipality: string;
	regionCode: string; // ISO 3166-2: "US-TN"
	postalCode: string;
	countryCode: string;
}

export interface FADriversLicense {
	type: string; // "personal"
	licenseNumber: string;
	issuingAgency: string; // ISO 3166-2: "US-TN"
}

export interface FACreateCandidateInput {
	givenName: string;
	familyName: string;
	email?: string;
	clientReferenceId: string;
	dob?: string; // "YYYY-MM-DD"
	ssn?: string; // "XXX-XX-XXXX"
	address?: FAAddress;
	driversLicense?: FADriversLicense;
}

export interface FACandidate {
	id: string; // UUID
	clientReferenceId: string;
	email?: string;
	givenName: string;
	familyName: string;
	confirmedNoMiddleName: boolean;
	dob?: string;
	ssn?: string;
	address?: FAAddress;
	screeningIds: string[];
	driversLicense?: FADriversLicense;
}

// -- Screenings --

export interface FAInitiateScreeningInput {
	candidateId: string;
	packageId: string;
	callbackUri?: string;
}

export interface FAReportItem {
	id: string;
	type: string; // Human-readable: "SSN Trace", "County Criminal Record", etc.
	status: string; // "pending", "in_progress", "complete"
	result: string | null; // null while pending, then "clear", "consider", "adverse"
	root?: string; // Jurisdiction code: "TN", "OIG", "GSA", "FACIS"
	description?: string; // Jurisdiction detail: "DAVIDSON", "Office of Inspector General"
	updatedAt: string;
	estimatedCompletionTime: string;
}

export interface FAScreening {
	id: string; // Numeric string (not UUID)
	packageId: string;
	packageName: string;
	accountName?: string;
	candidateId: string;
	status: string; // "Pending", "In Progress", "Complete" (title case)
	result: string; // "Pending", "Clear", "Consider", "Adverse" (title case)
	jobPosition?: string;
	links?: {
		admin?: {
			web?: string; // Sterling portal URL
		};
	};
	reportItems: FAReportItem[];
	submittedAt: string;
	updatedAt: string;
	estimatedCompletionTime?: string;
}

export interface FAReportLink {
	href: string;
}

/**
 * FAClient interface — both LiveFAClient and MockFAClient implement this.
 */
export interface FAClient {
	authenticate(): Promise<FAAuthToken>;
	getPackages(): Promise<FAPackage[]>;
	createCandidate(data: FACreateCandidateInput): Promise<FACandidate>;
	initiateScreening(data: FAInitiateScreeningInput): Promise<FAScreening>;
	getScreening(screeningId: string): Promise<FAScreening>;
	getReportLink(screeningId: string): Promise<FAReportLink>;
}
