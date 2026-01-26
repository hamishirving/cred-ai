import type {
	ApiError,
	CompliancePackageBasicDto,
	CompliancePackageDto,
	CreateProfileRequestDto,
	CreateProfileResponseDto,
	DocumentDto,
	OrganisationMetadataDto,
	ProfileDto,
	ProfileListFilterRequest,
	ProfileListPageDto,
	UpdateProfileFieldsRequestDto,
} from "./types";

const API_URL =
	process.env.CREDENTIALLY_API_URL ??
	"https://dev-eu-london.drfocused.com/gateway";
const API_KEY = process.env.CREDENTIALLY_API_KEY ?? "";
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
			const method = options.method || "GET";
			const detail = errorText || res.statusText || "No details";

			console.error(
				`[CredentiallyAPI] ${method} ${url} → ${res.status}: ${detail}`,
			);

			if (res.status === 400) {
				return {
					error: `Bad request to ${method} ${path}: ${detail}`,
				};
			} else if (res.status === 401) {
				return {
					error: `Authentication failed (401) for ${method} ${path}. The API key may be expired or invalid. Check CREDENTIALLY_API_KEY in .env.local.`,
				};
			} else if (res.status === 403) {
				return {
					error: `Access denied (403) for ${method} ${path}. The API key may lack permissions for this resource.`,
				};
			} else if (res.status === 404) {
				return {
					error: `Not found (404): ${method} ${path}. The resource may not exist.`,
				};
			} else if (res.status === 429) {
				return {
					error: `Rate limited (429) on ${method} ${path}. Try again shortly.`,
				};
			} else if (res.status >= 500) {
				return {
					error: `Server error (${res.status}) on ${method} ${path}: ${detail}`,
				};
			}

			return {
				error: `API error (${res.status}) on ${method} ${path}: ${detail}`,
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
		`/api/profile/find?email=${encodeURIComponent(email)}`,
	);
}

/**
 * Get profile by ID
 */
export async function getProfileById(
	profileId: string,
): Promise<ProfileDto | { error: string }> {
	return credentiallyFetch<ProfileDto>(
		`/api/profile/${encodeURIComponent(profileId)}`,
	);
}

/**
 * Load profiles (paginated) with filter support
 */
export async function loadProfiles({
	page = 0,
	size = 20,
	filter,
}: {
	page?: number;
	size?: number;
	filter: ProfileListFilterRequest;
}): Promise<ProfileListPageDto | { error: string }> {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(page));
	searchParams.set("size", String(size));
	if (filter.name) {
		searchParams.set("name", filter.name);
	}
	return credentiallyFetch<ProfileListPageDto>(
		`/api/profile?${searchParams.toString()}`,
	);
}

/**
 * Get organisation metadata (custom fields and roles)
 */
export async function getOrganisationMetadata(): Promise<
	OrganisationMetadataDto | { error: string }
> {
	return credentiallyFetch<OrganisationMetadataDto>(
		`/api/profile/metadata`,
	);
}

/**
 * Get documents for a profile
 */
export async function getProfileDocuments(
	profileId: string,
): Promise<DocumentDto[] | { error: string }> {
	return credentiallyFetch<DocumentDto[]>(
		`/api/documents/${encodeURIComponent(profileId)}`,
	);
}

/**
 * Get compliance packages for a profile
 */
export async function getCompliancePackages(
	profileId: string,
): Promise<CompliancePackageDto[] | { error: string }> {
	return credentiallyFetch<CompliancePackageDto[]>(
		`/api/compliance-packages/${encodeURIComponent(profileId)}`,
	);
}

/**
 * Get all compliance packages available in the organisation
 */
export async function getOrgCompliancePackages(): Promise<
	CompliancePackageBasicDto[] | { error: string }
> {
	return credentiallyFetch<CompliancePackageBasicDto[]>(
		`/api/compliance-packages`,
	);
}

/**
 * Assign compliance packages to a profile
 */
export async function assignCompliancePackages(
	profileId: string,
	packageIds: string[],
): Promise<CompliancePackageDto[] | { error: string }> {
	return credentiallyFetch<CompliancePackageDto[]>(
		`/api/compliance-packages/${encodeURIComponent(profileId)}`,
		{
			method: "POST",
			body: JSON.stringify(packageIds),
		},
	);
}

/**
 * Create a new profile
 */
export async function createProfile(
	data: CreateProfileRequestDto,
): Promise<CreateProfileResponseDto | { error: string }> {
	return credentiallyFetch<CreateProfileResponseDto>(`/api/profile`, {
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
	return credentiallyFetch<CreateProfileResponseDto>(`/api/profile`, {
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
