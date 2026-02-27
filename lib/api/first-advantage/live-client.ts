/**
 * Live FA Client
 *
 * Wraps the Sterling REST API v2. Uses OAuth2 client_credentials flow.
 * Base URL from env: FA_API_BASE_URL
 *
 * See API-REFERENCE.md for documented response shapes.
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

const BASE_URL =
	process.env.FA_API_BASE_URL || "https://api.us.int.sterlingcheck.app/v2";
const CLIENT_ID = process.env.FA_CLIENT_ID || "";
const CLIENT_SECRET = process.env.FA_CLIENT_SECRET || "";

export class LiveFAClient implements FAClient {
	private token: FAAuthToken | null = null;

	async authenticate(): Promise<FAAuthToken> {
		// Return cached token if still valid (with 60s buffer)
		if (this.token && this.token.expiresAt > Date.now() + 60_000) {
			return this.token;
		}

		const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
			"base64",
		);

		const res = await fetch(`${BASE_URL}/oauth`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Basic ${credentials}`,
			},
			body: "grant_type=client_credentials",
		});

		if (!res.ok) {
			throw new Error(`FA auth failed: ${res.status} ${res.statusText}`);
		}

		const data = await res.json();
		// expires_in comes as string from the API
		const expiresInSeconds =
			typeof data.expires_in === "string"
				? parseInt(data.expires_in, 10)
				: data.expires_in;

		this.token = {
			access_token: data.access_token,
			token_type: data.token_type,
			expires_in: data.expires_in,
			expiresAt: Date.now() + expiresInSeconds * 1000,
		};

		return this.token;
	}

	private async request<T>(
		path: string,
		options: RequestInit = {},
	): Promise<T> {
		const auth = await this.authenticate();
		const res = await fetch(`${BASE_URL}${path}`, {
			...options,
			headers: {
				Authorization: `Bearer ${auth.access_token}`,
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		if (!res.ok) {
			const body = await res.text();
			throw new Error(`FA API error ${res.status}: ${body}`);
		}

		return res.json();
	}

	async getPackages(): Promise<FAPackage[]> {
		// API returns a top-level array, not wrapped in an object
		return this.request<FAPackage[]>("/packages");
	}

	async createCandidate(input: FACreateCandidateInput): Promise<FACandidate> {
		try {
			return await this.request<FACandidate>("/candidates", {
				method: "POST",
				body: JSON.stringify(input),
			});
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			// 409 = email already in use — look up existing candidate
			if (msg.includes("409") && input.email) {
				const existing = await this.findCandidateByEmail(input.email);
				if (existing) return existing;
			}
			throw error;
		}
	}

	async initiateScreening(
		input: FAInitiateScreeningInput,
	): Promise<FAScreening> {
		return this.request<FAScreening>("/screenings", {
			method: "POST",
			headers: {
				"idempotency-key": crypto.randomUUID(),
			},
			body: JSON.stringify({
				candidateId: input.candidateId,
				...(input.packageId ? { packageId: input.packageId } : {}),
				...(input.callbackUri ? { callback: { uri: input.callbackUri } } : {}),
				...(input.alacarte ? { alacarte: input.alacarte } : {}),
				...(input.drug ? { drug: input.drug } : {}),
			}),
		});
	}

	async getScreening(screeningId: string): Promise<FAScreening> {
		return this.request<FAScreening>(`/screenings/${screeningId}`);
	}

	async getReportLink(screeningId: string): Promise<FAReportLink> {
		// POST only — GET returns 405. Returns 422 if screening not complete.
		return this.request<FAReportLink>(
			`/screenings/${screeningId}/report-links`,
			{ method: "POST" },
		);
	}

	async listScreenings(_candidateName: string): Promise<FAScreening[]> {
		// Sterling API candidate search not yet implemented — fallback to empty
		return [];
	}

	async updateCandidate(
		candidateId: string,
		input: FACreateCandidateInput,
	): Promise<FACandidate> {
		return this.request<FACandidate>(`/candidates/${candidateId}`, {
			method: "PUT",
			body: JSON.stringify(input),
		});
	}

	async getCandidate(candidateId: string): Promise<FACandidate> {
		return this.request<FACandidate>(`/candidates/${candidateId}`);
	}

	async findCandidateByEmail(email: string): Promise<FACandidate | null> {
		try {
			const results = await this.request<FACandidate[]>(
				`/candidates?email=${encodeURIComponent(email)}`,
			);
			return results.length > 0 ? results[0] : null;
		} catch {
			return null;
		}
	}
}
