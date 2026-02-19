/**
 * Live FA Client
 *
 * Wraps the Sterling REST API v2. Uses OAuth2 client_credentials flow.
 * Base URL from env: FA_API_BASE_URL
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

const BASE_URL = process.env.FA_API_BASE_URL || "https://api.us.int.sterlingcheck.app/v2";
const CLIENT_ID = process.env.FA_CLIENT_ID || "";
const CLIENT_SECRET = process.env.FA_CLIENT_SECRET || "";

export class LiveFAClient implements FAClient {
  private token: FAAuthToken | null = null;

  async authenticate(): Promise<FAAuthToken> {
    // Return cached token if still valid (with 60s buffer)
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token;
    }

    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

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
    this.token = {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    const data = await this.request<{ packages: FAPackage[] }>("/packages");
    return data.packages || [];
  }

  async createCandidate(input: FACreateCandidateInput): Promise<FACandidate> {
    return this.request<FACandidate>("/candidates", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async initiateScreening(input: FAInitiateScreeningInput): Promise<FAScreening> {
    return this.request<FAScreening>("/screenings", {
      method: "POST",
      body: JSON.stringify({
        candidateId: input.candidateId,
        packageId: input.packageId,
        callbackUri: input.callbackUri,
      }),
    });
  }

  async getScreening(screeningId: string): Promise<FAScreening> {
    return this.request<FAScreening>(`/screenings/${screeningId}`);
  }

  async getReportLink(screeningId: string): Promise<FAReportLink> {
    const data = await this.request<{ links: FAReportLink[] }>(
      `/screenings/${screeningId}/report-links`,
      { method: "POST" },
    );
    return data.links?.[0] || { href: "" };
  }
}
