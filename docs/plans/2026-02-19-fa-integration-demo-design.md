# First Advantage Integration Demo — Design

**Status:** Draft — updated with Medsol scenario mapping
**Created:** 2026-02-19
**Context:** Medsol deal — joint FA + Credentially technical deep dive, Thursday 27 Feb
**Audience:** Mixed (Medsol technical team + compliance/ops leadership)

---

## API Access — Confirmed Live

We have working Sterling/FA API credentials for the Medsol integration account:

- **Environment:** Integration (US)
- **Base URL:** `https://api.us.int.sterlingcheck.app/v2`
- **Auth:** OAuth2 client_credentials
- **Customer ID:** 27923
- **Trading Partner:** OnDemandTP
- **13 packages pre-configured** (see Real Package Data below)

Credentials stored in `.env.local` only — never committed.

### Real Package Data (from GET /packages, 19 Feb 2026)

| Package | ID | Components | Demo Use |
|---|---|---|---|
| Sample Standard + FACIS | 539147 | SSN Trace, County Criminal, Federal Criminal, Nationwide 7yr, Sex Offender, **FACIS L3** | **Primary demo** — closest to Medsol's standard healthcare package |
| Standard + D&HS | 539150 | Above + Drug Test + Health Screening | Travel nursing with drug/health |
| Standard + State 7/7 | 571732 | Above + State Criminal Repository | State-specific screening |
| Sample Standard + Employment | 539144 | Standard + Employment Verification | Employment history verification |
| Sample Standard + Education | 540145 | Standard + Education Verification | Education verification |
| Medical Solution Package 0 | 587791 | SSN Trace only | Placeholder — needs extending |

**Required fields** (most packages): `givenName`, `familyName`, `dob`, `ssn`, full `address` (addressLine, municipality, regionCode, postalCode, countryCode).

### ACTION: Request Full Medsol Package

Medsol's described standard package includes components not yet configured:
- OIG (HHS OIG) — **missing**
- EPLS/SAM (GSA) — **missing**
- USA Security Search — **missing**
- USA Warrant Search — **missing**
- Motor Vehicle — **missing**
- Statewide Criminal — available in "Standard + State" packages

**Ask Rebecca tomorrow** to have FA set up a complete "Medical Solutions Standard" package with all components from Medsol's requirements doc. For demo, the "Sample Standard + FACIS" package (539147) is sufficient to show the integration flow.

---

## Purpose

Build a working First Advantage (Sterling API) integration in the playground that shows the FA + Credentially partnership in action. The core message: **Credentially is the intelligence layer. FA is the screening API.** This isn't a dig at FA. It's the truth of how the partnership works, and it puts us in a strong negotiation position.

The demo must show:
1. **Credentially decides what's needed.** FA doesn't know what screening a Florida ICU nurse requires. We do. That requirements intelligence is our value.
2. **Credentially orchestrates the screening.** One click, not manual package selection and data entry into FA's portal.
3. **Credentially provides the full picture.** FA results flow back into a unified compliance view alongside licences, certifications, health records. FA only sees their piece. We see everything.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYGROUND CHAT UI                         │
│    User selects agent → agent runs → tools render results    │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ Compliance Gap  │ │ Background   │ │ Screening Status │
│ Analyzer Agent  │ │ Screening    │ │ Monitor Agent    │
│                 │ │ Agent        │ │                  │
│ "What does she  │ │ "Initiate    │ │ "Check pending   │
│  need for FL?"  │ │  screening"  │ │  screenings"     │
└────────┬────────┘ └──────┬───────┘ └────────┬─────────┘
         │                 │                   │
         ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    SHARED FA TOOLS                            │
│  faGetPackages · faCreateCandidate · faInitiateScreening     │
│  faCheckScreening · faGetReport                              │
├─────────────────────────────────────────────────────────────┤
│             PLACEMENT REQUIREMENTS ENGINE                     │
│  resolvePlacementRequirements · getPlacementCompliance       │
├─────────────────────────────────────────────────────────────┤
│                EXISTING CRED TOOLS                           │
│  getLocalProfile · getLocalCompliance · getOrgMetadata       │
│  searchLocalCandidates · createTask · saveAgentMemory        │
│  getAgentMemory · draftEmail                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              FA API CLIENT (lib/api/first-advantage/)        │
│                                                              │
│  FAClient interface                                          │
│  ├── LiveFAClient  → calls Sterling REST API                 │
│  └── MockFAClient  → realistic fake data + simulated delays  │
│                                                              │
│  Toggle: FA_API_MODE=live|mock (env var)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Component 1: FA API Client

### Interface

```typescript
// lib/api/first-advantage/types.ts

interface FAClient {
  authenticate(): Promise<FAAuthToken>;
  getPackages(): Promise<FAPackage[]>;
  createCandidate(data: FACreateCandidateInput): Promise<FACandidate>;
  initiateScreening(data: FAInitiateScreeningInput): Promise<FAScreening>;
  getScreening(screeningId: string): Promise<FAScreening>;
  getReportLink(screeningId: string): Promise<FAReportLink>;
}

interface FAPackage {
  id: string;
  name: string;
  description: string;
  screeningTypes: string[];          // e.g. ["criminal", "drug", "education"]
  requiredCandidateFields: string[]; // Fields needed on candidate record
}

interface FACandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  clientReferenceId: string;         // Our internal profile ID
  status: string;
}

interface FAScreening {
  id: string;
  candidateId: string;
  packageId: string;
  status: "pending" | "in_progress" | "complete" | "adverse_action";
  result?: "clear" | "consider" | "adverse";
  completedAt?: string;
  components: FAScreeningComponent[];
}

interface FAScreeningComponent {
  type: string;                       // e.g. "criminal_county", "drug_test"
  status: "pending" | "in_progress" | "complete";
  result?: "clear" | "consider" | "adverse";
  details?: Record<string, unknown>;
}
```

### Mock Implementation

The `MockFAClient` simulates realistic FA behaviour:

- `getPackages()` returns packages that mirror the real Sterling API structure, mapped to our compliance elements
- `createCandidate()` returns a candidate with a generated FA ID
- `initiateScreening()` stores the screening in memory with `status: "pending"` and a `createdAt` timestamp
- `getScreening()` simulates time-based progression:
  - 0-5s after creation: `pending`
  - 5-15s: `in_progress` with some components completing
  - 15s+: `complete` with all components resolved
- Results are deterministic per candidate (same candidate always gets same result) so demos are repeatable

### Live Implementation

The `LiveFAClient` wraps the Sterling REST API:

- OAuth2 auth with `client_id`/`client_secret` → bearer token (cached for 1 hour)
- Base URL from env: `FA_API_BASE_URL` (integration: `https://api-int.kennect.com/v2`, production: `https://api.kennect.com/v2`)
- Standard REST calls with error handling
- Maps Sterling's response shapes to our `FAClient` interface

