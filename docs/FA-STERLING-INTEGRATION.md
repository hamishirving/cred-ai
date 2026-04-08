# First Advantage — Sterling API v2 Integration

What we've built in the playground to integrate with First Advantage's Sterling API for background screening. This covers the API itself, how we've wrapped it, the data model, and the gotchas you'll hit.

## Quick Context

First Advantage (FA) uses Sterling's REST API v2 under the hood. We connect to their integration/sandbox environment. The flow is straightforward: create a candidate in FA, submit a screening order against a package, then poll for results.

Everything lives in `lib/api/first-advantage/`.

## Sterling API v2

**Base URL:** `https://api.us.int.sterlingcheck.app/v2` (integration/sandbox)

**Account:** Medsol (customer ID 27923, trading partner: OnDemandTP)

### Authentication

OAuth2 client credentials flow. You POST to `/oauth` with Basic auth (base64-encoded `clientId:clientSecret`) and get a bearer token back.

```
POST /oauth
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(clientId:clientSecret)>
Body: grant_type=client_credentials
```

Token lasts 1 hour. We cache it in the client with a 60-second safety buffer before refresh.

**Watch out:** `expires_in` comes back as a string `"3600"`, not a number. We handle the parsing in `live-client.ts`.

### Environment Variables

```bash
FA_API_MODE=mock              # "mock" or "live"
FA_CLIENT_ID=***              # Medsol account credentials
FA_CLIENT_SECRET=***
FA_API_BASE_URL=https://api.us.int.sterlingcheck.app/v2
```

### Endpoints

| Endpoint | Method | What it does |
|----------|--------|-------------|
| `/oauth` | POST | Get bearer token (client credentials) |
| `/packages` | GET | List available screening packages |
| `/candidates` | POST | Create a candidate record |
| `/candidates/:id` | PUT | Update a candidate |
| `/candidates/:id` | GET | Get a candidate |
| `/candidates?email=` | GET | Find candidate by email |
| `/screenings` | POST | Submit a screening order |
| `/screenings/:id` | GET | Check screening status |
| `/screenings/:id/report-links` | POST | Get shareable report link (only when complete) |

### API Quirks

These caught us during implementation. Worth knowing before you build against it.

