# FA Integration Demo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a working First Advantage integration demo with three agents that show Credentially as the intelligence layer for US healthcare background screening.

**Architecture:** Three manually invoked agents (Gap Analyzer, Background Screening, Status Monitor) backed by a placement requirements engine and FA API client. Agents use shared FA tools and existing Cred tools. Seed data provides three named demo scenarios (Ashlyn, Lexie, Peter).

**Tech Stack:** Next.js 16, AI SDK 6 (`tool()` from 'ai'), Drizzle ORM, Supabase Postgres, Sterling/FA REST API, Zod schemas.

**Design doc:** `docs/plans/2026-02-19-fa-integration-demo-design.md` — read this first for full context.

**No test framework** — this project has no Jest/Vitest. Manual verification via `pnpm dev` + chat UI, plus a scripted smoke check (`pnpm fa:smoke`) for repeatable demo rehearsal.

---

## Decision Gate: OIG/SAM Placement

**Decision:** OIG/SAM exclusion checks are **tier-2 only**, NOT in federal core.

- **Package #1 (Standard):** SSN Trace, County Criminal, Federal Criminal, Nationwide 7yr, NSOPW, FACIS L3. No OIG/SAM.
- **Package #2 (Standard + OIG/SAM):** Everything in #1 + Statewide Criminal, OIG, SAM.

Package #2 triggers: lapse deals, facility requires OIG/SAM, state requires statewide criminal, government-adjacent placements.

**Implications for the requirements engine:**
- Federal core package does NOT include OIG/SAM
- The resolve-requirements engine adds a conditional "Exclusion Checks" group when the deal context requires it (based on `dealType`, `targetState`, `facilityRequiresOigSam`)
- The `faSelectPackage` tool is deterministic — agents MUST call it and cite its output, not reason about packages from prompt alone

**Demo impact:**
- Ashlyn (standard new placement): Package #1, no OIG/SAM → 3 FA checks (federal criminal, FL Level 2, drug screen)
- Peter (lapse deal): Package #2 with OIG/SAM → 5+ FA checks including exclusion lists
- Lexie (reassignment TX→CA): Package #2 because California requires statewide criminal

**Package ID mapping (demo approximation):**
- Package #1 → `539147` ("Sample Standard + FACIS") — matches well
- Package #2 → `539150` ("Standard + D&HS") — closest available, real OIG/SAM package pending FA configuration by Rebecca. Label as "Standard + OIG/SAM" in demo output with a note that production would use a properly configured package.

---

## Chunk 1: Seed Data + Requirements Engine

The foundation. Everything else depends on this data existing. Build the compliance elements, packages, role-to-package mapping, demo candidates, placements, and the requirement resolution logic.

### Task 1.1: Add new compliance elements to US market

**Files:**
- Modify: `lib/db/seed/markets/us.ts`

**Steps:**

1. Add three new elements to `usComplianceElements` array, after the Florida RN License entry (line ~164):

```typescript
// OIG/SAM Exclusion Checks (First Advantage handles these)
{
  name: "OIG Exclusion Check",
  slug: "oig-exclusion-check",
  description: "Office of Inspector General excluded individuals check",
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
  slug: "florida-level2-background",
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

2. Update `usPackageContents` — add OIG/SAM to federal core and FL background to Florida package:

```typescript
"federal-core-package": [
  "i9-verification",
  "federal-background-check",
  "bls-certification",
  "tb-test",
  "hep-b-vaccination",
  "flu-vaccination",
],
// ...
"florida-package": [
  "florida-rn-license",
  "florida-level2-background",
],
"exclusion-checks-package": [
  "oig-exclusion-check",
  "sam-exclusion-check",
],
```

> **Note:** The exclusion-checks-package is NOT part of federal core. It's conditionally included by the requirements engine when the deal context triggers tier-2 (lapse deals, certain states, facility requirements).

3. Add a new export — role-to-package mapping. This tells the requirements engine which packages each role needs:

```typescript
/**
 * Which packages each role requires.
 * The requirements engine uses this to resolve what a placement needs.
 */
export const usRolePackages: Record<string, string[]> = {
  "travel-rn": ["federal-core-package", "rn-package"],
  "travel-icu-rn": ["federal-core-package", "rn-package", "icu-package"],
  "travel-er-rn": ["federal-core-package", "rn-package"],
  "staff-rn": ["federal-core-package", "rn-package"],
  "charge-nurse": ["federal-core-package", "rn-package"],
  "clinical-nurse-specialist": ["federal-core-package", "rn-package"],
};

/**
 * State-to-package mapping.
 * Adds state-specific packages when placing in that jurisdiction.
 */
export const usStatePackages: Record<string, string> = {
  california: "california-package",
  texas: "texas-package",
  florida: "florida-package",
};

/**
 * Facility-type-to-package mapping.
 * Adds facility-specific (placement-scoped) packages.
 */
export const usFacilityPackages: Record<string, string> = {
  hospital: "hospital-package",
};

/**
 * Elements that First Advantage handles (background checks, drug screens, exclusion lists).
 */
export const faHandledElements = new Set([
  "federal-background-check",
  "state-background-check",
  "california-background-check",
  "texas-background-check",
  "florida-level2-background",
  "drug-screen",
  "oig-exclusion-check",
  "sam-exclusion-check",
]);
```

### Task 1.2: Add demo candidates (Ashlyn, Lexie, Peter)

**Files:**
- Modify: `lib/db/seed/candidates/us-candidates.ts`

**Steps:**

1. Add three new candidates to the `travelNurseCandidates` array. These are specifically designed for the three demo scenarios:

```typescript
// === FA DEMO CANDIDATES ===
// These three candidates map to the Medsol demo scenarios.

// Scenario 1: New clinician — first FL placement, partial compliance
{
  profile: {
    email: "ashlyn.torres@email.com",
    firstName: "Ashlyn",
    lastName: "Torres",
    phone: generateUSPhone(),
    dateOfBirth: new Date("1995-06-12"),
    status: "active",
    nationalId: generateSSN(),
    professionalRegistration: generateUSNursingLicense("COMPACT"),
    address: {
      line1: "422 Magnolia Avenue",
      city: "Nashville",
      postcode: "37203",
      country: "USA",
    },
  },
  roleSlug: "travel-icu-rn",
  state: {
    status: "in_progress",
    missingElements: [
      "federal-background-check",
      "florida-level2-background",
      "florida-rn-license",
      "drug-screen",
      "hospital-credentialing",
      "hospital-orientation",
      "unit-competency",
    ],
    daysSinceActivity: 1,
    notes: "New travel ICU RN. First Florida placement. Has compact license, BLS, ACLS, PALS, health records from Tennessee assignment. Needs background screening and FL-specific items. Standard deal — Package #1, no OIG/SAM.",
  },
},

