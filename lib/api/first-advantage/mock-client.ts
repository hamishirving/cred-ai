/**
 * Mock FA Client
 *
 * Simulates realistic FA behaviour with time-based status progression.
 * Results are deterministic per candidate for repeatable demos.
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
let nextCandidateId = 1000;
let nextScreeningId = 5000;

export class MockFAClient implements FAClient {
  async authenticate(): Promise<FAAuthToken> {
    return {
      access_token: "mock-token-" + Date.now(),
      token_type: "Bearer",
      expires_in: 3600,
      expiresAt: Date.now() + 3600_000,
    };
  }

  async getPackages(): Promise<FAPackage[]> {
    return [
      {
        id: "539147",
        name: "Sample Standard + FACIS",
        description: "SSN Trace, County Criminal, Federal Criminal, Nationwide 7yr, Sex Offender, FACIS L3",
        currentVersion: {
          screenings: [
            { type: "criminal", subType: "county" },
            { type: "criminal", subType: "federal" },
            { type: "criminal", subType: "nationwide" },
            { type: "identity", subType: "ssn_trace" },
            { type: "sex_offender", subType: "national" },
            { type: "healthcare", subType: "facis_level3" },
          ],
        },
      },
      {
        id: "539150",
        name: "Standard + D&HS",
        description: "Standard + Drug Test + Health Screening",
        currentVersion: {
          screenings: [
            { type: "criminal", subType: "county" },
            { type: "criminal", subType: "federal" },
            { type: "criminal", subType: "nationwide" },
            { type: "identity", subType: "ssn_trace" },
            { type: "sex_offender", subType: "national" },
            { type: "healthcare", subType: "facis_level3" },
            { type: "drug", subType: "10panel" },
            { type: "health", subType: "screening" },
          ],
        },
      },
      {
        id: "587791",
        name: "Medical Solution Package 0",
        description: "Placeholder -- SSN Trace only",
        currentVersion: {
          screenings: [{ type: "identity", subType: "ssn_trace" }],
        },
      },
    ];
  }

  async createCandidate(input: FACreateCandidateInput): Promise<FACandidate> {
    const id = String(nextCandidateId++);
    return {
      id,
      links: [{ rel: "self", href: `/v2/candidates/${id}` }],
    };
  }

  async initiateScreening(input: FAInitiateScreeningInput): Promise<FAScreening> {
    const id = String(nextScreeningId++);
    const screening: FAScreening & { createdAt: number } = {
      id,
      candidateId: input.candidateId,
      packageId: input.packageId,
      status: "pending",
      screenings: [
        { type: "criminal_federal", status: "pending" },
        { type: "criminal_county", status: "pending" },
        { type: "criminal_nationwide", status: "pending" },
        { type: "ssn_trace", status: "pending" },
        { type: "sex_offender", status: "pending" },
        { type: "facis_level3", status: "pending" },
      ],
      submittedAt: new Date().toISOString(),
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
    const components = screening.screenings || [];

    if (elapsed > 15_000) {
      // After 15s: all complete
      screening.status = "complete";
      screening.result = "clear";
      for (const c of components) {
        c.status = "complete";
        c.result = "clear";
      }
    } else if (elapsed > 5_000) {
      // After 5s: in progress, some components done
      screening.status = "in_progress";
      const doneCount = Math.min(
        Math.floor((elapsed - 5000) / 2000),
        components.length - 1,
      );
      for (let i = 0; i < components.length; i++) {
        if (i < doneCount) {
          components[i].status = "complete";
          components[i].result = "clear";
        }
      }
    }

    return { ...screening };
  }

  async getReportLink(screeningId: string): Promise<FAReportLink> {
    return { href: `https://demo.sterlingcheck.app/reports/${screeningId}` };
  }
}
