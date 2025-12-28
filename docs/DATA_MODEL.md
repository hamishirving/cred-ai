# Data Model: Credentially 2.0 Playground

**Status:** Draft - In Discussion
**Last Updated:** 2025-12-28

---

## Overview

This document defines the data model for the Credentially 2.0 Playground. The model must support:

**Core Requirements:**
1. **Placement layer** - Jobs/assignments between org and candidate (critical for agencies, travel nursing)
2. **Flexible compliance composition** - Packages assigned at various levels, not a rigid hierarchy
3. **Candidate vs placement scoped items** - Some compliance items are portable (worker passport), others per-placement
4. **Two separate hierarchies** - Organisation (admin/permissions) vs WorkNode (where work happens)

**Lifecycle - Initial & Ongoing:**
5. **Initial onboarding** - Getting candidates compliant for their first placement
6. **Ongoing compliance monitoring** - Tracking expiry dates, triggering renewals, re-verification cycles
7. **Configurable pipelines** - Multi-stage candidate journeys with team ownership

**Flexibility & Extensibility:**
8. **Deep localisation** - Configurable terminology per organisation
9. **Data ownership flexibility** - Support both candidate-owned (passport) and org-owned models
10. **Custom fields** - Extensibility via P001 pattern
11. **ATS expansion path** - Model supports future Job → Application → Placement journey (entities can be added when needed)

**Implementation:**
12. **Seed data → API transition** - Start with demo data, swap to real API later

---

## Design Decisions

### D1: WorkNode Replaces Client/Facility/OrgUnit

**Decision:** Use a unified **WorkNode** entity instead of separate Client, Facility, and OrgUnit entities.

**Rationale:** Stress testing against real customer scenarios (Neven, Cera, Sanctuary, Health Carousel, Ascension, Memorial Hermann) revealed that:
- Different orgs have vastly different hierarchies
- "Client" vs "Facility" vs "OrgUnit" distinctions are org-specific
- What matters is: where does work happen, and what compliance requirements apply there?

**Implementation:**
- WorkNode is the unified "where work happens" entity
- WorkNodeType allows orgs to define their own hierarchy levels (Trust, Hospital, Ward, Client, Site, State, etc.)
- Terminology is fully configurable

### D2: Data Ownership is Configurable

**Decision:** Support both candidate-owned (worker passport) and organisation-owned data models.

**Rationale:** The original passport concept didn't resonate with all customers. Some want portable credentials; others want org-controlled data. The architecture should support both.

**Implementation:**
- Default data ownership configurable per org
- Per-element override possible
- Evidence tracks ownership for future portability

### D3: Pipelines for Journey Management

**Decision:** Configurable pipelines with stage ownership, not hardcoded status fields.

**Rationale:** Current platform has disconnected concepts (user status, signed off, onboarding complete). Different teams own different stages. Need CRM-style pipeline views.

**Implementation:**
- Pipeline entity with configurable stages
- Stage ownership ties to roles/teams
- Auto-advance rules based on compliance completion
- Separate pipelines for Application vs Placement journeys

---

## Core Entities

### Organisation

The top-level tenant. Supports hierarchy via `parentId`. Contains terminology and settings.

```ts
interface Organisation {
  id: string;
  name: string;
  parentId?: string;           // For multi-level hierarchies
  settings: OrgSettings;
  createdAt: string;
}

interface OrgSettings {
  // Data ownership
  dataOwnership: {
    default: 'candidate' | 'organisation';
  };

  // Terminology - configurable display names
  terminology: {
    candidate: string;         // "Contractor", "Provider", "Employee", "Worker"
    placement: string;         // "Assignment", "Booking", "Job", "Shift"
    workNode: string;          // "Location", "Site", "Work Location"
    application: string;       // "Submission", "Application"
    job: string;               // "Vacancy", "Position", "Opening"
  };

  // Feature flags
  features: {
    usesJobs: boolean;         // Enable Job/Application entities (ATS mode)
    usesPipelines: boolean;    // Enable configurable pipelines
  };
}
```

### WorkNodeType

Defines the levels in an org's work location hierarchy. Fully user-configurable.

```ts
interface WorkNodeType {
  id: string;
  organisationId: string;
  name: string;                // "Trust", "Hospital", "Ward", "Client", "State", "Site"
  pluralName: string;          // "Trusts", "Hospitals"
  level: number;               // Hierarchy depth (0 = top level)
  parentTypeId?: string;       // Constrain hierarchy: "Ward" can only be under "Hospital"
  color?: string;              // For UI display
}
```

**Example configurations:**

| Org Type | Hierarchy Levels |
|----------|------------------|
| UK Agency | Client → Facility → Ward |
| US Travel Nursing | State → Health System → Hospital → Unit |
| NHS Trust | Trust → Hospital → Department |
| Care Home Group | Region → Home |

### WorkNode

Where work happens. Unified entity replacing Client/Facility/OrgUnit.