// Scenario 2: Reassignment — moving from TX to CA, most items carry forward
{
  profile: {
    email: "lexie.chen@email.com",
    firstName: "Lexie",
    lastName: "Chen",
    phone: generateUSPhone(),
    dateOfBirth: new Date("1990-03-28"),
    status: "active",
    nationalId: generateSSN(),
    professionalRegistration: generateUSNursingLicense("COMPACT"),
    address: {
      line1: "1800 Main Street",
      city: "Dallas",
      postcode: "75201",
      country: "USA",
    },
  },
  roleSlug: "travel-rn",
  state: {
    status: "near_complete",
    missingElements: [
      "california-rn-license",
      "california-background-check",
      "hospital-credentialing",
      "hospital-orientation",
      "unit-competency",
    ],
    startDateDays: 21,
    daysSinceActivity: 2,
    notes: "Reassignment from Texas to California. Compact license holder. Federal background, drug screen, BLS, ACLS, health records all carry forward from TX assignment. Only needs CA-specific items and facility onboarding.",
  },
},

// Scenario 3: Lapse deal — inactive 6 months, many items expired
{
  profile: {
    email: "peter.walsh@email.com",
    firstName: "Peter",
    lastName: "Walsh",
    phone: generateUSPhone(),
    dateOfBirth: new Date("1983-11-15"),
    status: "active",
    nationalId: generateSSN(),
    professionalRegistration: generateUSNursingLicense("FL"),
    address: {
      line1: "890 Beach Boulevard",
      city: "Jacksonville",
      postcode: "32250",
      country: "USA",
    },
  },
  roleSlug: "travel-rn",
  state: {
    status: "non_compliant",
    missingElements: [
      "federal-background-check",
      "florida-level2-background",
      "drug-screen",
      "oig-exclusion-check",
      "sam-exclusion-check",
      "hospital-credentialing",
      "hospital-orientation",
      "unit-competency",
    ],
    expiringElements: ["bls-certification", "tb-test"],
    daysSinceActivity: 0,
    notes: "Lapse deal. Inactive for 6 months. Background check expired, drug screen expired, BLS expiring. Needs full re-screening with OIG/SAM package (Package #2 — tier-2 trigger: lapse deal). Has FL license (still current).",
  },
},
```

### Task 1.3: Add Memorial Hospital FL workNode

**Files:**
- Modify: `lib/db/seed/index.ts`

**Steps:**

1. In the TravelNurse Pro `orgConfigs` entry (line ~142), add Memorial Hospital to the Florida workNodes:

```typescript
workNodes: [
  // ... existing California and Texas nodes ...
  { name: "Florida", type: "State", jurisdiction: "florida" },
  { name: "Memorial Hospital Jacksonville", type: "Hospital", parent: "Florida", jurisdiction: "florida" },
  { name: "Tampa General", type: "Hospital", parent: "Florida", jurisdiction: "florida" },
  { name: "Baptist Health Miami", type: "Hospital", parent: "Florida", jurisdiction: "florida" },
],
```

Replace the existing Florida workNodes block. `Memorial Hospital Jacksonville` is the new addition.

### Task 1.4: Run seed and verify

**Steps:**

1. Run: `pnpm db:seed`
2. Verify: Open Drizzle Studio (`pnpm db:studio`) and check:
   - TravelNurse Pro org has the 3 new candidates (Ashlyn Torres, Lexie Chen, Peter Walsh)
   - OIG/SAM elements exist in compliance_elements table
   - Florida Level 2 Background Check element exists
   - Federal core package now includes oig-exclusion-check and sam-exclusion-check
   - Memorial Hospital Jacksonville workNode exists under Florida

### Task 1.5: Commit

```bash
cd /Users/hamishirving/Documents/product-dev/cred-ai
git add .
git commit -m "Add FA demo seed data: 3 candidates, OIG/SAM elements, role-package mapping"
```

---

### Task 1.6: Create placement requirements engine

**Files:**
- Create: `lib/compliance/resolve-requirements.ts`

**Steps:**

1. Create `lib/compliance/` directory.

2. Create `resolve-requirements.ts`. This is the core logic that walks the package hierarchy to build the full requirement set for a placement:

```typescript
/**
 * Placement Requirements Engine
 *
 * Resolves all compliance requirements for a placement by walking the package
 * hierarchy: federal core → state → role → facility.
 *
 * This is what makes the Gap Analyzer intelligent — it knows WHERE each
 * requirement comes from, not just that it exists.
 */

import { db } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  complianceElements,
  compliancePackages,
  packageElements,
  evidence,
  placements,
  roles,
  workNodes,
} from "@/lib/db/schema";
import {
  usRolePackages,
  usStatePackages,
  usFacilityPackages,
  faHandledElements,
} from "@/lib/db/seed/markets/us";

export interface PlacementContext {
  roleName?: string;
  roleSlug?: string;
  targetState: string;
  facilityType?: string;
  facilityName?: string;
  dealType?: "standard" | "lapse" | "quickstart" | "reassignment";
}

export interface ResolvedElement {
  elementId: string;
  elementName: string;
  elementSlug: string;
  scope: string;
  isFA: boolean;
  category: string;
  expiryDays: number | null;
}

export interface RequirementGroup {
  source: "federal" | "state" | "role" | "facility";
  label: string;
  packageSlug: string;
  packageName: string;
  elements: ResolvedElement[];
}

export interface PlacementComplianceItem {
  elementId: string;
  elementName: string;
  elementSlug: string;
  source: "federal" | "state" | "role" | "facility";
  status: "fulfilled" | "missing" | "expired" | "expiring_soon" | "pending_review";
  carriesForward: boolean;
  previousContext?: string;
  evidenceId?: string;
  expiresAt?: string | null;
  handledBy: "first_advantage" | "credentially" | "candidate";
  actionRequired?: string;
}

/**
 * Resolve all compliance requirements for a placement context.
 * Returns elements grouped by source (federal, state, role, facility).
 */
