import type {
	ApiError,
	CompliancePackageDto,
	CreateProfileRequestDto,
	CreateProfileResponseDto,
	DocumentDto,
	OrganisationMetadataDto,
	ProfileDto,
	UpdateProfileFieldsRequestDto,
} from "./types";

const API_URL =
	process.env.CREDENTIALLY_API_URL ??
	"https://dev-eu-london.drfocused.com/gateway";
const API_KEY = process.env.CREDENTIALLY_API_KEY ?? "";
const ORG_ID = process.env.CREDENTIALLY_ORG_ID ?? "2372";
const API_VERSION = "2.0.0";

/**
 * Base fetch wrapper for Credentially API calls
 * Handles auth, headers, and error responses
 */
async function credentiallyFetch<T>(
	path: string,
	options: RequestInit = {},
): Promise<T | { error: string }> {
	const url = `${API_URL}${path}`;

	console.log(`[CredentiallyAPI] ${options.method || "GET"} ${url}`);

	try {
		const res = await fetch(url, {
			...options,
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				"X-API-Version": API_VERSION,
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		console.log(`[CredentiallyAPI] Response: ${res.status} ${res.statusText}`);

		// Handle non-OK responses
		if (!res.ok) {
			const errorText = await res.text();
			console.error(`[CredentiallyAPI] Error response:`, errorText);

			// Return user-friendly error messages
			if (res.status === 404) {
				return { error: "Resource not found" };
			} else if (res.status === 400) {
				return { error: `Invalid request: ${errorText || res.statusText}` };
			} else if (res.status === 401 || res.status === 403) {
				return {
					error: "Authentication failed. Please check API credentials.",
				};
			} else if (res.status >= 500) {
				return { error: "Server error. Please try again later." };
			}

			return {
				error: `API error (${res.status}): ${res.statusText}`,
			};
		}

		// Parse successful response
		const data = await res.json();
		console.log(
			`[CredentiallyAPI] Success:`,
			JSON.stringify(data).slice(0, 200),
		);
		return data as T;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`[CredentiallyAPI] Fetch error:`, error);
		return { error: `Network error: ${message}` };
	}
}

/**
 * Get profile by email
 */
export async function getProfileByEmail(
	email: string,
): Promise<ProfileDto | { error: string }> {
	return credentiallyFetch<ProfileDto>(
		`/api/${ORG_ID}/profile/find?email=${encodeURIComponent(email)}`,
	);
}

/**
 * Get profile by ID
 */
export async function getProfileById(
	profileId: string,
): Promise<ProfileDto | { error: string }> {
	return credentiallyFetch<ProfileDto>(
		`/api/${ORG_ID}/profile/${encodeURIComponent(profileId)}`,
	);
}

/**
 * Get organisation metadata (custom fields and roles)
 */
export async function getOrganisationMetadata(): Promise<
	OrganisationMetadataDto | { error: string }
> {
	return credentiallyFetch<OrganisationMetadataDto>(
		`/api/${ORG_ID}/profile/metadata`,
	);
}

/**
 * Get documents for a profile
 */
export async function getProfileDocuments(
	profileId: string,
): Promise<DocumentDto[] | { error: string }> {
	return credentiallyFetch<DocumentDto[]>(
		`/api/${ORG_ID}/documents/${encodeURIComponent(profileId)}`,
	);
}

/**
 * Get compliance packages for a profile
 */
export async function getCompliancePackages(
	profileId: string,
	organisationId?: string,
): Promise<CompliancePackageDto[] | { error: string }> {
	const orgId = organisationId ?? ORG_ID;
	return credentiallyFetch<CompliancePackageDto[]>(
		`/api/${orgId}/compliance-packages/${encodeURIComponent(profileId)}`,
	);
}

/**
 * Create a new profile
 */
export async function createProfile(
	data: CreateProfileRequestDto,
): Promise<CreateProfileResponseDto | { error: string }> {
	return credentiallyFetch<CreateProfileResponseDto>(`/api/${ORG_ID}/profile`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
}

/**
 * Update profile custom fields
 */
export async function updateProfileFields(
	data: UpdateProfileFieldsRequestDto,
): Promise<CreateProfileResponseDto | { error: string }> {
	return credentiallyFetch<CreateProfileResponseDto>(`/api/${ORG_ID}/profile`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
}

/**
 * Helper to check if a response is an error
 */
export function isApiError(response: any): response is { error: string } {
	return response && typeof response.error === "string";
}
