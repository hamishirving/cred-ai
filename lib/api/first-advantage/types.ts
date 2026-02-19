/**
 * First Advantage / Sterling API Types
 *
 * Matches the Sterling REST API v2 response shapes.
 * See: https://api.us.int.sterlingcheck.app/v2
 */

export interface FAAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expiresAt: number; // Unix timestamp of when token expires
}

export interface FAPackage {
  id: string;
  name: string;
  description?: string;
  currentVersion?: {
    screenings?: Array<{
      type: string;
      subType?: string;
    }>;
  };
}

export interface FACreateCandidateInput {
  givenName: string;
  familyName: string;
  email?: string;
  clientReferenceId: string;
  dateOfBirth?: string;
  ssn?: string;
  address?: {
    addressLine: string;
    municipality: string;
    regionCode: string;
    postalCode: string;
    countryCode: string;
  };
}

export interface FACandidate {
  id: string;
  links?: Array<{ rel: string; href: string }>;
}

export interface FAInitiateScreeningInput {
  candidateId: string;
  packageId: string;
  callbackUri?: string;
}

export interface FAScreening {
  id: string;
  candidateId: string;
  packageId: string;
  status: string;
  result?: string;
  reportLinks?: Array<{ href: string }>;
  screenings?: FAScreeningComponent[];
  submittedAt?: string;
  updatedAt?: string;
}

export interface FAScreeningComponent {
  type: string;
  subType?: string;
  status: string;
  result?: string;
  updatedAt?: string;
}

export interface FAReportLink {
  href: string;
}

/**
 * FAClient interface -- both LiveFAClient and MockFAClient implement this.
 */
export interface FAClient {
  authenticate(): Promise<FAAuthToken>;
  getPackages(): Promise<FAPackage[]>;
  createCandidate(data: FACreateCandidateInput): Promise<FACandidate>;
  initiateScreening(data: FAInitiateScreeningInput): Promise<FAScreening>;
  getScreening(screeningId: string): Promise<FAScreening>;
  getReportLink(screeningId: string): Promise<FAReportLink>;
}