export async function resolvePlacementRequirements(
  organisationId: string,
  context: PlacementContext,
): Promise<{ groups: RequirementGroup[]; totalElements: number }> {
  const groups: RequirementGroup[] = [];

  // Determine which package slugs to resolve
  const packageSlugs: { slug: string; source: RequirementGroup["source"]; label: string }[] = [];

  // 1. Federal core — always applied
  packageSlugs.push({
    slug: "federal-core-package",
    source: "federal",
    label: "Federal Core",
  });

  // 2. Role packages
  const roleSlug = context.roleSlug || slugifyRole(context.roleName || "travel-rn");
  const rolePkgs = usRolePackages[roleSlug] || usRolePackages["travel-rn"];
  for (const pkgSlug of rolePkgs) {
    if (pkgSlug === "federal-core-package") continue; // Already added
    packageSlugs.push({
      slug: pkgSlug,
      source: "role",
      label: `Role: ${context.roleName || roleSlug}`,
    });
  }

  // 3. State package
  const statePkg = usStatePackages[context.targetState.toLowerCase()];
  if (statePkg) {
    packageSlugs.push({
      slug: statePkg,
      source: "state",
      label: `State: ${capitalize(context.targetState)}`,
    });
  }

  // 4. Facility package
  const facilityType = (context.facilityType || "hospital").toLowerCase();
  const facilityPkg = usFacilityPackages[facilityType];
  if (facilityPkg) {
    packageSlugs.push({
      slug: facilityPkg,
      source: "facility",
      label: `Facility: ${context.facilityName || capitalize(facilityType)}`,
    });
  }

  // 5. Conditional: OIG/SAM exclusion checks (tier-2 only)
  // Added when deal context requires Package #2
  const needsExclusionChecks = requiresOigSam(context);
  if (needsExclusionChecks.required) {
    packageSlugs.push({
      slug: "exclusion-checks-package",
      source: "federal" as RequirementGroup["source"],
      label: `Exclusion Checks (${needsExclusionChecks.reason})`,
    });
  }

  // Resolve each package slug to its elements
  for (const pkgDef of packageSlugs) {
    const [pkg] = await db
      .select()
      .from(compliancePackages)
      .where(
        and(
          eq(compliancePackages.organisationId, organisationId),
          eq(compliancePackages.slug, pkgDef.slug),
        ),
      )
      .limit(1);

    if (!pkg) continue;

    // Get elements in this package
    const pkgElements = await db
      .select({
        elementId: complianceElements.id,
        elementName: complianceElements.name,
        elementSlug: complianceElements.slug,
        scope: complianceElements.scope,
        category: complianceElements.category,
        expiryDays: complianceElements.expiryDays,
      })
      .from(packageElements)
      .innerJoin(
        complianceElements,
        eq(packageElements.elementId, complianceElements.id),
      )
      .where(eq(packageElements.packageId, pkg.id))
      .orderBy(packageElements.displayOrder);

    if (pkgElements.length === 0) continue;

    groups.push({
      source: pkgDef.source,
      label: pkgDef.label,
      packageSlug: pkgDef.slug,
      packageName: pkg.name,
      elements: pkgElements.map((el) => ({
        elementId: el.elementId,
        elementName: el.elementName,
        elementSlug: el.elementSlug,
        scope: el.scope,
        isFA: faHandledElements.has(el.elementSlug),
        category: el.category,
        expiryDays: el.expiryDays,
      })),
    });
  }

  const totalElements = groups.reduce((sum, g) => sum + g.elements.length, 0);
  return { groups, totalElements };
}

/**
 * Check a candidate's compliance against resolved placement requirements.
 * Returns per-item status with carry-forward tagging.
 */
