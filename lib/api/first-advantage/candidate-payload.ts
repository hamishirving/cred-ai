import type { Profile } from "@/lib/db/schema/profiles";
import type {
	FACandidate,
	FACreateCandidateInput,
} from "@/lib/api/first-advantage/types";

type NullableString = string | null | undefined;

export interface FACandidatePayloadInput {
	givenName: string;
	familyName: string;
	clientReferenceId: string;
	email?: NullableString;
	dob?: NullableString;
	ssn?: NullableString;
	addressLine?: NullableString;
	municipality?: NullableString;
	regionCode?: NullableString;
	postalCode?: NullableString;
	countryCode?: NullableString;
	driversLicenseNumber?: NullableString;
	driversLicenseState?: NullableString;
	licenseNumber?: NullableString;
	licenseName?: NullableString;
	licenseIssuingAgency?: NullableString;
	professionalRegistration?: NullableString;
}

function clean(value: NullableString): string | undefined {
	if (!value) return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value,
	);
}

export function normalizeUsRegionCode(value: NullableString): string | undefined {
	const raw = clean(value)?.toUpperCase();
	if (!raw) return undefined;
	if (/^US-[A-Z]{2}$/.test(raw)) return raw;
	if (/^[A-Z]{2}$/.test(raw)) return `US-${raw}`;
	return undefined;
}

function getRegistrationState(registration: NullableString): string | undefined {
	const raw = clean(registration);
	if (!raw) return undefined;
	const match = raw.match(/^([A-Z]{2}|COMPACT)-RN-[A-Z0-9]+$/i);
	return match?.[1]?.toUpperCase();
}

function getLicenseIssuingAgencyName(
	explicitAgency: NullableString,
	registrationState: string | undefined,
): string {
	const explicit = clean(explicitAgency);
	if (explicit) return explicit;
	if (registrationState === "COMPACT") return "Nurse Licensure Compact";
	if (registrationState && /^[A-Z]{2}$/.test(registrationState)) {
		return `${registrationState} Board of Nursing`;
	}
	return "State Board of Nursing";
}

export function buildFACandidatePayload(
	input: FACandidatePayloadInput,
): FACreateCandidateInput {
	const payload: FACreateCandidateInput = {
		givenName: input.givenName,
		familyName: input.familyName,
		clientReferenceId: input.clientReferenceId,
	};

	const email = clean(input.email);
	const dob = clean(input.dob);
	const ssn = clean(input.ssn);
	if (email) payload.email = email;
	if (dob) payload.dob = dob;
	if (ssn) payload.ssn = ssn;

	const regionCode = normalizeUsRegionCode(input.regionCode);
	const addressLine = clean(input.addressLine);
	const municipality = clean(input.municipality);
	const postalCode = clean(input.postalCode);
	if (addressLine && municipality && regionCode && postalCode) {
		payload.address = {
			addressLine,
			municipality,
			regionCode,
			postalCode,
			countryCode: clean(input.countryCode)?.toUpperCase() || "US",
		};
	}

	const driversLicenseNumber = clean(input.driversLicenseNumber);
	const driversLicenseState = normalizeUsRegionCode(input.driversLicenseState);
	if (driversLicenseNumber && driversLicenseState) {
		payload.driversLicense = {
			type: "personal",
			licenseNumber: driversLicenseNumber,
			issuingAgency: driversLicenseState,
		};
	}

	const registrationState = getRegistrationState(input.professionalRegistration);
	const licenseNumber =
		clean(input.licenseNumber) || clean(input.professionalRegistration);
	if (licenseNumber) {
		payload.licenses = [
			{
				issuingAgency: {
					name: getLicenseIssuingAgencyName(
						input.licenseIssuingAgency,
						registrationState,
					),
					...(municipality || regionCode || postalCode
						? {
								address: {
									...(municipality ? { municipality } : {}),
									...(regionCode ? { regionCode } : {}),
									...(postalCode ? { postalCode } : {}),
									countryCode: "US",
								},
							}
						: {}),
				},
				number: licenseNumber,
				name: clean(input.licenseName) || "Nursing License",
				status: "active",
			},
		];
	}

	return payload;
}

export function buildFACandidatePayloadFromProfile(
	profile: Profile,
): FACreateCandidateInput {
	const address = profile.address;
	const dob =
		profile.dateOfBirth instanceof Date
			? profile.dateOfBirth.toISOString().split("T")[0]
			: undefined;

	return buildFACandidatePayload({
		givenName: profile.firstName,
		familyName: profile.lastName,
		clientReferenceId: profile.id,
		email: profile.email,
		dob,
		ssn: profile.nationalId,
		addressLine: address?.line1,
		municipality: address?.city,
		regionCode: address?.state,
		postalCode: address?.postcode,
		countryCode: "US",
		professionalRegistration: profile.professionalRegistration,
	});
}

function getValueAtPath(obj: unknown, path: string): unknown {
	const segments = path.split(".");
	let current: unknown = obj;

	for (const segment of segments) {
		if (Array.isArray(current)) {
			current = current[0];
		}
		if (!current || typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[segment];
	}

	return current;
}

function hasValue(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

export function findMissingCandidateFields(
	candidate: FACandidate | Record<string, unknown>,
	requiredFields: string[],
): string[] {
	return requiredFields.filter((field) => {
		const value = getValueAtPath(candidate, field);
		return !hasValue(value);
	});
}