- `expires_in` is a **string** in the auth response, not a number
- `regionCode` must be **ISO 3166-2** format: `"US-TN"` not `"TN"`. Our `normalizeUsRegionCode()` helper handles conversion
- Screening `id` is a **numeric string** (e.g. `"1806030372"`), not a UUID. Candidate `id` IS a UUID
- Overall `status` and `result` are **title case** (`"Pending"`, `"Clear"`) while per-component status is **lowercase** (`"pending"`, `"complete"`)
- `GET /packages` returns a **bare array**, not wrapped in an object
- `POST /screenings/:id/report-links` returns 422 if the screening isn't complete yet. GET on this endpoint returns 405
- Email uniqueness is enforced at the account level (409 if duplicate). Our client handles this by falling back to a lookup
- SSN uniqueness is enforced per active screening (400 if there's already an active order for that SSN)
- `driversLicense.type` is required if you include a drivers license at all (use `"personal"`)

### Error Format

All errors follow the same shape:

```json
{
  "errors": [
    {
      "code": "400#field-name",
      "message": "Human readable error message"
    }
  ]
}
```

Common ones: `400#required-field` (missing package field), `409#email?already-in-use` (duplicate email), `422#not-yet-complete` (report not ready).

## Our Client (`lib/api/first-advantage/`)

### Factory Pattern

`client.ts` exports `getFAClient()` which returns a `LiveFAClient` based on env config. The `FAClient` interface (`types.ts`) defines the contract so you could swap in a mock for testing.

### Live Client

`live-client.ts` wraps every endpoint. Handles token caching, auth refresh, and a generic `request<T>()` helper that adds the bearer token to every call.

One interesting bit: `createCandidate()` catches 409 (duplicate email) and automatically falls back to `findCandidateByEmail()` to return the existing record. This means you can call it without worrying about whether the candidate already exists.

### Type Definitions

`types.ts` has full TypeScript interfaces matching the Sterling API response shapes:

- `FAAuthToken` — includes computed `expiresAt` timestamp
- `FAPackage` — package with components, products, required fields
- `FACreateCandidateInput` / `FACandidate` — candidate create/response
- `FAInitiateScreeningInput` / `FAScreening` — screening order/response
- `FAReportItem` — per-component breakdown (type, status, result, jurisdiction)
- `FAReportLink` — shareable report URL

### Candidate Payload Builder

`candidate-payload.ts` converts our internal profile data into the FA candidate format. Key things it handles:

- Region code normalisation (`"TN"` → `"US-TN"`)
- Professional registration parsing (extracts state from patterns like `"TX-RN-12345"`)
- License issuing agency inference (falls back to `"[STATE] Board of Nursing"`)
- Null/empty field cleaning
- Building the full payload from a Credentially `Profile` object via `buildFACandidatePayloadFromProfile()`

Also exports `findMissingCandidateFields()` which checks a candidate against a package's `requiredFields` array and tells you what's missing before you try to submit.

## Screening Packages

Three Medsol packages configured in their QA account (set up 25 Feb 2026):

### Tier 1: Standard (539146)

SSN Trace, County Criminal Record, Enhanced Nationwide Criminal Search (7yr), DOJ Sex Offender Search (NSOPW), FACIS L3.

This is the default for standard new placements.

### Tier 2: Enhanced (626709)

Everything in Tier 1 plus State Criminal Repository, OIG Excluded Parties (HHS), GSA Excluded Parties (SAM).

Triggered when: facility requires OIG/SAM checks, or placement state is California, New York, Illinois or Pennsylvania (which require statewide criminal search).

### Tier 3: Full (626711)

Everything in Tier 2 plus National Wants & Warrants and OIG variant.

Triggered when: deal type is `lapse` (candidate was inactive), deal type is `government`, or last assignment ended more than 30 days ago.

### Package Selection Logic

`package-selector.ts` makes this decision deterministically. No AI reasoning involved. Takes deal type, target state, facility requirements and last assignment date, returns a `PackageSelection` with the package ID, tier number and human-readable reason.

## Drug & Occupational Health (D&OHS)

Drug tests and health screenings aren't part of the background packages. They're ordered **a la carte** alongside the screening.

### How it Works

When submitting a screening order, you pass a `drug` object with the candidate's sex and address (for clinic routing) plus `alacarte` items specifying the product codes.

### Product Catalogue

`dhs-catalogue.ts` defines the available products. Main ones:

| Code | Product | Compliance Element |
|------|---------|-------------------|
| DHS90007 | 13 Panel Urine Drug Screen | `drug-screen` |
| DHS90008 | 10 Panel Urine Drug Screen | `drug-screen` |
| DHS90009 | 12 Panel Urine Drug Screen | `drug-screen` |
| DHS90010 | Urine Drug Screen + Alcohol (EtG) | `drug-screen` |
| DHS90011 | Hair Follicle Drug Screen | `drug-screen` |
| DHS30063 | Quantiferon TB Gold Plus | `tb-test` |
| DHS30064 | TB Skin Test (PPD) | `tb-test` |
| DHS30065 | Hepatitis B Surface Antibody | `hepatitis-b` |
| DHS30066 | MMR Titre | `mmr-titre` |
| DHS30067 | Varicella Titre | `varicella-titre` |
| DHS40001 | Pre-Employment Physical Exam | `physical-examination` |
| DHS40002 | Fit for Duty Assessment | `physical-examination` |
| DHS50001 | Alcohol Breath Test | `alcohol-screen` |

### Analyte Matching

The catalogue includes a smart matching system. If a facility requires specific drug analytes (e.g. fentanyl, tramadol), `matchProductByAnalytes()` finds the smallest panel that covers all of them. Medsol's default is the 13-panel (DHS90007) which covers fentanyl, meperidine, tramadol and oxycodone on top of the standard analytes.

`recommendDHSProducts()` takes a list of missing compliance element slugs and returns the product codes needed to fill those gaps.

## Compliance Element Mapping

This is the core of how screening results flow back into our compliance model.

### FA Component → Compliance Element

`package-map.ts` maintains the bidirectional mapping:

| FA Report Item Type | Our Element Slug |
|---------------------|-----------------|
| Enhanced Nationwide Criminal Search (7 year) | `nationwide-background-check` |
| SSN Trace | `ssn-verification` |
| County Criminal Record | `county-background-check` |
| State Criminal Repository | `state-background-check` |
| Drivers Record | `drivers-record` |
| OIG-Excluded Parties | `facis-sanctions-screening` |
| GSA-Excluded Parties | `facis-sanctions-screening` |
| FACIS L3 | `facis-check` |
| DOJ Sex Offender Search | `sex-offender-check` |
| National Wants Warrants | `national-wants-warrants` |
| Drug Screen - 13 Panel | `drug-screen` |
| TB Test - QuantiFERON | `tb-test` |
| Physical Examination | `physical-examination` |

Note: OIG and GSA both map to `facis-sanctions-screening`. Some elements like `florida-level2-background` require multiple FA components to all be clear before they're verified.

### Verification Rule

An FA component can mark a compliance element as verified when:

```
status === "complete" AND result === "clear"
```

Both conditions must be true. A complete result of `"consider"` or `"adverse"` doesn't verify anything.

`mapScreeningToElements()` takes the reportItems array from a screening response and returns each item mapped to its compliance element slug with a `canMarkVerified` boolean.

## Screening Statuses

### Overall

| Status | Meaning |
|--------|---------|
| Pending | Submitted, not started |
| In Progress | At least one component processing |
| Complete | All components finished |

| Result | Meaning |
|--------|---------|
| Pending | Still processing |
| Clear | All passed |
| Consider | Needs human review |
| Adverse | Disqualifying finding |

### Per Component (reportItems)

Status is lowercase (`"pending"`, `"in_progress"`, `"complete"`). Result is `null` while pending, then `"clear"`, `"consider"`, `"adverse"`, or special values like `"negative_dilute"` (inconclusive drug test, too dilute) and `"unperformable"` (check couldn't run).

## Database Schema

`fa_screenings` table in Supabase (schema in `lib/db/schema/fa-screenings.ts`):

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| organisationId | uuid | FK to organisations, multi-tenant scoping |
| profileId | uuid | FK to profiles (the candidate) |
| placementId | uuid | FK to placements (nullable, may not be placement-linked) |
| faScreeningId | text | Sterling's numeric string ID. Unique, drives upsert |
| faCandidateId | text | FA's candidate UUID |
| faPackageId | text | Package ID used |
| status | varchar | "Pending" / "In Progress" / "Complete" |
| result | varchar | "Pending" / "Clear" / "Consider" / "Adverse" |
| reportItems | jsonb | Per-component breakdown (FAReportItem[]) |
| portalUrl | text | Sterling portal link |
| submittedAt | timestamp | When submitted to FA |
| estimatedCompletionAt | timestamp | FA's estimate |
| rawResponse | jsonb | Full FA response for audit |
| createdAt | timestamp | Record created |
| updatedAt | timestamp | Record updated |

Queries in `lib/db/queries.ts`:
- `upsertFAScreening()` — insert or update, keyed on `faScreeningId`
- `getFAScreeningsByProfileId()` — find screenings for a candidate
- `getFAScreeningsByPlacementId()` — find screenings for a placement

## File Reference

```
lib/api/first-advantage/
├── client.ts              # Factory — returns LiveFAClient
├── live-client.ts         # Sterling API v2 wrapper (auth, all endpoints)
├── types.ts               # Full TypeScript interfaces for API shapes
├── package-selector.ts    # Deterministic tier selection logic
├── package-map.ts         # Compliance element ↔ FA component mapping
├── candidate-payload.ts   # Profile → FA candidate payload builder
├── dhs-catalogue.ts       # Drug & health product codes and matching
└── API-REFERENCE.md       # Raw endpoint docs from live testing

lib/db/schema/
└── fa-screenings.ts       # Drizzle schema for screening records
```

## What's Not Done

- `listScreenings()` on the live client returns empty. Sterling's candidate search endpoint isn't implemented yet, so we fall back to our own DB for lookups
- No webhook/callback integration. We poll for status updates rather than receiving push notifications
- No production environment tested. Everything's against the integration/sandbox URL
- Package IDs are hardcoded to Medsol's QA account. Production will need different IDs per customer