### File Structure

```
lib/api/first-advantage/
├── types.ts          # FAClient interface + all FA types
├── client.ts         # getClient() factory — returns Live or Mock based on env
├── live-client.ts    # LiveFAClient — calls Sterling REST API
├── mock-client.ts    # MockFAClient — realistic fake data
└── package-map.ts    # Maps FA packages ↔ Credentially compliance elements
```

### Package Mapping

Critical for the gap analyzer: maps between Credentially compliance elements and FA screening packages.

```typescript
// lib/api/first-advantage/package-map.ts

// Maps our compliance element slugs to FA screening component types
const elementToFAComponent: Record<string, string> = {
  "federal-background-check": "criminal_federal",
  "state-background-check": "criminal_state",
  "california-background-check": "criminal_state_ca",
  "texas-background-check": "criminal_state_tx",
  "florida-background-check": "criminal_state_fl",
  "drug-screen": "drug_test_10panel",
  "oig-exclusion-check": "oig_sam_exclusion",
  "sam-exclusion-check": "oig_sam_exclusion",
};

// Which elements FA handles vs which Credentially handles
const faHandledElements = new Set([
  "federal-background-check",
  "state-background-check",
  "california-background-check",
  "texas-background-check",
  "florida-background-check",
  "drug-screen",
  "oig-exclusion-check",
  "sam-exclusion-check",
]);

// Everything else (licences, certs, health records, I-9) = Credentially handles
```

---

## Component 2: FA Tools

Five new tools in `lib/ai/tools/`, following the existing pattern.

### faGetPackages

```typescript
// lib/ai/tools/fa-get-packages.ts
tool({
  description: `Retrieve available screening packages from First Advantage.
Use when:
- Determining what screening options are available
- Checking required candidate fields for a specific package`,
  inputSchema: z.object({}),
  execute: async () => {
    const client = getClient();
    const packages = await client.getPackages();
    return { data: packages };
  },
});
```

### faCreateCandidate

```typescript
// lib/ai/tools/fa-create-candidate.ts
tool({
  description: `Create a candidate record in First Advantage.
Use when:
- Initiating background screening for a candidate
- The candidate doesn't yet exist in FA's system
Requires: firstName, lastName, email, clientReferenceId (our profileId)`,
  inputSchema: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    clientReferenceId: z.string().describe("Credentially profile ID"),
    dateOfBirth: z.string().optional(),
    ssn: z.string().optional().describe("Last 4 digits only for demo"),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
    }).optional(),
  }),
  execute: async (input) => {
    const client = getClient();
    const candidate = await client.createCandidate(input);
    return { data: candidate };
  },
});
```

### faInitiateScreening

```typescript
// lib/ai/tools/fa-initiate-screening.ts
tool({
  description: `Initiate a background screening via First Advantage.
Use when:
- All candidate data is available
- The appropriate package has been identified
- Candidate record exists in FA`,
  inputSchema: z.object({
    candidateId: z.string().describe("FA candidate ID"),
    packageId: z.string().describe("FA screening package ID"),
    callbackUri: z.string().optional().describe("Webhook URL for status updates"),
  }),
  execute: async (input) => {
    const client = getClient();
    const screening = await client.initiateScreening(input);
    return { data: screening };
  },
});
```

### faCheckScreening

```typescript
// lib/ai/tools/fa-check-screening.ts
tool({
  description: `Check the status of a First Advantage background screening.
Use when:
- Monitoring progress of an active screening
- Checking if results are ready
- Updating compliance status based on FA results`,
  inputSchema: z.object({
    screeningId: z.string().describe("FA screening ID"),
  }),
  execute: async (input) => {
    const client = getClient();
    const screening = await client.getScreening(input.screeningId);
    return { data: screening };
  },
});
```

### faGetReport

```typescript
// lib/ai/tools/fa-get-report.ts
tool({
  description: `Get a link to the full screening report from First Advantage.
Use when:
- Screening is complete and user wants to review the full report
- Sharing report access with compliance team`,
  inputSchema: z.object({
    screeningId: z.string().describe("FA screening ID"),
  }),
  execute: async (input) => {
    const client = getClient();
    const link = await client.getReportLink(input.screeningId);
    return { data: link };
  },
});
```

### Tool Registration

All five tools registered in `lib/ai/agents/tool-resolver.ts` following the existing pattern.

---

## Component 3: Three Agent Definitions

All agents are manually invoked, following the existing `AgentDefinition` pattern.

### Agent 1: Compliance Gap Analyzer

**Purpose:** Given a candidate and a placement context (role, facility, state), resolve all compliance requirements, show where each requirement comes from, and identify gaps grouped by who handles them (FA, Credentially, candidate).

**Demo script:** "Ashlyn is a Travel ICU RN being placed at Memorial Hospital in Florida. What does she need?"

```typescript
// lib/ai/agents/definitions/compliance-gap-analyzer.ts

export const complianceGapAnalyzerAgent: AgentDefinition = {
  id: "compliance-gap-analyzer",
  name: "Compliance Gap Analyzer",
  description: "Resolves placement requirements from role, facility, and state context. Shows what's complete, what carries forward, what needs FA screening, and what the candidate must provide. Groups requirements by source so the audience sees WHY each item is required.",
  version: "1.0",

  systemPrompt: `You are a compliance gap analyzer for a US healthcare staffing company.

Given a candidate and a placement (role + facility + state), you must show WHAT is required and WHY.

STEP 1 — LOOK UP THE CANDIDATE:
Use getLocalProfile to find the candidate. If a search term is provided instead of an ID, use searchLocalCandidates first.

STEP 2 — RESOLVE PLACEMENT REQUIREMENTS:
Use resolvePlacementRequirements with the candidate's role, target state, and facility type. This returns all required compliance elements grouped by source:

- FEDERAL CORE: Items every US healthcare worker needs (I-9, federal background check, drug screen, BLS, health records)
- STATE-SPECIFIC: Items required by the target state (e.g. Florida Level 2 fingerprint, FL RN licence)
- ROLE-SPECIFIC: Items required by the candidate's role (e.g. ICU nurse needs ACLS, PALS, Critical Care cert)
- FACILITY-SPECIFIC: Items required by this specific facility (hospital credentialing, unit orientation — these are placement-scoped and don't carry forward)
- EXCLUSION CHECKS (conditional): OIG/SAM checks, only when deal context requires tier-2 (lapse deals, certain states, facility requirements)

This grouping is critical. It shows WHERE each requirement comes from, not just a flat checklist.

STEP 3 — GET CURRENT COMPLIANCE STATUS:
Use getPlacementCompliance to check which requirements the candidate already fulfils. This compares existing evidence (from previous placements or candidate-scoped items) against the resolved requirements. It shows:
- Items that carry forward from previous placements (worker passport)
- Items that are new for this placement
- Items that have expired since last assignment

STEP 4 — GET FA PACKAGES:
Use faGetPackages to see what screening packages First Advantage offers. Match the outstanding background check items to the right FA package.

STEP 5 — PRESENT THE ANALYSIS:
Group the output by requirement source, not just status. For each group, show:

FEDERAL CORE (X of Y complete)
  ✓ Item — status, evidence source
  ✗ Item — what's needed, who handles it (FA / candidate / Credentially)

STATE: FLORIDA (X of Y complete)
  ✓ Item — carries forward from [previous state] OR new for this state
  ✗ Item — what's needed

ROLE: ICU RN (X of Y complete)
  ✓ Item — carries forward, expiry date
  ✗ Item — what's needed

FACILITY: MEMORIAL HOSPITAL (X of Y complete)
  ✗ Item — placement-scoped, must be completed fresh

Then summarise:
1. Overall compliance: X of Y items (Z%)
2. Items carrying forward from previous assignments (the worker passport value)
3. New items for this placement
4. Recommended FA screening package (#1 Standard or #2 Standard + OIG/SAM) and why
5. Estimated time to full compliance
6. What can start immediately vs what's blocked

Be specific about state requirements. Florida requires Level 2 fingerprinting. Texas requires state DPS check. California requires DOJ LiveScan.

The grouped output is the key demo moment. It shows the audience that Credentially understands WHERE requirements come from — role, state, facility, federal — not just what they are. FA doesn't know any of this. That's the intelligence layer.`,

  tools: [
    "getLocalProfile",
    "resolvePlacementRequirements",
    "getPlacementCompliance",
    "searchLocalCandidates",
    "faGetPackages",
    "getAgentMemory",
    "saveAgentMemory",
  ],

  inputSchema: z.object({
    candidateSearch: z.string()
      .describe("Candidate name, email, or profile ID"),
    targetState: z.string()
      .default("florida")
      .describe("US state for the placement (e.g. florida, texas, california)"),
    facilityName: z.string()
      .optional()
      .describe("Facility name (e.g. Memorial Hospital)"),
    roleName: z.string()
      .optional()
      .describe("Role name (e.g. Travel ICU RN)"),
    dealType: z.enum(["standard", "lapse", "quickstart", "reassignment"])
      .default("standard")
      .describe("Type of deal — affects package selection and carry-forward logic"),
  }),

  constraints: {
    maxSteps: 12,
    maxExecutionTime: 45000,
  },

  trigger: {
    type: "manual",
    description: "When a recruiter needs to assess compliance readiness for a placement",
  },

  oversight: { mode: "auto" },
};
```

### Agent 2: Background Screening Agent

**Purpose:** Create a candidate in FA, select the right package, and initiate the background screening.

**Demo script:** "Initiate background screening for Amanda Davis"

```typescript
// lib/ai/agents/definitions/background-screening.ts

export const backgroundScreeningAgent: AgentDefinition = {
  id: "background-screening",
  name: "Initiate Background Screening",
  description: "Creates a candidate in First Advantage, selects the appropriate screening package, and initiates the background check.",
  version: "1.0",

  systemPrompt: `You are initiating a background screening via First Advantage for a healthcare worker.

STEP 1 — LOOK UP THE CANDIDATE:
Use getLocalProfile to get the candidate's details. You need their full name, email, and profile ID.

STEP 2 — CHECK COMPLIANCE STATUS:
Use getLocalCompliance to understand what screening is needed. Focus on items that require FA screening (background checks, drug screens, exclusion checks).

STEP 3 — SELECT FA PACKAGE:
Use faGetPackages to retrieve available packages. Medsol uses two background packages:

PACKAGE #1 (Standard): SSN Trace, County Criminal, Federal Criminal, Nationwide Criminal 7yr, NSOPW, FACIS Level III.
Use for: Standard new placements, quickstarts, rollovers, rekeys.

PACKAGE #2 (Standard + OIG/SAM): Everything in Package #1 plus Statewide Criminal, OIG (HHS), EPLS/SAM (GSA).
Use for: Lapse deals (clinician returning after gap), facility-specific requirements, government-adjacent placements, any scenario where exclusion list checks are required.

Selection logic:
- If the candidate has been inactive for more than 30 days (lapse deal), use Package #2
- If the facility requires OIG/SAM exclusion checks, use Package #2
- If the state requires statewide criminal (varies by state), use Package #2
- Otherwise, Package #1 is sufficient
- Also check what's already been screened and is still current. Don't re-screen unnecessarily (this is the worker passport value)

STEP 4 — CREATE FA CANDIDATE:
Use faCreateCandidate with the candidate's details. Use their Credentially profile ID as the clientReferenceId to maintain the link.

STEP 5 — INITIATE SCREENING:
Use faInitiateScreening with the FA candidate ID and selected package ID.

STEP 6 — SAVE MEMORY:
Use saveAgentMemory to record the screening ID, package, and timestamp so the status monitor can track it.

STEP 7 — SUMMARISE:
Report what was initiated:
- Candidate name and FA candidate ID
- Package selected and why
- Screening components included
- Expected turnaround time
- Next steps (status monitoring)

Be methodical. Explain each decision briefly so the audience understands why this package was selected.`,

  tools: [
    "getLocalProfile",
    "getLocalCompliance",
    "searchLocalCandidates",
    "faGetPackages",
    "faSelectPackage",
    "faCreateCandidate",
    "faInitiateScreening",
    "getAgentMemory",
    "saveAgentMemory",
    "createTask",
  ],

  inputSchema: z.object({
    candidateSearch: z.string()
      .describe("Candidate name, email, or profile ID"),
    targetState: z.string()
      .default("florida")
      .describe("US state for the placement"),
  }),

  constraints: {
    maxSteps: 15,
    maxExecutionTime: 45000,
  },

  trigger: {
    type: "manual",
    description: "When a compliance team member needs to initiate background screening",
  },

  oversight: { mode: "auto" },
};
```

### Agent 3: Screening Status Monitor

**Purpose:** Check status of pending FA screenings, map results back to compliance elements, and update statuses.

**Demo script:** "Check status on pending screenings"

```typescript
// lib/ai/agents/definitions/screening-status-monitor.ts

export const screeningStatusMonitorAgent: AgentDefinition = {
  id: "screening-status-monitor",
  name: "Screening Status Monitor",
  description: "Checks the status of all pending First Advantage screenings, maps results back to compliance elements, and provides a status report.",
  version: "1.0",

  systemPrompt: `You are monitoring active background screenings via First Advantage.

STEP 1 — RETRIEVE MEMORY:
Use getAgentMemory to find all active screening IDs that were previously initiated. The memory key is "fa-screenings" and contains an array of { screeningId, candidateId, profileId, candidateName, packageId, initiatedAt }.

STEP 2 — CHECK EACH SCREENING:
For each active screening, use faCheckScreening to get the current status.

STEP 3 — ANALYSE RESULTS:
For each screening, report:
- Candidate name and screening ID
- Overall status (pending/in_progress/complete)
- Per-component status (criminal: clear, drug test: pending, etc.)
- If complete: the overall result (clear/consider/adverse)
- Time elapsed since initiation

STEP 4 — MAP TO COMPLIANCE:
For completed screenings, explain how each result maps back to the candidate's compliance status:
- Criminal clear → federal-background-check and state-background-check can be marked verified
- Drug test clear → drug-screen can be marked verified
- OIG/SAM clear → exclusion checks verified
- Any "consider" or "adverse" results → flag for human review

STEP 5 — UPDATE MEMORY:
Use saveAgentMemory to update the screening records — remove completed ones, update statuses.

STEP 6 — REPORT:
Provide a clear summary dashboard:
- Total active screenings
- Completed since last check
- Any items requiring attention (adverse results, overdue)
- Next recommended check time

Format as a status dashboard — scannable, with clear indicators for each screening.`,

  tools: [
    "faCheckScreening",
    "faGetReport",
    "getLocalProfile",
    "getPlacementCompliance",
    "resolvePlacementRequirements",
    "getAgentMemory",
    "saveAgentMemory",
    "createTask",
  ],

  inputSchema: z.object({
    screeningId: z.string()
      .optional()
      .describe("Check a specific screening ID, or leave empty to check all active"),
  }),

  constraints: {
    maxSteps: 20,
    maxExecutionTime: 60000,
  },

  trigger: {
    type: "manual",
    description: "When checking on pending background screenings",
  },

  oversight: { mode: "auto" },
};
```

---

## Component 4: Tool Result Renderers

Rich UI components for FA tool results, registered in the tool handler registry.

### FA Screening Status Renderer

Displays screening progress with per-component status indicators.

```
┌─────────────────────────────────────────────────┐
│ ⚡ Background Screening — Amanda Davis           │
│ Package: Florida Healthcare + Federal            │
│ Status: In Progress (3 of 5 complete)            │
├─────────────────────────────────────────────────┤
│ ✅ Federal Criminal Search          Clear        │
│ ✅ Florida State Criminal           Clear        │
│ ✅ OIG/SAM Exclusion                Clear        │
│ ⏳ Drug Test (10-panel)             In Progress  │
│ ⏳ County Criminal Search           In Progress  │
├─────────────────────────────────────────────────┤
│ Initiated: 2 hours ago · Est. completion: 3-5d  │
└─────────────────────────────────────────────────┘
```

### Placement Compliance Renderer

The key demo component. Shows requirements grouped by WHERE they come from, not just a flat checklist. This is what makes the audience see the intelligence layer.

```
┌─────────────────────────────────────────────────────┐
│ Placement Compliance — Ashlyn Torres                 │
│ Travel ICU RN · Memorial Hospital · Florida          │
│ Overall: 9 of 15 items (60%)                         │
│ 6 carry forward · 3 need FA · 4 need action · 2 new │
├─────────────────────────────────────────────────────┤
│                                                       │
│ FEDERAL CORE                              4/5 ✓      │
│ ─────────────────────────────────────────────         │
│ ✅ I-9 Verification              candidate-scoped     │
│ ✅ SSN Trace                     carries forward      │
│ ✅ Drug Screen (10-panel)        carries forward      │
│ ✅ TB Test                       carries forward      │
│ 🔵 Federal Background Check     → FA Package #1      │
│                                                       │
│ STATE: FLORIDA                            1/3 ✓      │
│ ─────────────────────────────────────────────         │
│ ⬜ Florida RN License            candidate must apply  │
│ 🔵 FL Level 2 Background        → FA Package #2      │
│ ✅ Nationwide Criminal           carries forward      │
│                                                       │
│ ROLE: ICU RN                              3/4 ✓      │
│ ─────────────────────────────────────────────         │
│ ✅ BLS Certification             carries forward      │
│ ✅ ACLS Certification            carries forward      │
│ ✅ Critical Care Cert            carries forward      │
│ ⚠️ PALS Certification           expires in 45 days   │
│                                                       │
│ FACILITY: MEMORIAL HOSPITAL               0/2 ✓      │
│ ─────────────────────────────────────────────         │
│ ⬜ Hospital Credentialing        placement-scoped     │
│ ⬜ Unit Orientation              placement-scoped     │
│                                                       │
├─────────────────────────────────────────────────────┤
│ FA SCREENING                                          │
│ Recommended: Package #1 (Standard)                    │
│ Reason: New placement, no lapse, no OIG/SAM required  │
│ Components: Federal Criminal, County Criminal,        │
│ Nationwide 7yr, SSN Trace, NSOPW, FACIS III           │
│ Est. turnaround: 3-5 business days                    │
├─────────────────────────────────────────────────────┤
│ 6 items carry forward from Texas assignment            │
│ Start FA screening now — licence takes 2-4 weeks      │
└─────────────────────────────────────────────────────┘
```

The "carries forward" labels are the worker passport in action. For a reassignment scenario, most items show "carries forward" and the audience immediately gets it.

### Implementation

Each renderer follows the existing `ToolHandlerProps` pattern in `components/tool-handlers/handlers/`:

- `fa-screening-tool.tsx` — screening status card
- `fa-gap-analysis-tool.tsx` — gap analysis card
- `fa-packages-tool.tsx` — package list card

Registered in `components/tool-handlers/index.tsx`.

---

## Component 5: Seed Data Extension

### New Compliance Elements

Add to `lib/db/seed/markets/us.ts`:

```typescript
// OIG/SAM Exclusion Checks (FA handles these)
{
  name: "OIG Exclusion Check",
  slug: "oig-exclusion-check",
  description: "Office of Inspector General excluded individuals check",
  category: "identity",
  scope: "candidate",
  evidenceType: "check",
  expiryDays: 30,           // Monthly re-check required
  expiryWarningDays: 7,
  verificationRules: {
    validationMode: "external",
    externalIntegration: "first-advantage",
  },
},
{
  name: "SAM Exclusion Check",
  slug: "sam-exclusion-check",
  description: "System for Award Management debarment check",
  category: "identity",
  scope: "candidate",
  evidenceType: "check",
  expiryDays: 30,
  expiryWarningDays: 7,
  verificationRules: {
    validationMode: "external",
    externalIntegration: "first-advantage",
  },
},
{
  name: "Florida Level 2 Background Check",
  slug: "florida-background-check",
  description: "Florida FDLE Level 2 fingerprint-based background check",
  category: "identity",
  scope: "candidate",
  evidenceType: "check",
  expiryDays: 365,
  expiryWarningDays: 60,
  onlyJurisdictions: ["florida"],
  verificationRules: {
    validationMode: "external",
    externalIntegration: "first-advantage",
  },
},
```

### Package Updates

OIG/SAM are **tier-2 only** — NOT in federal core. They're conditionally included by the requirements engine when deal context triggers it (lapse deals, certain states, facility requirements).

```typescript
"federal-core-package": [
  "i9-verification",
  "federal-background-check",
  "bls-certification",
  "tb-test",
  "hep-b-vaccination",
  "flu-vaccination",
],
"exclusion-checks-package": [    // NEW — conditionally applied, not in federal core
  "oig-exclusion-check",
  "sam-exclusion-check",
],
```

Add Florida background check to Florida package:

```typescript
"florida-package": [
  "florida-rn-license",
  "florida-background-check",   // NEW
],
```

### Candidate Data

Ensure US candidates (particularly `amanda.davis` or equivalent) have a mix of:
- Complete items (BLS, ACLS, health records)
- Items needing FA screening (no federal/state background check yet)
- Items needing candidate action (no Florida licence yet)
- Items pending Credentially review

This creates the perfect demo scenario for the gap analyzer.

---

## Component 6: Environment Configuration

```env
# First Advantage / Sterling API
FA_API_MODE=live                                          # "mock" or "live"
FA_CLIENT_ID=ApiUserMedSol                                # Sterling API credentials
FA_CLIENT_SECRET=<stored in .env.local only>
FA_API_BASE_URL=https://api.us.int.sterlingcheck.app/v2   # Integration environment
```

**Live-first approach:** We have working credentials. Build with the real API, fall back to mock only if the API is down or for offline development. The mock mirrors the real package structure (IDs, components, required fields) from the actual Medsol account.

---

## Component 7: Placement Requirements Engine

This is the piece that makes the demo work. Without it, the Gap Analyzer just shows a flat checklist. With it, the agent can explain WHERE each requirement comes from and WHAT carries forward from previous assignments.

### The Problem

The schema has all the pieces: placements, assignment rules, scoped elements, evidence linked to placements. But there's no runtime logic that stitches it together. No function that says "for this placement, here are the required elements, grouped by source."

### What We're Building

Two new tools that sit between the agents and the data layer:

#### resolvePlacementRequirements

Takes a placement context (role, state, facility type) and returns all required compliance elements, grouped by source.

```typescript
// lib/ai/tools/resolve-placement-requirements.ts

interface PlacementContext {
  roleName: string;           // e.g. "Travel ICU RN"
  targetState: string;        // e.g. "florida"
  facilityType: string;       // e.g. "hospital"
  facilityName?: string;      // e.g. "Memorial Hospital"
  dealType?: "standard" | "lapse" | "quickstart" | "reassignment";
}

interface RequirementGroup {
  source: "federal" | "state" | "role" | "facility";
  label: string;              // e.g. "Federal Core", "State: Florida", "Role: ICU RN"
  packageId: string;          // which package this group comes from
  packageName: string;
  elements: ResolvedElement[];
}

interface ResolvedElement {
  elementId: string;
  elementName: string;
  elementSlug: string;
  scope: "candidate" | "placement";
  isFA: boolean;              // true if First Advantage handles this
  category: string;           // identity, certification, health, training, etc.
  expiryDays: number | null;
}

// Returns grouped requirements for a placement
tool({
  description: `Resolve all compliance requirements for a placement.
Takes a role, state, and facility and returns every required element, grouped by WHERE the requirement comes from:
- Federal Core: items every US healthcare worker needs
- State-specific: items required by the target state
- Role-specific: items required by the job role
- Facility-specific: items required by this specific facility (placement-scoped)

Use this BEFORE checking compliance status. It tells you WHAT is needed. Then use getPlacementCompliance to check what's already fulfilled.`,
  inputSchema: z.object({
    roleName: z.string().describe("Job role, e.g. Travel ICU RN"),
    targetState: z.string().describe("US state, e.g. florida"),
    facilityType: z.string().default("hospital"),
    facilityName: z.string().optional(),
  }),
  execute: async (input) => {
    // 1. Look up role → find role packages (ICU → requires ACLS, PALS, etc.)
    // 2. Look up state → find state packages (Florida → FL licence, Level 2 background)
    // 3. Look up facility type → find facility packages (hospital → credentialing, orientation)
    // 4. Always include federal core package
    // 5. Group elements by source, tag each with scope and isFA flag
    return { data: { groups: RequirementGroup[], totalElements: number } };
  },
});
```

#### getPlacementCompliance

Takes a candidate and resolved requirements, and checks what's fulfilled vs missing.

```typescript
// lib/ai/tools/get-placement-compliance.ts