```ts
interface WorkNode {
  id: string;
  organisationId: string;
  typeId: string;              // Links to WorkNodeType
  name: string;                // "St Mary's Hospital", "California", "NHS Trust North"
  parentId?: string;           // Hierarchy within WorkNode tree

  // Regulatory context
  jurisdiction?: string;       // "england", "scotland", "california", "texas"

  // Visibility for multi-org scenarios (MSPs, umbrella orgs)
  visibleToOrgIds?: string[];  // If set, only these orgs can use this node
                               // If null, visible to owner org + all descendants

  // Extensibility
  customFields?: Record<string, unknown>;

  // Metadata
  address?: Address;
  isActive: boolean;
  createdAt: string;
}
```

### Role

Job roles/types within the organisation. Already exists in current system.

```ts
interface Role {
  id: string;
  organisationId: string;
  name: string;                // "Band 5 Nurse", "Healthcare Assistant"
  description?: string;
  staffType?: string;          // 'clinical' | 'non-clinical' | etc.

  // Extensibility
  customFields?: Record<string, unknown>;
}
```

---

## Compliance Entities

### ComplianceElement

Definition of a compliance requirement type. The "what" that needs to be fulfilled.

```ts
interface ComplianceElement {
  id: string;
  organisationId: string;

  // Identity
  name: string;                // "Enhanced DBS", "NMC Registration", "Fire Safety"
  shortName?: string;          // "DBS", "NMC"
  description?: string;
  category: string;            // "Identity", "Professional", "Training", "Health"

  // THE KEY PROPERTY: Where does fulfilment live?
  scope: 'candidate' | 'placement';
  // candidate = fulfilled once, applies everywhere (DBS, RTW, NMC)
  // placement = must be fulfilled per-placement (site induction, client training)

  // Data ownership (overrides org default)
  dataOwnership?: 'candidate' | 'organisation';
  // candidate = portable, owned by worker (passport model)
  // organisation = owned by org, not portable

  // What type of evidence fulfils this?
  evidenceType: 'document' | 'reference' | 'check' | 'questionnaire' | 'training' | 'other';

  // Validation rules
  expires: boolean;
  expiryMonths?: number;       // If expires, how long is it valid?
  verificationRequired: boolean;

  // Jurisdiction rules
  jurisdictions?: string[];           // Only required in these jurisdictions
  excludeJurisdictions?: string[];    // Not required in these jurisdictions
  jurisdictionRequired?: boolean;     // Evidence must match placement jurisdiction
  substitutes?: string[];             // This element can substitute for these others

  // For checks/integrations
  integrationKey?: string;     // 'gmc' | 'nmc' | 'hcpc' | 'dbs' | 'rtw'

  // Extensibility
  customFields?: Record<string, unknown>;
}
```

**Scope Examples:**