export async function checkPlacementCompliance(
  organisationId: string,
  profileId: string,
  context: PlacementContext,
): Promise<{
  items: PlacementComplianceItem[];
  summary: {
    total: number;
    fulfilled: number;
    carryForward: number;
    missing: number;
    expired: number;
    expiringSoon: number;
    percentage: number;
  };
}> {
  // 1. Resolve requirements
  const { groups } = await resolvePlacementRequirements(organisationId, context);

  // 2. Get all evidence for this profile
  const profileEvidence = await db
    .select()
    .from(evidence)
    .where(
      and(
        eq(evidence.organisationId, organisationId),
        eq(evidence.profileId, profileId),
      ),
    );

  // Index evidence by element ID — keep the best record per element.
  // Priority: approved (latest expiry) > requires_review > pending > rejected/expired.
  const evidenceByElement = new Map<string, typeof profileEvidence[number]>();
  const statusPriority: Record<string, number> = {
    approved: 4,
    requires_review: 3,
    pending: 2,
    expired: 1,
    rejected: 0,
  };
  for (const ev of profileEvidence) {
    if (!ev.complianceElementId) continue;
    const existing = evidenceByElement.get(ev.complianceElementId);
    if (!existing) {
      evidenceByElement.set(ev.complianceElementId, ev);
      continue;
    }
    const evPri = statusPriority[ev.status] ?? 0;
    const existPri = statusPriority[existing.status] ?? 0;
    if (evPri > existPri || (evPri === existPri && ev.expiresAt && existing.expiresAt && new Date(ev.expiresAt) > new Date(existing.expiresAt))) {
      evidenceByElement.set(ev.complianceElementId, ev);
    }
  }

  // 3. Check each requirement against evidence
  const items: PlacementComplianceItem[] = [];
  let fulfilled = 0;
  let carryForward = 0;
  let missing = 0;
  let expired = 0;
  let expiringSoon = 0;

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const group of groups) {
    for (const element of group.elements) {
      const ev = evidenceByElement.get(element.elementId);
      let status: PlacementComplianceItem["status"] = "missing";
      let carriesForward = false;
      let actionRequired: string | undefined;

      if (ev) {
        if (ev.status === "approved") {
          // Check expiry
          if (ev.expiresAt && new Date(ev.expiresAt) < now) {
            status = "expired";
            expired++;
            actionRequired = "Evidence expired — needs renewal or re-screening";
          } else if (ev.expiresAt && new Date(ev.expiresAt) < thirtyDaysFromNow) {
            status = "expiring_soon";
            expiringSoon++;
            fulfilled++; // Still counts as fulfilled for now
            const daysLeft = Math.ceil(
              (new Date(ev.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            actionRequired = `Expires in ${daysLeft} days`;
          } else {
            status = "fulfilled";
            fulfilled++;
          }

          // Candidate-scoped evidence carries forward (not placement-scoped)
          if (element.scope === "candidate") {
            carriesForward = true;
            carryForward++;
          }
        } else if (ev.status === "requires_review") {
          status = "pending_review";
          actionRequired = "Uploaded — awaiting review";
        } else if (ev.status === "expired") {
          status = "expired";
          expired++;
          actionRequired = "Evidence expired — needs renewal";
        } else {
          status = "missing";
          missing++;
        }
      } else {
        status = "missing";
        missing++;

        // Determine who handles this
        if (element.isFA) {
          actionRequired = "Needs FA background screening";
        } else if (element.scope === "placement") {
          actionRequired = "Placement-scoped — must complete at facility";
        } else {
          actionRequired = "Candidate must provide or Credentially verifies";
        }
      }

      // Determine handler
      let handledBy: PlacementComplianceItem["handledBy"] = "credentially";
      if (element.isFA) {
        handledBy = "first_advantage";
      } else if (element.scope === "placement" || element.category === "orientation") {
        handledBy = "candidate";
      }

      items.push({
        elementId: element.elementId,
        elementName: element.elementName,
        elementSlug: element.elementSlug,
        source: group.source,
        status,
        carriesForward,
        evidenceId: ev?.id,
        expiresAt: ev?.expiresAt?.toISOString() ?? null,
        handledBy,
        actionRequired,
      });
    }
  }

  const total = items.length;
  return {
    items,
    summary: {
      total,
      fulfilled,
      carryForward,
      missing,
      expired,
      expiringSoon: expiringSoon,
      percentage: total > 0 ? Math.round((fulfilled / total) * 100) : 0,
    },
  };
}

// Helpers

const STATES_REQUIRING_STATEWIDE = new Set([
  "florida", "california", "new_york", "illinois", "pennsylvania",
]);

/**
 * Determine if the placement context requires OIG/SAM exclusion checks (tier-2).
 * Returns { required: boolean, reason: string }.
 */
function requiresOigSam(context: PlacementContext): { required: boolean; reason: string } {
  if (context.dealType === "lapse") {
    return { required: true, reason: "Lapse deal" };
  }
  if (STATES_REQUIRING_STATEWIDE.has(context.targetState.toLowerCase())) {
    return { required: true, reason: `${capitalize(context.targetState)} requires statewide criminal` };
  }
  // Could also check context.facilityRequiresOigSam if added to PlacementContext
  return { required: false, reason: "" };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function slugifyRole(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
```

### Task 1.7: Create resolvePlacementRequirements tool

**Files:**
- Create: `lib/ai/tools/resolve-placement-requirements.ts`

```typescript
/**
 * Resolve Placement Requirements Tool
 *
 * Takes a role, state, and facility and returns every required compliance
 * element, grouped by WHERE the requirement comes from.
 */

import { tool } from "ai";
import { z } from "zod";
import { resolvePlacementRequirements } from "@/lib/compliance/resolve-requirements";

export const resolvePlacementRequirementsTool = tool({
  description: `Resolve all compliance requirements for a placement.
Takes a role, state, and facility type and returns every required element, grouped by source:
- Federal Core: items every US healthcare worker needs
- State-specific: items required by the target state
- Role-specific: items required by the job role
- Facility-specific: items required by the facility type (placement-scoped)

Use this BEFORE checking compliance status. It tells you WHAT is needed.
Then use getPlacementCompliance to check what the candidate already has.`,

  inputSchema: z.object({
    organisationId: z.string().uuid().describe("Organisation ID"),
    roleName: z.string().optional().describe("Job role, e.g. Travel ICU RN"),
    roleSlug: z.string().optional().describe("Role slug, e.g. travel-icu-rn"),
    targetState: z.string().describe("US state, e.g. florida"),
    facilityType: z.string().default("hospital").describe("Facility type"),
    facilityName: z.string().optional().describe("Facility name for display"),
  }),

  execute: async (input) => {
    try {
      const result = await resolvePlacementRequirements(input.organisationId, {
        roleName: input.roleName,
        roleSlug: input.roleSlug,
        targetState: input.targetState,
        facilityType: input.facilityType,
        facilityName: input.facilityName,
      });
      return { data: result };
    } catch (error) {
      return { error: `Failed to resolve requirements: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
});
```

### Task 1.8: Create getPlacementCompliance tool

**Files:**
- Create: `lib/ai/tools/get-placement-compliance.ts`

```typescript
/**
 * Get Placement Compliance Tool
 *
 * Checks a candidate's compliance status against resolved placement requirements.
 * Shows what's fulfilled, what carries forward (worker passport), and what's missing.
 */

import { tool } from "ai";
import { z } from "zod";
import { checkPlacementCompliance } from "@/lib/compliance/resolve-requirements";

export const getPlacementComplianceTool = tool({
  description: `Check a candidate's compliance status against placement requirements.
Shows which items are fulfilled, which carry forward from previous assignments (worker passport),
which have expired, and who needs to act on each gap (FA, Credentially, or candidate).

Call resolvePlacementRequirements first to understand what's needed,
then call this to check the candidate's status against those requirements.`,

  inputSchema: z.object({
    organisationId: z.string().uuid().describe("Organisation ID"),
    profileId: z.string().uuid().describe("Candidate profile ID"),
    targetState: z.string().describe("Target state for the placement"),
    roleName: z.string().optional().describe("Role name"),
    roleSlug: z.string().optional().describe("Role slug"),
    facilityType: z.string().default("hospital").describe("Facility type"),
    facilityName: z.string().optional().describe("Facility name"),
    dealType: z.enum(["standard", "lapse", "quickstart", "reassignment"]).default("standard"),
  }),

  execute: async (input) => {
    try {
      const result = await checkPlacementCompliance(
        input.organisationId,
        input.profileId,
        {
          roleName: input.roleName,
          roleSlug: input.roleSlug,
          targetState: input.targetState,
          facilityType: input.facilityType,
          facilityName: input.facilityName,
          dealType: input.dealType,
        },
      );
      return { data: result };
    } catch (error) {
      return { error: `Failed to check compliance: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
});
```

### Task 1.9: Register new tools in tool-resolver

**Files:**
- Modify: `lib/ai/agents/tool-resolver.ts`

**Steps:**

1. Add imports at the top (after existing tool imports):

```typescript
import { resolvePlacementRequirementsTool } from "@/lib/ai/tools/resolve-placement-requirements";
import { getPlacementComplianceTool } from "@/lib/ai/tools/get-placement-compliance";
```

2. Add to `toolRegistry` Record:

```typescript
resolvePlacementRequirements: resolvePlacementRequirementsTool as Tool,
getPlacementCompliance: getPlacementComplianceTool as Tool,
```

### Task 1.10: Verify requirements engine

**Steps:**

1. Run `pnpm db:seed` to refresh data.
2. Run `pnpm dev`.
3. In the playground chat, pick TravelNurse Pro org.
4. Ask the AI to use `resolvePlacementRequirements` with `targetState: "florida"`, `roleSlug: "travel-icu-rn"`, `facilityType: "hospital"`. Should return 4 groups (federal, role, state, facility) with elements.
5. Then ask it to use `getPlacementCompliance` for Ashlyn Torres with the same context. Should show ~60% compliance with carry-forward items and gaps.

### Task 1.11: Commit

```bash
cd /Users/hamishirving/Documents/product-dev/cred-ai
git add lib/db/seed/ lib/compliance/ lib/ai/tools/resolve-placement-requirements.ts lib/ai/tools/get-placement-compliance.ts lib/ai/agents/tool-resolver.ts
git commit -m "Add placement requirements engine and compliance tools"
```

---

## Chunk 2: FA API Client

Isolated, well-scoped. Build the Sterling/FA REST API wrapper with live and mock modes.

### Task 2.1: Create FA types

**Files:**
- Create: `lib/api/first-advantage/types.ts`

```typescript
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
 * FAClient interface — both LiveFAClient and MockFAClient implement this.
 */
export interface FAClient {
  authenticate(): Promise<FAAuthToken>;
  getPackages(): Promise<FAPackage[]>;
  createCandidate(data: FACreateCandidateInput): Promise<FACandidate>;
  initiateScreening(data: FAInitiateScreeningInput): Promise<FAScreening>;
  getScreening(screeningId: string): Promise<FAScreening>;
  getReportLink(screeningId: string): Promise<FAReportLink>;
}
```

### Task 2.2: Create live client

**Files:**
- Create: `lib/api/first-advantage/live-client.ts`

```typescript
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
```

### Task 2.3: Create mock client

**Files:**
- Create: `lib/api/first-advantage/mock-client.ts`

```typescript
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
  FAScreeningComponent,
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
        description: "Placeholder — SSN Trace only",
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
```

### Task 2.4: Create client factory

**Files:**
- Create: `lib/api/first-advantage/client.ts`

```typescript
/**
 * FA Client Factory
 *
 * Returns LiveFAClient or MockFAClient based on FA_API_MODE env var.
 * Default: "live" (we have working credentials).
 */

import type { FAClient } from "./types";
import { LiveFAClient } from "./live-client";
import { MockFAClient } from "./mock-client";

let client: FAClient | null = null;

export function getFAClient(): FAClient {
  if (client) return client;

  const mode = process.env.FA_API_MODE || "live";

  if (mode === "mock") {
    console.log("[FA] Using mock client");
    client = new MockFAClient();
  } else {
    console.log("[FA] Using live client");
    client = new LiveFAClient();
  }

  return client;
}

// Re-export types for convenience
export type { FAClient } from "./types";
```

### Task 2.5: Create package selector

**Files:**
- Create: `lib/api/first-advantage/package-selector.ts`

```typescript
/**
 * FA Package Selector
 *
 * Determines which FA screening package to use based on deal context.
 * Medsol uses two packages:
 * - Package #1 (Standard): SSN, County, Federal, Nationwide, NSOPW, FACIS
 * - Package #2 (Standard + OIG/SAM): #1 + Statewide Criminal, OIG, SAM
 */

// Demo approximation: real OIG/SAM package pending FA configuration by Rebecca.
// Package #1 maps well to 539147. Package #2 uses 539150 as the closest available
// package — production would use a properly configured "Standard + OIG/SAM" package.
const PACKAGE_1_ID = "539147"; // Sample Standard + FACIS — good match
const PACKAGE_2_ID = "539150"; // Standard + D&HS — demo stand-in for Standard + OIG/SAM

const STATES_REQUIRING_STATEWIDE_CRIMINAL = [
  "florida",
  "california",
  "new_york",
  "illinois",
  "pennsylvania",
];

export interface PackageSelectionInput {
  lastAssignmentEndDate?: string;
  targetState: string;
  facilityRequiresOigSam?: boolean;
  dealType?: "standard" | "lapse" | "quickstart" | "reassignment" | "government";
}

export interface PackageSelection {
  packageId: string;
  packageName: string;
  reason: string;
  tier: 1 | 2;
}

export function selectFAPackage(input: PackageSelectionInput): PackageSelection {
  // Package #2 triggers
  if (input.dealType === "lapse") {
    return {
      packageId: PACKAGE_2_ID,
      packageName: "Standard + OIG/SAM",
      reason: "Lapse deal — candidate was inactive, full re-screening with exclusion checks required",
      tier: 2,
    };
  }

  if (input.facilityRequiresOigSam) {
    return {
      packageId: PACKAGE_2_ID,
      packageName: "Standard + OIG/SAM",
      reason: "Facility requires OIG/SAM exclusion checks",
      tier: 2,
    };
  }

  if (STATES_REQUIRING_STATEWIDE_CRIMINAL.includes(input.targetState.toLowerCase())) {
    return {
      packageId: PACKAGE_2_ID,
      packageName: "Standard + OIG/SAM",
      reason: `${input.targetState} requires statewide criminal search`,
      tier: 2,
    };
  }

  if (input.dealType === "government") {
    return {
      packageId: PACKAGE_2_ID,
      packageName: "Standard + OIG/SAM",
      reason: "Government-adjacent placement requires exclusion list checks",
      tier: 2,
    };
  }

  // Check for lapse by date
  if (input.lastAssignmentEndDate) {
    const endDate = new Date(input.lastAssignmentEndDate);
    const daysSince = Math.floor((Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 30) {
      return {
        packageId: PACKAGE_2_ID,
        packageName: "Standard + OIG/SAM",
        reason: `Candidate inactive for ${daysSince} days — lapse re-screening with exclusion checks`,
        tier: 2,
      };
    }
  }

  // Default: Package #1
  return {
    packageId: PACKAGE_1_ID,
    packageName: "Standard",
    reason: "Standard new placement — full background package",
    tier: 1,
  };
}
```

### Task 2.5b: Create faSelectPackage tool

**Files:**
- Create: `lib/ai/tools/fa-select-package.ts`

This wraps `selectFAPackage()` as a deterministic AI tool. Agents MUST call this tool and cite its output, rather than reasoning about package selection from prompt alone.

```typescript
/**
 * FA Package Selector Tool
 *
 * Deterministic package selection. Returns which FA package to use
 * and explains why. Agents must call this and cite the result.
 */

import { tool } from "ai";
import { z } from "zod";
import { selectFAPackage } from "@/lib/api/first-advantage/package-selector";

export const faSelectPackage = tool({
  description: `Select the correct First Advantage screening package for a placement.
Returns the package ID, name, tier (1 or 2), and the reason for selection.

IMPORTANT: Always call this tool to determine the package. Do not reason about
package selection from your prompt alone — this tool encodes the business rules.

Package #1 (Standard): SSN, County, Federal, Nationwide, NSOPW, FACIS.
Package #2 (Standard + OIG/SAM): #1 + Statewide Criminal, OIG, SAM.

Triggers for Package #2: lapse deals, certain states, facility requirements, government placements.`,

  inputSchema: z.object({
    targetState: z.string().describe("US state for the placement"),
    dealType: z.enum(["standard", "lapse", "quickstart", "reassignment", "government"]).default("standard"),
    lastAssignmentEndDate: z.string().optional().describe("ISO date of when candidate's last assignment ended"),
    facilityRequiresOigSam: z.boolean().default(false).describe("Whether the facility requires OIG/SAM checks"),
  }),

  execute: async (input) => {
    try {
      const result = selectFAPackage({
        targetState: input.targetState,
        dealType: input.dealType,
        lastAssignmentEndDate: input.lastAssignmentEndDate,
        facilityRequiresOigSam: input.facilityRequiresOigSam,
      });
      return { data: result };
    } catch (error) {
      return { error: `Package selection failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
});
```

### Task 2.5c: Create package-map.ts

**Files:**
- Create: `lib/api/first-advantage/package-map.ts`

Maps between Credentially compliance element slugs and FA screening component types. Used by the Status Monitor to map FA results back to compliance elements.

```typescript
/**
 * FA Package Map
 *
 * Maps Credentially compliance element slugs ↔ FA screening component types.
 * Used to translate FA screening results back to compliance element updates.
 */

/** Maps our element slugs to the FA screening component type that fulfils them */
export const elementToFAComponent: Record<string, string> = {
  "federal-background-check": "criminal_federal",
  "state-background-check": "criminal_state",
  "california-background-check": "criminal_state_ca",
  "texas-background-check": "criminal_state_tx",
  "florida-level2-background": "criminal_state_fl",
  "drug-screen": "drug_test_10panel",
  "oig-exclusion-check": "oig_exclusion",
  "sam-exclusion-check": "sam_exclusion",
};

/** Reverse map: FA component type → compliance element slug */
export const faComponentToElement: Record<string, string> = Object.fromEntries(
  Object.entries(elementToFAComponent).map(([k, v]) => [v, k]),
);

/**
 * Given an FA screening result, determine which compliance elements it fulfils.
 */
export function mapScreeningToElements(
  screeningComponents: Array<{ type: string; status: string; result?: string }>,
): Array<{
  elementSlug: string;
  faComponentType: string;
  status: string;
  result?: string;
  canMarkVerified: boolean;
}> {
  return screeningComponents
    .filter((c) => faComponentToElement[c.type])
    .map((c) => ({
      elementSlug: faComponentToElement[c.type],
      faComponentType: c.type,
      status: c.status,
      result: c.result,
      canMarkVerified: c.status === "complete" && c.result === "clear",
    }));
}
```

### Task 2.6: Add env vars

**Files:**
- Modify: `.env.local` (add FA vars)
- Modify: `.env.example` (add FA var placeholders)

Add to `.env.example`:

```env
# First Advantage / Sterling API
FA_API_MODE=mock
FA_CLIENT_ID=
FA_CLIENT_SECRET=
FA_API_BASE_URL=https://api.us.int.sterlingcheck.app/v2
```

Add to `.env.local` — load real credentials from your local secret store. Do NOT paste secrets into this plan or commit them:

```env
FA_API_MODE=mock
FA_CLIENT_ID=<from secret store>
FA_CLIENT_SECRET=<from secret store>
FA_API_BASE_URL=https://api.us.int.sterlingcheck.app/v2
```

> **Default: mock.** Use mock mode for development and most testing. Switch to `FA_API_MODE=live` only for the controlled smoke test (Task 2.7) and final demo rehearsal.

### Task 2.7: Controlled live smoke test

**Steps:**

1. Temporarily set `FA_API_MODE=live` in `.env.local`.
2. Run the smoke script (see Task 5.2) with `--live` flag, or manually:

```bash
cd /Users/hamishirving/Documents/product-dev/cred-ai
npx tsx -e "
const { LiveFAClient } = require('./lib/api/first-advantage/live-client');
const c = new LiveFAClient();
c.authenticate().then(() => console.log('Auth OK')).catch(e => console.error('Auth failed:', e.message));
c.getPackages().then(p => console.log('Packages:', p.length)).catch(e => console.error('Packages failed:', e.message));
"
```

Expected: `Auth OK` and `Packages: 13`. **Do NOT print token material.**
3. Set `FA_API_MODE=mock` back after verification.

### Task 2.8: Commit

```bash
cd /Users/hamishirving/Documents/product-dev/cred-ai
git add lib/api/first-advantage/ lib/ai/tools/fa-select-package.ts .env.example
git commit -m "Add FA API client with live and mock modes"
```

> **Do NOT stage `.env.local`** — it contains credentials and is gitignored.

---

## Chunk 3: FA Tools + Gap Analyzer Agent

The first demo-able agent. Combines chunks 1 + 2.

### Task 3.1: Create 5 FA tools

**Files:**
- Create: `lib/ai/tools/fa-get-packages.ts`
- Create: `lib/ai/tools/fa-create-candidate.ts`
- Create: `lib/ai/tools/fa-initiate-screening.ts`
- Create: `lib/ai/tools/fa-check-screening.ts`
- Create: `lib/ai/tools/fa-get-report.ts`

All follow the same pattern. Each tool imports `getFAClient()` from `lib/api/first-advantage/client` and calls the appropriate method. Return `{ data }` on success, `{ error }` on failure. See the design doc (Component 2: FA Tools) for exact schemas.

Key pattern for each:

```typescript
import { tool } from "ai";
import { z } from "zod";
import { getFAClient } from "@/lib/api/first-advantage/client";

export const faGetPackages = tool({
  description: `...`,
  inputSchema: z.object({ /* ... */ }),
  execute: async (input) => {
    try {
      const client = getFAClient();
      const result = await client.getPackages();
      return { data: result };
    } catch (error) {
      return { error: `FA API error: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
});
```

### Task 3.2: Register FA tools in tool-resolver

**Files:**
- Modify: `lib/ai/agents/tool-resolver.ts`

Add imports for all 5 FA tools and the package selector, then add to `toolRegistry`:

```typescript
import { faGetPackages } from "@/lib/ai/tools/fa-get-packages";
import { faCreateCandidate } from "@/lib/ai/tools/fa-create-candidate";
import { faInitiateScreening } from "@/lib/ai/tools/fa-initiate-screening";
import { faCheckScreening } from "@/lib/ai/tools/fa-check-screening";
import { faGetReport } from "@/lib/ai/tools/fa-get-report";
import { faSelectPackage } from "@/lib/ai/tools/fa-select-package";

// In toolRegistry:
faGetPackages: faGetPackages as Tool,
faCreateCandidate: faCreateCandidate as Tool,
faInitiateScreening: faInitiateScreening as Tool,
faCheckScreening: faCheckScreening as Tool,
faGetReport: faGetReport as Tool,
faSelectPackage: faSelectPackage as Tool,
```

### Task 3.3: Create Gap Analyzer agent

**Files:**
- Create: `lib/ai/agents/definitions/compliance-gap-analyzer.ts`

Follow the pattern from `bls-verification.ts`. Use the system prompt from the design doc (Component 3, Agent 1). Tool list:

```typescript
tools: [
  "getLocalProfile",
  "resolvePlacementRequirements",
  "getPlacementCompliance",
  "searchLocalCandidates",
  "faGetPackages",
  "getAgentMemory",
  "saveAgentMemory",
],
```

Input schema:

```typescript
inputSchema: z.object({
  candidateSearch: z.string().describe("Candidate name, email, or profile ID"),
  targetState: z.string().default("florida").describe("US state for the placement"),
  facilityName: z.string().optional().describe("Facility name"),
  roleName: z.string().optional().describe("Role name"),
  dealType: z.enum(["standard", "lapse", "quickstart", "reassignment"]).default("standard"),
}),
```

### Task 3.4: Register agent in registry

**Files:**
- Modify: `lib/ai/agents/registry.ts`

```typescript
import { complianceGapAnalyzerAgent } from "./definitions/compliance-gap-analyzer";

// In agents Record:
[complianceGapAnalyzerAgent.id]: complianceGapAnalyzerAgent,
```

### Task 3.5: Create placement compliance renderer

**Files:**
- Create: `components/tool-handlers/handlers/placement-compliance-tool.tsx`

A React component that renders the grouped compliance view. Takes `ToolHandlerProps` with the output from `getPlacementCompliance`. Groups items by `source` (federal, state, role, facility) and shows status indicators.

Key UI patterns (from `components/CLAUDE.md`):
- Use `text-sm` for body, `text-xs` for metadata
- Tight spacing: `gap-2`, `p-3`
- Use shadcn/ui primitives via composition

### Task 3.6: Register renderer

**Files:**
- Modify: `components/tool-handlers/index.tsx`

```typescript
import { PlacementComplianceTool } from "./handlers/placement-compliance-tool";

// In toolRegistry:
"tool-getPlacementCompliance": PlacementComplianceTool as ToolHandler,
```

### Task 3.7: Verify Gap Analyzer agent

**Steps:**

1. Run `pnpm db:seed` then `pnpm dev`.
2. In playground, select TravelNurse Pro org.
3. Run the Gap Analyzer agent with: "Ashlyn Torres is being placed at Memorial Hospital in Florida as a Travel ICU RN. What does she need?"
4. Verify: Agent calls `searchLocalCandidates` → `getLocalProfile` → `resolvePlacementRequirements` → `getPlacementCompliance` → `faGetPackages` → presents grouped analysis.
5. Try scenario 2: "Lexie Chen is being reassigned from Texas to California." Should show most items carrying forward.
6. Try scenario 3: "Peter Walsh has been inactive for 6 months. He wants a Florida placement." Should show expired items and recommend Package #2.

### Task 3.8: Commit

```bash
cd /Users/hamishirving/Documents/product-dev/cred-ai
git add lib/ai/tools/fa-*.ts lib/ai/agents/definitions/compliance-gap-analyzer.ts lib/ai/agents/registry.ts lib/ai/agents/tool-resolver.ts components/tool-handlers/
git commit -m "Add Gap Analyzer agent with FA tools and placement compliance renderer"
```

---

## Chunk 4: Background Screening + Status Monitor Agents

Adds the remaining two agents to complete the demo flow.

### Task 4.1: Create Background Screening agent

**Files:**
- Create: `lib/ai/agents/definitions/background-screening.ts`

Use the system prompt from the design doc (Component 3, Agent 2) but **update STEP 3** to require calling `faSelectPackage` instead of reasoning from prompt alone. The agent must call the tool and cite its output (packageId, tier, reason).

Tool list:

```typescript
tools: [
  "getLocalProfile",
  "getPlacementCompliance",
  "searchLocalCandidates",
  "faGetPackages",
  "faSelectPackage",
  "faCreateCandidate",
  "faInitiateScreening",
  "getAgentMemory",
  "saveAgentMemory",
  "createTask",
],
```

> **Key change from design doc:** STEP 3 now says "Use faSelectPackage to determine the correct package. ALWAYS call this tool — do not reason about package selection yourself. Cite the tool's output (package name, tier, and reason) in your explanation."

### Task 4.2: Create Screening Status Monitor agent

**Files:**
- Create: `lib/ai/agents/definitions/screening-status-monitor.ts`

Use the system prompt from the design doc (Component 3, Agent 3), but **update STEP 4** to use `getPlacementCompliance` for mapping screening results back to compliance elements (not just prompt-level reasoning).

Tool list:

```typescript
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
```

> **Key change from design doc:** STEP 4 now says "Use getPlacementCompliance to map completed screening results to compliance elements. Use the package-map module (imported in the tool) to translate FA component types to Credentially element slugs. Do not hardcode the mapping in the prompt."

### Task 4.3: Register both agents

**Files:**
- Modify: `lib/ai/agents/registry.ts`

```typescript
import { backgroundScreeningAgent } from "./definitions/background-screening";
import { screeningStatusMonitorAgent } from "./definitions/screening-status-monitor";

// In agents Record:
[backgroundScreeningAgent.id]: backgroundScreeningAgent,
[screeningStatusMonitorAgent.id]: screeningStatusMonitorAgent,
```

### Task 4.4: Create FA screening status renderer

**Files:**
- Create: `components/tool-handlers/handlers/fa-screening-tool.tsx`

Shows screening progress with per-component status indicators. Displays candidate name, package, overall status, and each component (criminal: clear, drug test: pending, etc.) with elapsed time.

### Task 4.5: Register renderer

**Files:**
- Modify: `components/tool-handlers/index.tsx`

```typescript
import { FAScreeningTool } from "./handlers/fa-screening-tool";

"tool-faCheckScreening": FAScreeningTool as ToolHandler,
```

### Task 4.6: Verify full demo flow

**Steps:**

1. Run `pnpm dev`.
2. **Scene 1:** Run Gap Analyzer for Ashlyn → verify grouped output.
3. **Scene 2:** Run Background Screening for Ashlyn → verify it creates candidate in FA, selects package, initiates screening.
4. **Scene 3:** Run Status Monitor → verify it retrieves screening status and maps to compliance.
5. **Scene 4:** Run Gap Analyzer for Lexie (reassignment) → verify carry-forward items.
6. **Scene 5:** Run Background Screening for Peter (lapse) → verify it selects Package #2.

### Task 4.7: Commit

```bash
cd /Users/hamishirving/Documents/product-dev/cred-ai
git add lib/ai/agents/definitions/background-screening.ts lib/ai/agents/definitions/screening-status-monitor.ts lib/ai/agents/registry.ts components/tool-handlers/
git commit -m "Add Background Screening and Status Monitor agents"
```

---

## Chunk 5: Polish + Rehearsal

Fine-tune based on actual agent output.

### Task 5.1: Tune agent prompts

Run all three demo scenarios and adjust:
- System prompts if the agent's reasoning isn't clear enough
- Tool descriptions if the agent picks the wrong tool
- Input schemas if the agent struggles with parameters
- Seed data if compliance states don't look right

### Task 5.2: Create scripted smoke check

**Files:**
- Create: `scripts/fa-smoke.ts`
- Modify: `package.json` (add `fa:smoke` script)

Create a repeatable smoke check that exercises all 3 demo scenarios programmatically. Runs against mock by default, `--live` flag for real API.

```typescript
// scripts/fa-smoke.ts
// Usage: pnpm fa:smoke          (mock mode)
//        pnpm fa:smoke --live   (live API — be careful)

import { getFAClient } from "../lib/api/first-advantage/client";
import { selectFAPackage } from "../lib/api/first-advantage/package-selector";

async function smoke() {
  const isLive = process.argv.includes("--live");
  if (isLive) {
    process.env.FA_API_MODE = "live";
    console.log("⚠️  Running against LIVE FA API");
  } else {
    process.env.FA_API_MODE = "mock";
    console.log("Running against mock FA client");
  }

  const client = getFAClient();

  // 1. Auth
  console.log("\n--- Auth ---");
  await client.authenticate();
  console.log("✓ Auth OK");

  // 2. Packages
  console.log("\n--- Packages ---");
  const packages = await client.getPackages();
  console.log(`✓ ${packages.length} packages retrieved`);

  // 3. Package selection assertions
  console.log("\n--- Package Selection ---");
  const ashlyn = selectFAPackage({ targetState: "florida", dealType: "standard" });
  assert(ashlyn.tier === 1, `Ashlyn should get Package #1, got tier ${ashlyn.tier}`);
  console.log(`✓ Ashlyn (standard FL): Tier ${ashlyn.tier} — ${ashlyn.reason}`);

  const peter = selectFAPackage({ targetState: "florida", dealType: "lapse" });
  assert(peter.tier === 2, `Peter should get Package #2, got tier ${peter.tier}`);
  console.log(`✓ Peter (lapse FL): Tier ${peter.tier} — ${peter.reason}`);

  const lexie = selectFAPackage({ targetState: "california", dealType: "reassignment" });
  assert(lexie.tier === 2, `Lexie should get Package #2 (CA statewide), got tier ${lexie.tier}`);
  console.log(`✓ Lexie (reassignment CA): Tier ${lexie.tier} — ${lexie.reason}`);

  // 4. Create + screen flow (mock only for full flow)
  if (!isLive) {
    console.log("\n--- Screening Flow (mock) ---");
    const candidate = await client.createCandidate({
      givenName: "Test", familyName: "Smoke",
      email: "test@smoke.com", clientReferenceId: "smoke-test-1",
    });
    console.log(`✓ Candidate created: ${candidate.id}`);

    const screening = await client.initiateScreening({
      candidateId: candidate.id, packageId: ashlyn.packageId,
    });
    console.log(`✓ Screening initiated: ${screening.id}, status: ${screening.status}`);

    // Wait for mock progression
    await new Promise(r => setTimeout(r, 16_000));
    const result = await client.getScreening(screening.id);
    assert(result.status === "complete", `Expected complete, got ${result.status}`);
    console.log(`✓ Screening complete: ${result.result}`);
  }

  console.log("\n✓ All smoke checks passed");
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

smoke().catch((e) => {
  console.error("✗ Smoke check failed:", e.message);
  process.exit(1);
});
```

Add to `package.json`:
```json
"fa:smoke": "tsx scripts/fa-smoke.ts"
```

### Task 5.3: Dry run the full demo narrative

Walk through all 5 scenes from the design doc via the chat UI:
1. Ashlyn — new clinician (Scene 1 + 2)
2. Lexie — reassignment (Scene 3)
3. Peter — lapse deal (Scene 4)
4. Status dashboard (Scene 5)

Verify:
- [ ] Package selection is deterministic and correct for each scenario
- [ ] Compliance renderer groups by source (federal/state/role/facility)
- [ ] Carry-forward labels appear for Lexie's reassignment
- [ ] OIG/SAM only appears for Peter (lapse) and Lexie (CA statewide), NOT for Ashlyn (standard FL)
- [ ] Agent cites faSelectPackage output when explaining package choice

Note any rough edges for Thursday.

### Task 5.4: Final commit

```bash
cd /Users/hamishirving/Documents/product-dev/cred-ai
git add scripts/fa-smoke.ts package.json lib/
git commit -m "Polish FA demo agents and seed data"
```

---

## Summary

| Chunk | Tasks | Key Output | Depends On |
|-------|-------|------------|------------|
| 1. Seed + Requirements Engine | 1.1–1.11 | Data exists, tools resolve requirements (with conditional OIG/SAM) | Nothing |
| 2. FA API Client | 2.1–2.8 | Mock client default, live smoke verified, faSelectPackage tool, package-map.ts | Nothing |
| 3. FA Tools + Gap Analyzer | 3.1–3.8 | First demo-able agent with deterministic package selection | Chunks 1 + 2 |
| 4. Screening + Monitor Agents | 4.1–4.7 | Full demo flow with compliance mapping in status monitor | Chunk 3 |
| 5. Polish + Smoke | 5.1–5.4 | Scripted smoke check, dry run, demo ready for Thursday | Chunk 4 |

Chunks 1 and 2 can run in parallel. Chunk 3 needs both. Then 4 builds on 3, and 5 is iteration.

### Key changes from v1 of this plan

- **OIG/SAM moved to tier-2 only** — not in federal core, conditionally included via `requiresOigSam()` in the requirements engine
- **faSelectPackage tool added** — deterministic package selection, agents must call and cite it
- **package-map.ts added** — maps FA screening components to compliance elements for status monitor
- **Status Monitor gets compliance tools** — `getPlacementCompliance` + `resolvePlacementRequirements` for proper result mapping
- **Default to mock** — `FA_API_MODE=mock`, controlled live smoke in Task 2.7
- **No secrets in plan** — credentials in `.env.local` only, loaded from local secret store
- **Scoped git add** — no `git add .`, explicit file paths to avoid committing `.env.local`
- **Scripted smoke check** — `pnpm fa:smoke` for repeatable assertions across all 3 scenarios
- **Fixed typos** — `expiringSoon` (was `expiringSOon`), improved evidence selection priority logic