interface PlacementComplianceItem {
  elementId: string;
  elementName: string;
  source: "federal" | "state" | "role" | "facility";
  status: "fulfilled" | "missing" | "expired" | "expiring_soon" | "pending_review";
  carriesForward: boolean;     // true if fulfilled from a previous placement
  previousPlacement?: string;  // e.g. "Texas — Memorial Hermann (ended 2025-12-15)"
  evidenceId?: string;
  expiresAt?: string;
  handledBy: "first_advantage" | "credentially" | "candidate";
  actionRequired?: string;     // e.g. "candidate must apply for FL licence"
}

tool({
  description: `Check a candidate's compliance status against resolved placement requirements.
Shows which items are fulfilled, which carry forward from previous assignments (worker passport),
which have expired, and who needs to act on each gap (FA, Credentially, or candidate).

Call resolvePlacementRequirements first to get the requirement list, then call this to check fulfilment.`,
  inputSchema: z.object({
    profileId: z.string().describe("Candidate profile ID"),
    targetState: z.string().describe("Target state for the placement"),
    roleName: z.string().describe("Role name"),
    facilityType: z.string().default("hospital"),
    dealType: z.enum(["standard", "lapse", "quickstart", "reassignment"]).default("standard"),
  }),
  execute: async (input) => {
    // 1. Resolve requirements (or accept pre-resolved)
    // 2. Find all evidence for this candidate (profile-scoped)
    // 3. For each required element, check if evidence exists and is current
    // 4. Tag carry-forward items with the previous placement they come from
    // 5. For expired items, check if it's a lapse scenario
    // 6. Classify each gap by handler (FA, Credentially, candidate)
    return {
      data: {
        items: PlacementComplianceItem[],
        summary: {
          total: number,
          fulfilled: number,
          carryForward: number,
          missing: number,
          expired: number,
          expiringSoon: number,
          percentage: number,
        },
        recommendedFAPackage: { id: string, name: string, reason: string },
      }
    };
  },
});
```

### How It Works Under the Hood

The engine walks the package hierarchy to build the full requirement set:

```
Placement: Ashlyn → Travel ICU RN → Memorial Hospital → Florida
│
├── Federal Core Package (always applied)
│   └── I-9, Federal Background, Drug Screen, BLS, TB Test, Vaccinations
│
├── State Package: Florida
│   └── FL RN Licence, FL Level 2 Background, Nationwide Criminal
│
├── Role Package: ICU RN
│   └── BLS, ACLS, PALS, Critical Care Cert
│
└── Facility Package: Hospital (placement-scoped)
    └── Hospital Credentialing, Unit Orientation