| Element | Scope | Reason |
|---------|-------|--------|
| Enhanced DBS | candidate | One DBS covers all placements |
| Right to Work | candidate | Legal status applies everywhere |
| NMC Registration | candidate | Professional registration is personal |
| Passport | candidate | Identity document |
| NHS Trust A Induction | placement | Specific to that client |
| Fire Safety (St Mary's) | placement | Site-specific training |
| Client Mandatory Training | placement | Client requires for their placements |

### CompliancePackage

A bundle of compliance elements. The "group" of requirements.

```ts
interface CompliancePackage {
  id: string;
  organisationId: string;

  name: string;                // "Core Package", "Band 5 Nurse Requirements"
  description?: string;

  // What's in this package
  elements: PackageElement[];

  // When should this package be auto-assigned?
  assignmentRules: AssignmentRule[];

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PackageElement {
  elementId: string;
  required: boolean;           // Mandatory or optional?
  // Future: per-package overrides (deadline offsets, etc.)
}

interface AssignmentRule {
  // Package applies when ANY of these conditions match
  // (OR logic between rules, AND logic within a rule if multiple fields)

  type: 'organisation' | 'role' | 'work_node' | 'job';

  // Which entity (null for 'organisation' type = whole org)
  entityId?: string;

  // For multi-org scenarios (e.g., MSP with multiple agencies)
  // Scope this rule to specific orgs
  orgScope?: {
    orgId: string;
    includeChildren: boolean;
  };
}
```

**Example Packages:**

```ts
// Core package - applies to everyone
{
  name: "Core Compliance",
  elements: [
    { elementId: 'dbs', required: true },
    { elementId: 'rtw', required: true },
    { elementId: 'id-verification', required: true },
  ],
  assignmentRules: [
    { type: 'organisation' }  // Everyone
  ]
}

// Role-specific package
{
  name: "Nursing Requirements",
  elements: [
    { elementId: 'nmc-registration', required: true },
    { elementId: 'clinical-competencies', required: true },
  ],
  assignmentRules: [
    { type: 'role', entityId: 'role-band5-nurse' },
    { type: 'role', entityId: 'role-band6-nurse' },
  ]
}

// WorkNode-specific package (replaces client-specific)
{
  name: "NHS Trust A Requirements",
  elements: [
    { elementId: 'trust-a-induction', required: true },
    { elementId: 'trust-a-mandatory-training', required: true },
  ],
  assignmentRules: [
    { type: 'work_node', entityId: 'worknode-nhs-trust-a' }
  ]
}

// Job-specific package (for ATS mode)
{
  name: "ICU Nurse - St Mary's - Jan 2025",
  elements: [
    { elementId: 'icu-competencies', required: true },
  ],
  assignmentRules: [
    { type: 'job', entityId: 'job-icu-nurse-stmarys-jan25' }
  ]
}
```

---

## Profile & Placement Entities

### Profile (Candidate)

The person being onboarded/managed.

```ts
interface Profile {
  id: string;
  organisationId: string;

  // Personal info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;

  // Candidate-scoped evidence (fulfilled items)
  // These apply to ALL placements
  evidence: Evidence[];

  // Computed: overall status across all placements
  overallStatus: 'compliant' | 'non_compliant' | 'pending';

  // Extensibility
  customFields?: Record<string, unknown>;

  createdAt: string;
}
```

### Job (ATS Mode)

A position/opening that candidates can apply to. Enables future ATS/CRM capabilities.

```ts
interface Job {
  id: string;
  organisationId: string;

  // What is this job?
  title: string;
  description?: string;
  roleId: string;

  // Where?
  workNodeId?: string;         // Location/client for this job

  // Additional compliance requirements beyond role/workNode defaults
  additionalPackageIds?: string[];

  // ATS fields
  status: 'draft' | 'open' | 'closed' | 'filled';
  postedTo?: string[];         // Job boards, careers page
  closingDate?: string;

  // Capacity
  positions: number;           // How many to fill
  filled: number;

  // Extensibility
  customFields?: Record<string, unknown>;

  createdAt: string;
}
```

### Application (ATS Mode)

A candidate applying to a job. Pre-placement stage.

```ts
interface Application {
  id: string;
  organisationId: string;
  jobId: string;
  profileId: string;

  // Application journey (can be overridden by pipeline)
  status: 'applied' | 'screening' | 'interview' | 'offered' | 'accepted' | 'rejected' | 'withdrawn';

  // Timestamps
  appliedAt: string;
  statusChangedAt: string;

  // When accepted, creates a Placement
  placementId?: string;

  // Extensibility
  customFields?: Record<string, unknown>;
}
```

### Placement

An accepted job/assignment for a candidate. The "where and when" they're working.

```ts
interface Placement {
  id: string;
  organisationId: string;
  profileId: string;

  // What role?
  roleId: string;

  // Where? (uses WorkNode instead of separate client/facility)
  workNodeId?: string;

  // Link to job/application if came through ATS flow
  jobId?: string;
  applicationId?: string;

  // When?
  startDate: string;
  endDate?: string;            // null = permanent/ongoing

  // Status
  status: 'pending' | 'active' | 'completed' | 'cancelled';

  // Placement-scoped evidence (fulfilled items specific to THIS placement)
  evidence: Evidence[];

  // Computed fields (derived from requirements resolution)
  complianceStatus: 'compliant' | 'non_compliant' | 'expiring';
  compliancePercentage: number;
  gaps: ComplianceGap[];

  createdAt: string;
}
```

### Evidence

Proof that a compliance element has been fulfilled.

```ts
interface Evidence {
  id: string;
  elementId: string;           // Which ComplianceElement this fulfils

  // Where does this evidence live?
  // Matches the element's scope
  profileId?: string;          // For candidate-scoped
  placementId?: string;        // For placement-scoped

  // Data ownership (resolved at creation from element/org settings)
  ownership: 'candidate' | 'organisation';

  // For candidate-owned evidence, track sharing
  sharedWithOrgIds?: string[]; // Future: orgs that can see this evidence

  // Jurisdiction (for location-specific credentials like state licenses)
  jurisdiction?: string;       // "california", "texas", "england", "scotland"

  // The actual evidence
  type: 'document' | 'reference' | 'check_result' | 'questionnaire' | 'attestation';

  // Source tracking (for source-agnostic data collection)
  source: 'user_input' | 'document_extraction' | 'cv_parsing' | 'integration' | 'manual';
  sourceConfidence?: number;   // AI confidence score (0-100)

  // Status
  status: 'pending' | 'fulfilled' | 'expired' | 'rejected';

  // Dates
  issuedDate?: string;
  expiryDate?: string;
  verifiedAt?: string;
  verifiedBy?: string;

  // Reference to actual content (document file, check result, etc.)
  contentRef?: string;
  metadata?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}
```

### ComplianceGap

A missing or problematic requirement (computed).

```ts
interface ComplianceGap {
  elementId: string;
  elementName: string;
  scope: 'candidate' | 'placement';

  reason: 'missing' | 'expired' | 'expiring_soon' | 'pending_verification' | 'rejected';

  // When is this blocking?
  dueDate?: string;            // Usually the placement start date
  daysUntilDue?: number;

  // What action is needed?
  actionRequired: string;      // "Upload DBS certificate", "Complete training"
}
```

---

## Pipeline Entities

Configurable multi-stage journeys with team ownership. Replaces hardcoded status fields.

### Pipeline

Defines a configurable journey for candidates, applications, or placements.

```ts
interface Pipeline {
  id: string;
  organisationId: string;

  name: string;                    // "Candidate Onboarding", "Application Process"
  appliesTo: 'candidate' | 'application' | 'placement';

  stages: PipelineStage[];

  isDefault: boolean;              // Default pipeline for this entity type
  isActive: boolean;

  createdAt: string;
}

interface PipelineStage {
  id: string;
  name: string;                    // "Applied", "Screening", "Compliance", "QA", "Active"
  order: number;
  color?: string;

  // Ownership - which team is responsible at this stage
  ownerRoleId?: string;            // Links to org role/team

  // Automation
  autoAdvanceConditions?: AutoAdvanceCondition[];

  // Actions triggered on stage transitions
  onEnter?: StageAction[];
  onExit?: StageAction[];

  // SLA
  targetDays?: number;             // Expected time in stage
  escalateAfterDays?: number;      // When to escalate if stuck
  escalateToRoleId?: string;       // Who to escalate to
}

interface AutoAdvanceCondition {
  type: 'compliance_complete' | 'documents_approved' | 'custom';
  threshold?: number;              // For compliance_complete: 100 = fully compliant
  expression?: string;             // For custom: rule engine expression
}

interface StageAction {
  type: 'notify' | 'assign' | 'webhook' | 'ai_action';
  config: Record<string, unknown>;
}
```

### EntityStagePosition

Tracks where an entity is in its pipeline journey.

```ts
interface EntityStagePosition {
  id: string;
  entityType: 'candidate' | 'application' | 'placement';
  entityId: string;
  pipelineId: string;
  currentStageId: string;
  enteredStageAt: string;

  // History of stage transitions
  history: StageTransition[];
}

interface StageTransition {
  stageId: string;
  stageName: string;
  enteredAt: string;
  exitedAt?: string;
  movedBy: string;                 // User ID or 'system'
  reason?: string;                 // Why the transition happened
}
```

**Example Pipeline:**

```ts
{
  name: "Agency Onboarding",
  appliesTo: "placement",
  stages: [
    {
      name: "Onboarding",
      order: 1,
      ownerRoleId: "role-recruitment",
      targetDays: 3
    },
    {
      name: "Compliance",
      order: 2,
      ownerRoleId: "role-compliance-team",
      autoAdvanceConditions: [
        { type: 'compliance_complete', threshold: 100 }
      ],
      escalateAfterDays: 7,
      escalateToRoleId: "role-compliance-manager"
    },
    {
      name: "QA Review",
      order: 3,
      ownerRoleId: "role-qa-team",
      targetDays: 1
    },
    {
      name: "Active",
      order: 4,
      ownerRoleId: "role-operations"
    }
  ],
  isDefault: true
}
```

---

## Requirement Resolution

How we compute what a placement (or application) needs:

```ts
function resolveRequirements(placement: Placement): ResolvedRequirement[] {
  const applicablePackages: CompliancePackage[] = [];

  // 1. Organisation-wide packages
  applicablePackages.push(
    ...packages.filter(p =>
      p.assignmentRules.some(r => r.type === 'organisation')
    )
  );

  // 2. WorkNode packages (walk up hierarchy)
  if (placement.workNodeId) {
    const nodeChain = getWorkNodeAncestors(placement.workNodeId);
    for (const node of nodeChain) {
      applicablePackages.push(
        ...packages.filter(p =>
          p.assignmentRules.some(r =>
            r.type === 'work_node' && r.entityId === node.id
          )
        )
      );
    }
  }

  // 3. Role packages
  applicablePackages.push(
    ...packages.filter(p =>
      p.assignmentRules.some(r =>
        r.type === 'role' && r.entityId === placement.roleId
      )
    )
  );

  // 4. Job packages (if came through ATS flow)
  if (placement.jobId) {
    applicablePackages.push(
      ...packages.filter(p =>
        p.assignmentRules.some(r =>
          r.type === 'job' && r.entityId === placement.jobId
        )
      )
    );
  }

  // 5. Flatten and dedupe elements
  const elementMap = new Map<string, ResolvedRequirement>();

  for (const pkg of applicablePackages) {
    for (const el of pkg.elements) {
      const element = getComplianceElement(el.elementId);

      // Check jurisdiction rules
      if (element.jurisdictions) {
        const placementJurisdiction = getJurisdiction(placement.workNodeId);
        if (!element.jurisdictions.includes(placementJurisdiction)) {
          continue; // Skip - not required in this jurisdiction
        }
      }

      // Later packages can override (for per-placement customisation)
      elementMap.set(el.elementId, {
        elementId: el.elementId,
        required: el.required,
        fromPackages: [...(elementMap.get(el.elementId)?.fromPackages || []), pkg.id],
      });
    }
  }

  return Array.from(elementMap.values());
}

// For ATS mode: resolve requirements at application time
function resolveRequirementsForJob(job: Job): ResolvedRequirement[] {
  // Same logic, but using job.roleId and job.workNodeId
  // Allows candidates to see what's needed before placement exists
  const mockPlacement = {
    roleId: job.roleId,
    workNodeId: job.workNodeId,
    jobId: job.id,
  };
  return resolveRequirements(mockPlacement as Placement);
}
```

---

## Fulfilment Check

How we check if a requirement is fulfilled:

```ts
function isRequirementFulfilled(
  element: ComplianceElement,
  profile: Profile,
  placement: Placement
): { fulfilled: boolean; evidence?: Evidence; issue?: string } {

  // Where to look for evidence depends on scope
  const evidencePool = element.scope === 'candidate'
    ? profile.evidence
    : placement.evidence;

  const evidence = evidencePool.find(e => e.elementId === element.id);

  if (!evidence) {
    return { fulfilled: false, issue: 'missing' };
  }

  if (evidence.status === 'rejected') {
    return { fulfilled: false, evidence, issue: 'rejected' };
  }

  if (evidence.status === 'pending') {
    return { fulfilled: false, evidence, issue: 'pending_verification' };
  }

  if (evidence.expiryDate && new Date(evidence.expiryDate) < new Date()) {
    return { fulfilled: false, evidence, issue: 'expired' };
  }

  return { fulfilled: true, evidence };
}
```

---

## Activity & Escalation Entities

### Activity

Log of AI and human actions. Candidate-centric but placement-aware.

```ts
interface Activity {
  id: string;
  organisationId: string;

  // Who is this about?
  profileId: string;

  // Which placements drove this action? (can be multiple)
  placementIds: string[];

  // What happened?
  type: 'chase_email' | 'chase_sms' | 'reference_call' | 'document_received' |
        'document_verified' | 'check_initiated' | 'check_completed' |
        'escalation_created' | 'escalation_resolved' | 'status_change';

  // Human-readable summary
  summary: string;             // "Sent document reminder for DBS"

  // Full details
  detail?: string;             // Email content, call transcript, etc.

  // AI reasoning (for audit/transparency)
  reasoning?: {
    trigger: string;           // "No response in 5 days"
    context: Record<string, unknown>;
    decision: string;          // "Send follow-up with helpful tone"
  };

  // Actor
  actor: 'ai' | 'user';
  userId?: string;             // If user action

  // Outcome
  status: 'completed' | 'pending_response' | 'failed';

  createdAt: string;
}
```

### Escalation

Decisions requiring human input.

```ts
interface Escalation {
  id: string;
  organisationId: string;

  // Context
  profileId: string;
  placementId?: string;        // If related to specific placement
  elementId?: string;          // If related to specific requirement
  activityId?: string;         // The activity that created this

  // What needs deciding?
  type: 'ambiguous_response' | 'low_confidence_extraction' |
        'policy_exception' | 'verification_required' | 'other';

  title: string;               // "Sarah's DBS response needs review"
  description: string;         // Full context

  // AI's recommendation
  recommendation?: {
    action: string;
    reasoning: string;
  };

  // Available actions
  options: EscalationOption[];

  // Resolution
  status: 'pending' | 'resolved' | 'dismissed';
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: {
    optionSelected: string;
    notes?: string;
  };

  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface EscalationOption {
  id: string;
  label: string;               // "Approve", "Reject", "Request more info"
  description?: string;
  isRecommended?: boolean;
}
```

---

## Stress Test: Customer Scenarios

> **Note:** These stress tests informed the design decisions documented above. The WorkNode consolidation (D1), jurisdiction handling, and multi-org visibility features all emerged from this analysis.

Testing the data model against real-world scenarios from PRD-PLAYGROUND.md.

### Key Insight: Two Separate Hierarchies

The scenarios reveal that **Organisation** and **Work Location** are fundamentally different:

| Customer | Org Hierarchy | Work Hierarchy | Same? |
|----------|---------------|----------------|-------|
| Neven (MSP) | Neven → Agencies | NHS Trusts → Hospitals | **No** |
| Cera Care | HQ → Region → Branch | Region → Branch | **~Same** |
| Sanctuary | Group → Brands | Clients → Facilities | **No** |
| Health Carousel | Single agency | States → Hospitals → Units | **No** |
| Ascension | System → Market → Hospital | Market → Hospital → Dept | **~Same** |
| Memorial Hermann | System → Facility | Facility → Dept | **~Same** |

**Conclusion:** We need two hierarchies:
1. **Organisation** — Who manages/employs (admin structure, permissions, billing)
2. **WorkNode** — Where candidates are placed (drives compliance requirements)

For direct employers, these often mirror each other but can diverge (e.g., HR regions ≠ clinical departments).

---

### Scenario: UK-1 Neven Partnership (MSP)

**Challenge:** Multi-party model where MSP → Agencies → NHS Trusts are all separate entities.

**Model Mapping:**

```
Organisation Hierarchy:
├── Neven Partnership (parent org)
│   ├── Agency A (child org - their customer)
│   ├── Agency B (child org)
│   └── Agency C (child org)

WorkNode Hierarchy (shared across agencies):
├── NHS Trust North
│   ├── Hospital A
│   └── Hospital B
├── NHS Trust South
│   └── Hospital C
└── NHS Trust Midlands
```

**How it works:**
- Neven creates child Organisations for each agency
- WorkNodes for NHS Trusts are shared (or duplicated per agency?)
- Neven sets base compliance packages at their org level → inherited by all child orgs
- Each NHS Trust (WorkNode) has additional packages
- Agencies can see their own candidates; Neven can see all

**Gap identified:**
- Who "owns" the NHS Trust WorkNodes? Shared across agencies?
- Need **WorkNode sharing** across orgs, or WorkNodes belong to parent (Neven) and are visible to children

**Proposed solution:** WorkNodes can be scoped to an org subtree:
```ts
interface WorkNode {
  // ...existing fields
  visibleToOrgIds?: string[];    // If set, only these orgs can use this node
                                  // If null, visible to owner org + all descendants
}
```

---

### Scenario: UK-2 Cera Care (Direct Employer)

**Challenge:** Org structure IS the work structure. Regional variations (Scotland vs England).

**Model Mapping:**

```
Organisation Hierarchy:
├── Cera Care (HQ)
│   ├── North Region
│   ├── Midlands Region
│   ├── South Region
│   └── Scotland Region

WorkNode Hierarchy:
├── England
│   ├── North Region
│   │   ├── Manchester Branch
│   │   └── Leeds Branch
│   ├── Midlands Region
│   └── South Region
└── Scotland
    ├── Edinburgh Branch
    └── Glasgow Branch
```

**How it works:**
- Org hierarchy used for admin (who manages which branches)
- WorkNode hierarchy used for compliance (England vs Scotland at top for regulatory split)
- Core package at org root (applies to all)
- Scotland WorkNode has "PVG Check" instead of "DBS" (regulatory substitution)
- Branch WorkNodes have local authority-specific requirements

**Gap identified:**
- Need **jurisdictional requirements** — Scotland vs England isn't just a location, it's a different regulatory regime
- Some requirements are "either/or" (DBS OR PVG), not additive

**Proposed solution:** Add jurisdiction concept or regulatory tags:
```ts
interface WorkNode {
  // ...existing fields
  jurisdiction?: string;         // 'england' | 'scotland' | 'wales' | 'california' | etc.
}

interface ComplianceElement {
  // ...existing fields
  jurisdictions?: string[];      // Only required in these jurisdictions
  excludeJurisdictions?: string[]; // Not required in these
  substitutes?: string[];        // This element can substitute for these others
}
```

---

### Scenario: UK-3 Sanctuary Personnel (Multi-Brand Agency)

**Challenge:** Multiple agency brands under one group, each with different clients.

**Model Mapping:**

```
Organisation Hierarchy:
├── Sanctuary Group (parent)
│   ├── Sanctuary Personnel (child org)
│   ├── Sanctuary Medical (child org)
│   ├── Sanctuary Social Care (child org)
│   └── Sanctuary Education (child org)

WorkNode Hierarchy (per brand):
Sanctuary Personnel's clients:
├── NHS Trust A
│   ├── Hospital 1
│   │   ├── Ward A
│   │   └── Ward B
│   └── Hospital 2
├── Private Hospital Group
└── Care Home Chain

Sanctuary Medical's clients:
├── NHS Trust A (same trust, different relationship?)
├── Private Clinic Group
└── ...
```

**How it works:**
- Group-level packages apply to all brands
- Brand-level packages (Sanctuary Medical has GMC requirements)
- Each brand has its own WorkNode tree for clients
- Candidate might work across brands (shared at Group level)

**Gap identified:**
- Same NHS Trust might be a client of multiple brands
- Do we duplicate the WorkNode, or share it?
- If shared, brand-specific requirements need scoping

**Proposed solution:** WorkNodes can be shared, but packages are scoped:
```ts
interface PackageAssignmentRule {
  type: 'work_node';
  workNodeId: string;

  // Scope this rule to specific orgs (optional)
  orgScope?: {
    orgId: string;
    includeChildren: boolean;
  };
}
```

This allows: "NHS Trust A requirements apply to Sanctuary Personnel placements only, not Sanctuary Medical."

---

### Scenario: US-1 Health Carousel (Travel Nursing)

**Challenge:** 50 states = 50 different licensing requirements. Short-term sequential assignments.

**Model Mapping:**

```
Organisation Hierarchy:
├── Health Carousel (single org)

WorkNode Hierarchy:
├── California (state - jurisdiction)
│   ├── UCLA Health (system)
│   │   ├── UCLA Medical Center (facility)
│   │   │   ├── ICU (unit)
│   │   │   └── ER (unit)
│   │   └── UCLA Santa Monica (facility)
│   └── Cedars-Sinai
├── Texas
│   ├── Houston Methodist
│   └── UT Southwestern
├── New York
│   └── ...
└── (47 more states)
```

**How it works:**
- Federal requirements at org level (I-9, background check)
- State nodes carry state-specific requirements (California RN license)
- Hospital nodes carry facility requirements
- Unit nodes carry specialty requirements (ICU competencies)
- Role (RN) adds role requirements

**Nurse with California + Texas licenses:**
- Placement at UCLA → needs California license ✓
- Placement at Houston Methodist → needs Texas license ✓
- Both placements need federal requirements ✓

**Gap identified:**
- State licensing is complex: Compact states vs non-compact
- Same element (RN License) but state-specific versions
- Need to track: "Has California RN license" vs "Has Texas RN license"

**Proposed solution:** Evidence can be jurisdiction-qualified:
```ts
interface Evidence {
  // ...existing fields
  jurisdiction?: string;         // 'california' | 'texas' | etc.
}

// When checking fulfilment, match jurisdiction:
function isElementFulfilled(element, placement, profile) {
  const requiredJurisdiction = getJurisdiction(placement.workNodeId);

  const evidence = findEvidence(element.id, profile, placement);

  if (element.jurisdictionRequired && evidence?.jurisdiction !== requiredJurisdiction) {
    return false;  // Has license, but wrong state
  }

  return evidence?.status === 'fulfilled';
}
```

---

### Scenario: US-2 Ascension Health (Large Health System)

**Challenge:** Direct employer across 19 states. Internal transfers.

**Model Mapping:**

```
Organisation Hierarchy:
├── Ascension Health (system HQ)
│   ├── Ascension Texas (market)
│   │   ├── Ascension Seton (sub-market)
│   │   └── Ascension Providence
│   ├── Ascension Michigan
│   ├── Ascension Florida
│   └── ...

WorkNode Hierarchy (mirrors org, but with clinical detail):
├── Texas (state/jurisdiction)
│   ├── Austin Market
│   │   ├── Seton Medical Center
│   │   │   ├── Emergency Department
│   │   │   └── Surgical Services
│   │   └── Seton Northwest
│   └── Waco Market
├── Michigan
│   └── ...
└── Florida
    └── ...
```

**How it works:**
- System-wide requirements at Ascension org root
- State requirements at state WorkNode level
- Market requirements at market WorkNode level
- Facility requirements at hospital level
- Department requirements at department level

**Internal transfer scenario:**
- Nurse moves from Ascension Texas → Ascension Michigan
- Candidate-scoped items transfer (most credentials)
- But needs Michigan state license (jurisdiction change)
- May need new facility orientation (placement-scoped)

**Works well:** The model handles this. Candidate evidence is portable. New placement at new WorkNode resolves new requirements.

---

### Scenario: US-3 Memorial Hermann (Regional System)

**Challenge:** Simplest case — single state, direct employer.

**Model Mapping:**

```
Organisation Hierarchy:
├── Memorial Hermann Health System

WorkNode Hierarchy:
├── Texas (jurisdiction)
│   ├── Memorial Hermann - TMC (flagship)
│   │   ├── Heart & Vascular Institute
│   │   ├── Neuroscience Institute
│   │   └── General Nursing
│   ├── Memorial Hermann - Katy
│   ├── Memorial Hermann - The Woodlands
│   └── Memorial Hermann - Convenient Care
│       ├── Clinic A
│       └── Clinic B
```

**How it works:**
- System requirements at org level
- Texas state requirements at Texas WorkNode (but only one state, so could be at org level too)
- Facility requirements at each hospital
- Department requirements where needed (specialty institutes)

**Works well:** This is the simplest case and the model handles it easily.

---

### Stress Test Summary

| Scenario | Model Works? | Gaps/Additions Needed |
|----------|--------------|----------------------|
| Neven (MSP) | Mostly | WorkNode visibility across org subtree |
| Cera Care | Mostly | Jurisdiction field, requirement substitution |
| Sanctuary | Mostly | Package scoping to org within shared WorkNodes |
| Health Carousel | Mostly | Jurisdiction-qualified evidence |
| Ascension | Yes | - |
| Memorial Hermann | Yes | - |

### Proposed Model Additions ✅ INCORPORATED

> **Status:** All additions from stress testing have been incorporated into the main model above.

| Addition | Status | Location |
|----------|--------|----------|
| Jurisdiction on WorkNode | ✅ Done | `WorkNode.jurisdiction` |
| Jurisdiction on Evidence | ✅ Done | `Evidence.jurisdiction` |
| Jurisdiction rules on ComplianceElement | ✅ Done | `ComplianceElement.jurisdictions`, `excludeJurisdictions`, `jurisdictionRequired`, `substitutes` |
| WorkNode visibility | ✅ Done | `WorkNode.visibleToOrgIds` |
| Package scoping | ✅ Done | `AssignmentRule.orgScope` |

---

## Seed Data Strategy

For the playground, we'll create:

### Profiles (5-10 candidates)
- Sarah Thompson - Nearly complete, missing DBS, Monday start date
- James Wilson - Stuck for 2 weeks, unresponsive
- Emily Chen - Fully compliant, recently cleared
- Michael Brown - Just started, 30% complete
- Lisa Anderson - Has expiring document

### Placements
- Mix of single and multiple placements per candidate
- Different WorkNodes (NHS Trust A → St Mary's Hospital)
- Various start dates for urgency

### WorkNode Hierarchy (Example)
```
NHS Trust A (type: Trust)
├── St Mary's Hospital (type: Hospital)
│   ├── Ward A (type: Ward)
│   └── Ward B (type: Ward)
└── City General (type: Hospital)
```

### Compliance Setup
- Core Package (org-wide): DBS, RTW, ID
- Nursing Package (role): NMC, Clinical Competencies
- NHS Trust A Package (WorkNode): Trust Induction, Mandatory Training
- St Mary's Package (WorkNode): Fire Safety, Site Orientation

### Activity History
- 7 days of AI activity
- Emails sent, documents received, calls made
- Shows autonomous behaviour

### Escalations
- 2-3 pending items demonstrating different types

---

## Implementation Notes

### Repository Pattern

```
lib/data/
├── types.ts                   # All interfaces from this doc
├── repositories/
│   ├── organisations.ts       # getOrganisation(), getSettings()
│   ├── work-nodes.ts          # getWorkNode(), getWorkNodeAncestors()
│   ├── profiles.ts            # getProfile(), listProfiles()
│   ├── jobs.ts                # getJob(), listJobs() (ATS mode)
│   ├── applications.ts        # getApplication() (ATS mode)
│   ├── placements.ts          # getPlacement(), getPlacementsByProfile()
│   ├── pipelines.ts           # getPipeline(), getEntityStagePosition()
│   ├── packages.ts            # getPackage(), resolveRequirements()
│   ├── evidence.ts            # getEvidence(), createEvidence()
│   ├── activities.ts          # getActivities(), createActivity()
│   └── escalations.ts         # getEscalations(), resolveEscalation()
├── seed/                      # Demo data
│   └── ...
└── sources/
    ├── seed-source.ts         # Returns seed data
    └── api-source.ts          # Calls real Credentially API
```

### Toggle Mechanism

```ts
// lib/data/config.ts
export const dataSource = process.env.DATA_SOURCE === 'api' ? 'api' : 'seed';

// lib/data/repositories/profiles.ts
import { seedProfiles } from '../seed/profiles';
import { fetchProfilesFromApi } from '../sources/api-source';
import { dataSource } from '../config';

export async function listProfiles(): Promise<Profile[]> {
  if (dataSource === 'seed') {
    return seedProfiles;
  }
  return fetchProfilesFromApi();
}
```

---

## Ongoing Compliance Monitoring

The model supports not just initial onboarding, but ongoing compliance throughout a candidate's tenure.

### How Ongoing Compliance Works

| Mechanism | Model Support |
|-----------|---------------|
| **Expiry tracking** | `Evidence.expiryDate` stores when each item expires |
| **Expiry rules** | `ComplianceElement.expires` and `expiryMonths` define validity periods |
| **Re-verification cycles** | Scheduled jobs check `Evidence.expiryDate` against thresholds |
| **Renewal workflows** | When expiry approaches, AI Companion triggers renewal chase |
| **Status updates** | `Evidence.status` transitions: `fulfilled` → `expiring_soon` → `expired` |

### Expiry-Driven Actions

```
Evidence approaching expiry (e.g., 90 days out)
  ↓
P005 Event triggers (scheduled job)
  ↓
P021 AI Agent evaluates context
  ↓
P009 Notification sent to candidate
  ↓
Candidate provides renewal → new Evidence created
  ↓
Old Evidence archived, new Evidence tracked
```

### Key Scenarios

| Scenario | Trigger | Action |
|----------|---------|--------|
| DBS expiring in 90 days | Scheduled check | Chase candidate for DBS Update Service check |
| NMC registration lapsed | External integration check | Escalate to compliance team |
| Mandatory training due | Annual refresh cycle | Prompt candidate to re-complete |
| Passport expired | Document expiry date | Block placements until renewed |

### Compliance Status Rollup

The model tracks compliance at multiple levels:
- **Evidence level** - Individual item status
- **Placement level** - `complianceStatus`, `compliancePercentage`, `gaps`
- **Profile level** - `overallStatus` across all placements

This enables dashboards showing "candidates with expiring items this month" or "placements at risk".

---

## Future Ideas

### AI Regulatory & Policy Monitoring

> **Status:** Future exploration for playground

**Concept:** AI that monitors external websites and sources for regulatory or policy changes, then highlights important changes to organisations.

**Use Cases:**
- NMC updates registration requirements → flag to orgs employing nurses
- CQC publishes new inspection criteria → alert affected care providers
- NHS England changes mandatory training requirements → notify relevant trusts
- Home Office updates Right to Work rules → system-wide alert

**How it could work:**
1. Configure sources to monitor (regulatory body websites, policy feeds)
2. AI periodically scans for changes
3. AI evaluates relevance to each organisation's profile
4. Relevant changes surface as notifications/alerts
5. Org admin reviews and decides action (update packages, chase renewals, etc.)

**Value:** Proactive compliance - organisations stay ahead of regulatory changes rather than reacting after the fact.

---

## Next Steps

1. [x] ~~Finalise answers to open questions~~ → See Design Decisions section
2. [ ] Review model with team for feedback
3. [ ] Define complete seed data set (WorkNodes, pipelines)
4. [ ] Implement types in `lib/data/types.ts`
5. [ ] Build repository layer
6. [ ] Create seed data
7. [ ] Build UI components

---

## Changelog

- **2025-12-28** (update): Added:
  - Ongoing Compliance Monitoring section
  - Future Ideas section with AI Regulatory Monitoring concept
  - Clarified ATS as extensibility path (entities added when needed)
- **2025-12-28**: Major revision incorporating:
  - WorkNode consolidation (replaces Client/Facility/OrgUnit)
  - WorkNodeType for user-defined hierarchy levels
  - Job and Application entities for ATS expansion path
  - Pipeline entities for configurable journey management
  - Data ownership flexibility (candidate vs organisation)
  - Deep localisation via OrgSettings.terminology
  - Jurisdiction handling on WorkNode, Evidence, and ComplianceElement
  - Custom fields placeholders on all entities
  - Source tracking on Evidence
  - Updated requirement resolution to use WorkNode and Job
  - Incorporated all stress test findings into main model
- **2025-12-27**: Initial draft from conversation
