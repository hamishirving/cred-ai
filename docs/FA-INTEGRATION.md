# First Advantage Integration

How we connect to First Advantage (Sterling) for background screening, and how screening results map back to compliance requirements.

## How It Works

Three AI agents handle the full screening lifecycle. Each one does a specific job:

| Agent | What it does | When to use it |
|-------|-------------|----------------|
| **Compliance Gap Analyzer** | Looks at a placement and works out what's needed. Groups requirements by source (federal, state, role, facility) and identifies which items FA handles vs what the candidate provides | Before initiating screening. Shows the full picture |
| **Background Screening** | Creates the candidate in FA, picks the right package, submits the screening order | When you're ready to kick off the actual background check |
| **Screening Status Monitor** | Checks progress on a submitted screening. Shows per-component status and maps results back to compliance elements | After submission. Run anytime to check progress |

The flow is simple: **analyse what's needed → submit the order → monitor until complete**.

## The Three Agents

### 1. Compliance Gap Analyzer

Takes a candidate + placement context and produces a structured breakdown:

- What compliance elements are required (and why)
- What the candidate already has (from prior placements or carry-forward)
- What FA needs to screen for
- What the candidate needs to provide themselves
- Which FA package to use

**Input:** candidate name, target state, facility, role, deal type

**Key output:** requirement groups by source, FA package recommendation, worker passport carry-forward count, blockers and immediate actions.

### 2. Background Screening

The one that actually talks to Sterling's API. It follows these steps:

1. Search for and load the candidate profile
2. Check current compliance status (what's already done)
3. Call `faSelectPackage` to pick the right screening tier
4. Call `faCreateCandidate` to register them in FA
5. Call `faInitiateScreening` to submit the order
6. Save the screening ID to agent memory for later retrieval

**Input:** candidate name, target state, facility name, deal type

After this runs, you get a screening ID and the order is live in Sterling.

### 3. Screening Status Monitor

Checks on a submitted screening and produces the structured dashboard you see in the UI (the card with screening components, progress bar and compliance impact).

1. Gets the screening ID (from input or from agent memory)
2. Calls `faCheckScreening` for the current status breakdown
3. If complete, calls `faGetReport` for the report link
4. Maps each FA component back to a compliance element
5. Outputs structured data that renders as the status card

**Input:** screening ID (or candidate name to look it up from memory)

## Screening Packages

Three Medsol packages configured in QA (25 Feb 2026). Package selection is deterministic based on deal context.

### Tier 1: Standard (Package 539146)

The default. Includes:
- SSN Trace
- County Criminal Record
- Enhanced Nationwide Criminal Search (7 year)
- DOJ Sex Offender Search (NSOPW)
- FACIS L3

### Tier 2: Enhanced (Package 626709)

Everything in Tier 1 plus:
- State Criminal Repository
- OIG Excluded Parties (HHS)
- GSA Excluded Parties (SAM)

**Tier 2 triggers:**
- Facility requires OIG/SAM checks
- State is California, New York, Illinois or Pennsylvania (requires statewide criminal search)

### Tier 3: Full (Package 626711)

Everything in Tier 2 plus:
- National Wants & Warrants
- OIG variant

**Tier 3 triggers:**
- Deal type is `lapse` (candidate was inactive, needs full re-screening)
- Deal type is `government`
- Candidate's last assignment ended more than 30 days ago

The package selector (`lib/api/first-advantage/package-selector.ts`) makes this decision deterministically based on deal context. The agent explains the reasoning in its output.

## Screening Statuses

### Overall screening status

| Status | Meaning |
|--------|---------|
| Pending | Submitted but not started processing |
| In Progress | At least one component is being processed |
| Complete | All components finished |

### Overall screening result

| Result | Meaning |
|--------|---------|
| Pending | Still processing, no result yet |
| Clear | All components passed |
| Consider | One or more components need human review |
| Adverse | Disqualifying finding |

### Per-component status

Each screening has multiple components (SSN Trace, County Criminal, etc). Each has its own status:

| Status | Meaning |
|--------|---------|
| pending | Waiting to start |
| in_progress | Currently processing |
| complete | Finished |

### Per-component result

| Result | Meaning | UI label |
|--------|---------|----------|
| clear | Passed, no issues | "Clear" |
| consider | Needs review | "Review" |
| adverse | Flagged, disqualifying | "Flagged" |
| null | Still pending | (no badge shown) |

Special case: `unperformable` means the check couldn't be run (e.g. SSN Trace in certain conditions). This shows in the UI but doesn't block the screening.

## Compliance Element Mapping

This is the core of the integration. FA screening components map to our compliance element slugs so screening results can update compliance status.

### Component to element mapping

| FA Component | Compliance Element Slug |
|-------------|------------------------|
| Enhanced Nationwide Criminal Search (7 year) | `federal-background-check` |
| SSN Trace | `ssn-verification` |
| County Criminal Record | `county-background-check` |
| State Criminal Repository | `state-background-check` |
| Drivers Record | `drivers-record` |
| OIG-Excluded Parties | `oig-exclusion-check` |
| GSA-Excluded Parties | `sam-exclusion-check` |
| FACIS L3 | `facis-check` |
| DOJ Sex Offender Search | `sex-offender-check` |
| National Wants Warrants | `national-wants-warrants` |

### State-specific mapping

Some states bundle multiple FA components into a single compliance element. Florida is the main example:

The `florida-level2-background` compliance element requires all of:
- County Criminal Record
- State Criminal Repository
- DOJ Sex Offender Search
- FACIS L3

A compliance element can only be marked verified when **all** its mapped screening components are `complete` with result `clear`.

### Verification rule

An FA component can mark a compliance element as verified when:
```
status === "complete" AND result === "clear"
```

Both conditions must be true. A `complete` result of `consider` or `adverse` does not verify the element.

### FA-handled elements

These compliance elements are handled by FA screening (defined in seed data):

- `federal-background-check`
- `state-background-check`
- `california-background-check`
- `texas-background-check`
- `florida-level2-background`
- `drug-screen`
- `oig-exclusion-check`
- `sam-exclusion-check`

Everything else (licenses, certifications, health records, credentialing) is provided by the candidate or handled by the facility.

## The Status Card UI

The screenshot below shows the Screening Status Monitor's structured output:

**Header section:**
- Candidate name and screening package
- Overall status badge (Pending/In Progress/Complete)
- Progress bar showing completed components out of total
- Time since submission and estimated completion

**Screening Components section (collapsible):**
- Each FA component with its status icon (green tick = complete, empty circle = pending, spinner = in progress)
- Result badge when complete (Clear/Review/Flagged)
- Jurisdiction info where applicable (e.g. "FL - DUVAL" for county level)

**Compliance Impact section (collapsible):**
- Maps each FA component to its compliance element slug
- Shows whether that element can now be verified (green tick vs clock icon)
- This is what closes the loop: screening result → compliance element → requirement satisfied

**Footer:**
- Link to Sterling Portal (admin interface)
- Download Report link (when screening is complete)

## Key Files

```
Agents:
  lib/ai/agents/definitions/compliance-gap-analyzer.ts
  lib/ai/agents/definitions/background-screening.ts
  lib/ai/agents/definitions/screening-status-monitor.ts

Tools:
  lib/ai/tools/fa-get-packages.ts
  lib/ai/tools/fa-select-package.ts
  lib/ai/tools/fa-create-candidate.ts
  lib/ai/tools/fa-initiate-screening.ts
  lib/ai/tools/fa-check-screening.ts
  lib/ai/tools/fa-get-report.ts

FA Client:
  lib/api/first-advantage/client.ts         (factory, switches mock/live)
  lib/api/first-advantage/live-client.ts    (real Sterling API v2)
  lib/api/first-advantage/mock-client.ts    (sandbox/demo)
  lib/api/first-advantage/types.ts          (all FA types)
  lib/api/first-advantage/package-map.ts    (element <-> component mapping)
  lib/api/first-advantage/package-selector.ts (tier selection logic)

UI:
  components/tool-handlers/handlers/fa-screening-tool.tsx     (inline tool result)
  components/agents/step-cards/screening-status-display.tsx   (structured output card)
```

## Demo Data

Three seeded candidates in TravelNurse Pro cover different scenarios:

| Candidate | Deal Type | FA Package | Story |
|-----------|-----------|------------|-------|
| Ashlyn Torres | Standard | Tier 1 | New travel ICU nurse, first Florida placement. Full gap analysis |
| Lexie Chen | Reassignment | Tier 1 | Moving between facilities. Worker passport carries items forward |
| Peter Walsh | Lapse | Tier 2 | Inactive for 35+ days. Triggers full re-screening with OIG/SAM |

See `docs/FA-DEMO-TEST-DATA.md` for full candidate details and compliance states.