```

Each element gets tagged with:
- **scope** (candidate or placement) — candidate-scoped items can carry forward
- **isFA** — whether First Advantage handles this check
- **source** — which package layer required it (federal, state, role, facility)

The compliance check then matches evidence against requirements:
- Candidate-scoped evidence persists across placements (worker passport)
- Placement-scoped evidence is specific to this placement (hospital orientation)
- Expired evidence is flagged, with special handling for lapse deals

### Requirement Resolution Logic

This is the algorithm from DATA_MODEL.md, implemented as a queryable function:

```typescript
// lib/compliance/resolve-requirements.ts

function resolveRequirements(context: PlacementContext): RequirementGroup[] {
  const groups: RequirementGroup[] = [];

  // 1. Federal core — always applied
  const federalPkg = getPackageBySlug("federal-core-package");
  groups.push({
    source: "federal",
    label: "Federal Core",
    packageId: federalPkg.id,
    packageName: federalPkg.name,
    elements: getPackageElements(federalPkg.id),
  });

  // 2. State-specific — based on targetState
  const statePkg = getStatePackage(context.targetState);
  if (statePkg) {
    groups.push({
      source: "state",
      label: `State: ${capitalize(context.targetState)}`,
      packageId: statePkg.id,
      packageName: statePkg.name,
      elements: getPackageElements(statePkg.id),
    });
  }

  // 3. Role-specific — based on role's required packages
  const rolePkgs = getRolePackages(context.roleName);
  for (const pkg of rolePkgs) {
    groups.push({
      source: "role",
      label: `Role: ${context.roleName}`,
      packageId: pkg.id,
      packageName: pkg.name,
      elements: getPackageElements(pkg.id),
    });
  }

  // 4. Facility-specific — placement-scoped items
  const facilityPkg = getFacilityPackage(context.facilityType);
  if (facilityPkg) {
    groups.push({
      source: "facility",
      label: `Facility: ${context.facilityName || capitalize(context.facilityType)}`,
      packageId: facilityPkg.id,
      packageName: facilityPkg.name,
      elements: getPackageElements(facilityPkg.id),
    });
  }

  return groups;
}
```

### Seed Data for Requirement Resolution

The existing seed data in `lib/db/seed/markets/us.ts` already has packages (Federal Core, RN, ICU, California, Texas, Florida, Hospital) and role-to-package mappings. We need to extend it with:

**New packages:**
- `medsol-standard-package` — maps to FA Package #1 components
- `medsol-oig-sam-package` — maps to FA Package #2 additional components

**New role-to-package assignments:**
- Travel ICU RN → Federal Core + ICU + state package (based on placement)
- Travel RN → Federal Core + RN + state package

**New facility packages:**
- Hospital → Hospital Credentialing + Unit Orientation (placement-scoped)

**Placement seed data (new):**

Three placements seeded for the demo scenarios:

```typescript
// Scenario 1: Ashlyn — New clinician, Florida ICU placement
{
  profileId: ashlyn.id,
  roleId: travelIcuRn.id,
  workNodeId: memorialHospitalFL.id,
  status: "compliance",
  compliancePercentage: 60,
  isCompliant: false,
}

// Scenario 2: Lexie — Reassignment, California placement (prev: Texas)
{
  profileId: lexie.id,
  roleId: travelRn.id,
  workNodeId: cedarsCA.id,
  status: "compliance",
  compliancePercentage: 85,  // most items carry forward
  isCompliant: false,
  // Previous placement (completed):
  // Texas, ended 2026-01-15, fully compliant at close
}

// Scenario 3: Peter — Lapse deal, Florida placement (inactive 6 months)
{
  profileId: peter.id,
  roleId: travelRn.id,
  workNodeId: memorialHospitalFL.id,
  status: "compliance",
  compliancePercentage: 30,  // lots expired
  isCompliant: false,
  // Last placement ended 2025-08-01 — 6 month gap
}
```

Each candidate also needs evidence records:
- **Ashlyn:** Some candidate-scoped evidence (BLS, ACLS, health records) but no background checks or state licence
- **Lexie:** Full evidence from Texas placement. Candidate-scoped items carry forward. Texas-specific items don't (TX licence doesn't help in CA)
- **Peter:** Evidence exists but much of it is expired (background check older than 12 months, drug screen expired, BLS lapsed)

### WorkNode Seed Data

Need to seed facilities as workNodes:

```typescript
// Memorial Hospital, Florida
{
  name: "Memorial Hospital",
  type: "facility",
  jurisdiction: "florida",
  parentId: medsol.orgNodeId,  // under Medsol's org tree
}

// Cedars-Sinai, California
{
  name: "Cedars-Sinai Medical Center",
  type: "facility",
  jurisdiction: "california",
  parentId: medsol.orgNodeId,
}
```

---

## Demo Narrative

Three scenes that map to real Medsol scenarios. Each builds on the last.

### Scene 1: New Clinician — Requirements Intelligence (Scenario 1: Ashlyn)

> "Ashlyn is a new Travel ICU RN being placed at Memorial Hospital in Florida. What does she need?"

Gap Analyzer runs → shows:
- Requirements grouped by source (federal core, state: Florida, role: ICU RN, facility: Memorial Hospital)
- 7 of 11 items already complete (BLS, ACLS, health records from onboarding)
- 3 items need FA screening (federal criminal, FL Level 2 background, drug screen)
- 1 item needs candidate action (Florida RN licence)
- No OIG/SAM needed (standard deal, Package #1)
- Recommends Package #1 (Standard) via `faSelectPackage` tool — cites reason

**Key message:** Credentially knows what's needed. FA doesn't make this decision. Someone has to tell FA what to run, which package, for which state. That's the intelligence layer.

### Scene 2: Screening Initiation (Scenario 1 continued)

> "Initiate background screening for Ashlyn."

Background Screening Agent runs → looks up Ashlyn → checks compliance status → selects Package #1 (Standard) and explains why → creates candidate in FA → initiates screening → confirms all components → saves screening ID for tracking.

**Key message:** One click, not manual package selection and data entry in FA's portal. The agent reasons through the package selection so the audience can see why.

### Scene 3: The Reassignment — Worker Passport (Scenario 2: Lexie)

> "Lexie just finished an assignment in Texas. She's being reassigned to a facility in California. What's her status?"

Gap Analyzer runs → shows:
- 9 of 13 items carry forward from Texas assignment (worker passport in action)
- Federal background check still valid (within 12 months)
- Drug screen still valid
- Only new requirements: California RN licence, California DOJ LiveScan (state-specific), facility orientation
- Recommends: No new FA screening needed for background. Only state-specific items.

**Key message:** This is the "aha" moment. Without a worker passport, Lexie's reassignment starts from scratch every 13 weeks. With Credentially, most of her compliance carries forward. The Gap Analyzer shows exactly what's new vs what transfers. That saves days of onboarding time and avoids duplicate screening costs.

### Scene 4: The Lapse Deal — Package Intelligence (Scenario 5: Peter)

> "Peter was a travel nurse who's been inactive for 6 months. He wants to come back for a placement in Florida."

Gap Analyzer runs → flags:
- Multiple expired items (background check older than 12 months, expired drug screen, lapsed BLS)
- Identifies this as a lapse deal (inactive for more than 30 days)
- Recommends Package #2 (Standard + OIG/SAM) because lapse deals need exclusion list re-checks

Background Screening Agent runs → **automatically selects Package #2** and explains: "This is a lapse deal. Peter has been inactive for 6 months, so we need the full package including OIG and SAM exclusion checks."

**Key message:** The agent doesn't just run a default package. It looks at the context and makes the right call. FA is the screening API. Credentially is the brain that decides what to screen, when, and why.

### Scene 5: (Bonus) Status Dashboard

> "Show me all pending screenings."

Status Monitor runs → shows dashboard with all active screenings across candidates, per-component progress, maps completed results back to compliance elements, flags anything needing attention.

**Key message:** Single pane of glass. FA results sit alongside licences, certifications, health records. Not a separate system to check. And when the monthly FACIS/Nursys re-checks are due, the same system handles those too.

---

## Medsol Scenario Mapping

These are real Medsol business scenarios from their credentialing use cases document. Each maps to one or more of our three agents.

### Scenario → Agent Matrix

| # | Scenario | Description | Primary Agent | Supporting Agents | Package | Demo Priority |
|---|----------|-------------|---------------|-------------------|---------|---------------|
| 1 | **New Clinician** (Ashlyn) | First-time placement, full onboarding | Gap Analyzer | Background Screening → Status Monitor | #1 Standard | **HIGH** — full flow demo |
| 2 | **Reassignment** (Lexie) | Existing clinician, new facility/state | Gap Analyzer | Background Screening (if state changed) | #1 or #2 | **HIGH** — worker passport showcase |
| 3 | **Duo Deal** (Jessa) | Clinician works two facilities simultaneously | Gap Analyzer (x2) | Background Screening (one screening, two requirement sets) | #1 Standard | MEDIUM |
| 4 | **Quickstart** (Dina) | Expedited placement, 48hr turnaround | Gap Analyzer | Background Screening (priority flag) | #1 Standard | MEDIUM |
| 5 | **Lapse Deal** (Peter) | Clinician returning after gap, credentials may have expired | Gap Analyzer | Background Screening (re-screen) | **#2 with OIG/SAM** | **HIGH** — edge case value |
| 6 | **VMS Host** | Vendor Management System placement | Gap Analyzer | Background Screening | #1 Standard | LOW |
| 7 | **External MSP** | Managed Service Provider external placement | Gap Analyzer | Background Screening | #1 Standard | LOW |
| 8 | **Rollover** | Contract extension at same facility | Gap Analyzer | Status Monitor (expiry checks) | None (carry forward) | MEDIUM |
| 9 | **Rekey** | Same facility, different unit/department | Gap Analyzer | Background Screening (unit-specific) | None or #1 | LOW |
| 10 | **Expiring Doc** | Approaching expiry, needs renewal | Status Monitor | Background Screening (re-screen if needed) | Varies | MEDIUM |

### Key Insights from Scenario Analysis

**Worker passport is the reassignment story.** Scenario 2 (Lexie) is the one that'll resonate most. Travel nurses change assignments every 13 weeks. Without a worker passport, every reassignment starts from scratch. With Credentially, the Gap Analyzer shows what carries over vs what's new for the target state. That's a massive time and cost saving.

**Two packages, not one.** Medsol uses two distinct background packages. The intelligence is knowing which one to run. FA doesn't make that decision. Credentially's Background Screening Agent looks at the deal type, the candidate's history, the facility requirements, and picks the right package. That's the intelligence layer in action.

**Edge cases are where the value lives.** The PDF describes specific scenarios:
- Negative dilute on drug screen → automatic re-test
- License hit (disciplinary action) → escalate for human review
- Misdemeanour on background check → facility-specific adjudication rules
- TB positive → cascade to chest X-ray requirement
- County criminal search delays → flag and continue with other components
- Employment verification failure → multiple attempts before escalation

These aren't things FA handles. FA runs the check and returns a result. Credentially interprets that result, applies business rules, and decides what happens next. That's the demo message.

**Ongoing monitoring needs both systems.** Medsol requires monthly FACIS and Nursys checks. The Status Monitor agent handles the Credentially side (licence status, document expiry). The Background Screening agent can trigger monthly FA re-screens for exclusion lists. Together, they give continuous compliance visibility that neither system provides alone.

### Demo Scenario Selection

For the Thursday demo, focus on three scenarios that tell the full story:

1. **Scenario 1 (Ashlyn — New Clinician):** Full happy path. Gap analysis → screening initiation → status monitoring. Shows the complete flow.
2. **Scenario 2 (Lexie — Reassignment):** Worker passport. Gap analysis shows most items carry forward from previous assignment. Only delta needs screening. This is the "aha" moment.
3. **Scenario 5 (Peter — Lapse Deal):** Package #2 selection. Gap analysis shows expired credentials. Agent automatically selects the OIG/SAM package because it's a lapse deal. Demonstrates the intelligence layer picking the right screening.

---

## Two-Package Selection Logic

Medsol's background screening uses two package tiers. The Background Screening Agent needs to pick the right one based on context.

### Package Definitions

**Package #1 — Standard**
| Component | FA Screening Type |
|-----------|------------------|
| SSN Trace | `ssn_trace` |
| County Criminal | `criminal_county` |
| Federal Criminal | `criminal_federal` |
| Nationwide Criminal 7yr | `criminal_nationwide` |
| NSOPW (Sex Offender) | `sex_offender_national` |
| FACIS Level III | `facis_level3` |

**Package #2 — Standard + OIG/SAM**
Everything in Package #1, plus:

| Component | FA Screening Type |
|-----------|------------------|
| Statewide Criminal | `criminal_state` |
| OIG (HHS) | `oig_exclusion` |
| EPLS/SAM (GSA) | `sam_exclusion` |

### Selection Rules

```
IF candidate.lastAssignmentEndDate is more than 30 days ago (lapse deal)
  → Package #2

IF facility.requiresOigSam is true
  → Package #2

IF targetState requires statewide criminal search
  → Package #2

IF dealType is "government" or "federal"
  → Package #2

ELSE
  → Package #1
```

### Implementation

```typescript
// lib/api/first-advantage/package-selector.ts

interface PackageSelectionInput {
  candidateId: string;
  lastAssignmentEndDate?: string;
  targetState: string;
  facilityRequirements?: { requiresOigSam?: boolean };
  dealType?: "standard" | "lapse" | "quickstart" | "government";
}

function selectPackage(input: PackageSelectionInput): {
  packageId: string;
  packageName: string;
  reason: string;
} {
  // Package #2 triggers
  if (input.dealType === "lapse") {
    return { packageId: PACKAGE_2_ID, packageName: "Standard + OIG/SAM", reason: "Lapse deal — candidate inactive, full re-screening with exclusion checks required" };
  }
  if (input.facilityRequirements?.requiresOigSam) {
    return { packageId: PACKAGE_2_ID, packageName: "Standard + OIG/SAM", reason: "Facility requires OIG/SAM exclusion checks" };
  }
  if (STATES_REQUIRING_STATEWIDE_CRIMINAL.includes(input.targetState)) {
    return { packageId: PACKAGE_2_ID, packageName: "Standard + OIG/SAM", reason: `${input.targetState} requires statewide criminal search` };
  }

  // Default: Package #1
  return { packageId: PACKAGE_1_ID, packageName: "Standard", reason: "Standard new placement — full background package" };
}
```

The agent calls `selectPackage()` during STEP 3, then explains the selection to the audience. This is one of the strongest demo moments: the agent reasoning through which package to use, not just blindly running a default.

---

## Agent-to-Agent Workflows (Future)

Starting simple with three independent agents. But the natural next step is agent-to-agent handoffs where one agent's output triggers another.

### Current: Manual Sequential

```
User → "Analyse Amanda's compliance" → Gap Analyzer runs
User → "Initiate screening for Amanda" → Background Screening runs
User → "Check screening status" → Status Monitor runs
```

Each agent runs independently. The user drives the flow.

### Future: Task-Based Handoff

```
User → "Get Amanda ready for Florida placement"
  → Gap Analyzer runs
  → Creates task: "Initiate FA screening — Package #1, Amanda Davis"
    → Task assigned to Background Screening Agent
    → Background Screening runs automatically
    → Creates task: "Monitor screening #12345"
      → Task assigned to Status Monitor Agent
      → Status Monitor polls until complete
      → Creates task: "Review completed screening — 1 item needs attention"
        → Task assigned to human compliance manager
```

### How It'd Work

The handoff mechanism is simple: agents create tasks using the existing `createTask` tool, tagged with the target agent ID. An orchestrator picks up tasks assigned to agents and runs them.

```typescript
// Agent creates a task for another agent
createTask({
  title: "Initiate FA screening",
  description: "Package #1, candidate Amanda Davis, Florida placement",
  assignedTo: "background-screening",  // agent ID
  context: { candidateId: "...", packageId: "...", targetState: "florida" },
});
```

This keeps agents loosely coupled. Each agent still works independently. The task system is the glue.

**Not building this for Thursday.** But worth mentioning in the demo as the roadmap: "Today we're showing you each agent individually. The next step is having them work together automatically, where one agent hands off to the next through our task system."

---

## What We're NOT Building

- Webhook infrastructure (polling is sufficient for demo)
- Real email sending
- Production error handling / retry logic
- FA credential management UI
- Multi-tenant FA credential storage
- Adverse action workflow

---

## File Summary

### New Files

```
lib/api/first-advantage/
├── types.ts                    # FAClient interface + types
├── client.ts                   # Factory — returns Live or Mock
├── live-client.ts              # Sterling REST API client
├── mock-client.ts              # Realistic mock client
├── package-map.ts              # Element ↔ FA package mapping
└── package-selector.ts         # Two-package selection logic

lib/compliance/
└── resolve-requirements.ts     # Placement requirement resolution engine

lib/ai/tools/
├── fa-get-packages.ts          # GET /packages
├── fa-create-candidate.ts      # POST /candidates
├── fa-initiate-screening.ts    # POST /screenings
├── fa-check-screening.ts       # GET /screenings/{id}
├── fa-get-report.ts            # POST /screenings/{id}/report-links
├── fa-select-package.ts        # Deterministic package selection (wraps package-selector)
├── resolve-placement-requirements.ts  # Resolve requirements by role/state/facility
└── get-placement-compliance.ts # Check candidate against placement requirements

lib/ai/agents/definitions/
├── compliance-gap-analyzer.ts  # Agent 1
├── background-screening.ts     # Agent 2
└── screening-status-monitor.ts # Agent 3

components/tool-handlers/handlers/
├── fa-screening-tool.tsx       # Screening status renderer
├── placement-compliance-tool.tsx  # Placement compliance grouped view
└── fa-packages-tool.tsx        # Packages list renderer
```

### Modified Files

```
lib/ai/agents/registry.ts          # Register 3 new agents
lib/ai/agents/tool-resolver.ts     # Register 8 new tools (6 FA + 2 placement)
components/tool-handlers/index.tsx  # Register 3 new renderers
lib/db/seed/markets/us.ts          # Add OIG/SAM elements, FL background check, new packages
lib/db/seed/candidates/us-candidates.ts  # Add 3 named candidates with placement scenarios
lib/db/seed/placements/            # New: seed placements, workNodes, evidence for demo
.env.local                          # Add FA env vars
```

---

## Success Criteria

### Demo Effectiveness

- [ ] Gap analysis clearly shows Credentially's requirements intelligence
- [ ] FA screening initiation works end-to-end in under 30 seconds
- [ ] Status monitoring shows per-component progress
- [ ] Business audience can see the value without understanding the API
- [ ] Technical audience can see the integration is real, not slides
- [ ] Reassignment scenario (Lexie) shows the worker passport value
- [ ] Lapse deal scenario (Peter) shows automatic Package #2 selection
- [ ] Agent explains its reasoning at each step so the audience follows

### Requirements Intelligence

- [ ] Gap analysis groups requirements by source (federal, state, role, facility)
- [ ] Each requirement shows WHERE it comes from, not just that it exists
- [ ] Carry-forward items are clearly labelled with previous placement
- [ ] Placement-scoped items (facility) are visually distinct from candidate-scoped
- [ ] Three seed scenarios work end-to-end (Ashlyn, Lexie, Peter)

### Technical Credibility

- [ ] Mock API responses mirror real Sterling API shapes
- [ ] Swap to live creds requires only env var change
- [ ] Agent reasoning is visible and makes sense
- [ ] Tool renderers show rich, professional UI
- [ ] No hardcoded demo data in agents. They genuinely query and reason
- [ ] Two-package selection logic works correctly based on deal context
- [ ] Requirement resolution engine traces packages back to source rules

### Strategic Positioning

- [ ] Demo reinforces "Credentially = intelligence layer, FA = screening API"
- [ ] Medsol sees their actual scenarios reflected in the demo
- [ ] Partnership value is obvious: neither system works as well alone
- [ ] Future vision (agent-to-agent handoff) is mentioned but not over-promised
