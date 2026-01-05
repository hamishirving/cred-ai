# Data Model: Credentially 2.0 Playground

**Status:** Draft - In Discussion
**Last Updated:** 2026-01-04

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

### D4: Skills via Compliance Elements (Micro-Credentialling)

**Decision:** Skills are granted by compliant ComplianceElements, not tracked separately.

**Rationale:** The platform already tracks training certificates, competency assessments, and professional registrations as compliance elements. Rather than duplicating this data, skills are a *lens* on compliance data. When a candidate completes a training element, they gain the associated skill.

**Use Case:** Micro-credentialling for workforce allocation. NHS and other healthcare systems need granular understanding of candidate skills (procedures, equipment, environments) to optimise workforce allocation. Rostering systems can query Credentially for candidates with specific skill profiles.

**Implementation:**
- ComplianceElement can optionally grant skills via `grantsSkillIds`
- CandidateSkill links to the ComplianceElement that evidences it
- Skill taxonomies support standard frameworks (UK Core Skills Training Framework) as templates
- Orgs can customise/extend taxonomies
- Future: SkillRequirement on jobs/shifts for matching

### D5: Unified User Model (Identity vs Permissions vs Compliance)

**Decision:** Separate authentication, identity, authorisation, and compliance into distinct entities.

**Rationale:** The system needs to support:
- Admin users who don't need compliance tracking (IT staff)
- Candidates who only need compliance tracking (agency nurses)
- Staff who need BOTH permissions AND compliance (clinical compliance managers)
- Passport model where one person works with multiple organisations
- Different permission levels at different organisations

**Implementation:**

```
auth.users (Supabase)
    ↓ (1:1)
User (global identity)
    ↓ (1:many)
OrgMembership (per-org: role + optional compliance)
    ↓ (1:1, optional)
Profile (compliance data if needed)
```

| Layer | Entity | Purpose |
|-------|--------|---------|
| Authentication | auth.users | Supabase handles login/sessions |
| Identity | User | Who you are globally (email, name) |
| Authorisation | OrgMembership | What you can do, per organisation |
| Compliance | Profile | Your compliance data (if applicable) |

**Key principle:** UserRole determines **permissions** (what you can do). Profile existence determines **compliance requirements** (what you need). These are independent:

| Scenario | UserRole | Has Profile? |
|----------|----------|--------------|
| IT Admin | Admin | No |
| Agency Nurse | Candidate | Yes |
| Clinical Compliance Manager | ComplianceManager | Yes |
| Nurse promoted to Team Lead | TeamLead | Yes |

**Passport model:** One User can have OrgMemberships at multiple orgs. Candidate-owned evidence is portable across organisations.

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

Job roles/types within the organisation. Drives compliance requirements.

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

## Identity & Access Entities

### User

Global identity for a person using the system. Links to Supabase auth.

```ts
interface User {
  id: string;
  authUserId: string;          // Links to Supabase auth.users

  // Global identity
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;

  // Preferences (global, not org-specific)
  preferences?: {
    timezone?: string;
    locale?: string;
    notifications?: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };

  // Current context (which org they're viewing)
  currentOrgId?: string;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### OrgMembership

Links a User to an Organisation with a specific role. Optionally links to a Profile for compliance tracking.

```ts
interface OrgMembership {
  id: string;
  userId: string;              // Which User
  organisationId: string;      // Which Organisation
  userRoleId: string;          // Their permission role in this org

  // Optional link to Profile (if this person needs compliance tracking)
  profileId?: string;

  // Membership status
  status: 'invited' | 'active' | 'suspended' | 'archived';
  invitedAt?: string;
  joinedAt?: string;

  // Extensibility
  customFields?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}
```

**Key relationships:**
- User → OrgMembership: One-to-many (one person, multiple orgs)
- OrgMembership → UserRole: Many-to-one (defines permissions)
- OrgMembership → Profile: One-to-one optional (compliance data if needed)

**Examples:**

```ts
// IT Admin - no compliance requirements
{
  userId: 'user-123',
  organisationId: 'org-abc',
  userRoleId: 'role-admin',
  profileId: null,  // No compliance tracking
  status: 'active'
}

// Agency Nurse - candidate with compliance requirements
{
  userId: 'user-456',
  organisationId: 'org-abc',
  userRoleId: 'role-candidate',
  profileId: 'profile-789',  // Has compliance data
  status: 'active'
}

// Clinical Compliance Manager - admin WITH compliance requirements
{
  userId: 'user-789',
  organisationId: 'org-abc',
  userRoleId: 'role-compliance-manager',
  profileId: 'profile-012',  // They also need DBS, training, etc.
  status: 'active'
}

// Travel Nurse - same person at two agencies (passport model)
// Membership 1:
{
  userId: 'user-456',
  organisationId: 'org-agency-a',
  userRoleId: 'role-candidate',
  profileId: 'profile-a1',
  status: 'active'
}
// Membership 2:
{
  userId: 'user-456',
  organisationId: 'org-agency-b',
  userRoleId: 'role-candidate',
  profileId: 'profile-b1',  // Separate profile, but can share evidence
  status: 'active'
}
```

### UserRole

Permission roles within an organisation. Defines what users can do.

```ts
interface UserRole {
  id: string;
  organisationId: string;

  name: string;                // "Admin", "Compliance Officer", "Recruiter", "Candidate"
  slug: string;                // "admin", "compliance-officer"
  description?: string;

  // Permission strings
  // Format: "resource:action" or "resource:*" for all actions
  // Examples: "*" (superadmin), "profiles:*", "evidence:approve", "own:*"
  permissions: string[];

  // Whether this is the default role for new members
  isDefault: boolean;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Standard roles:**

| Role | Permissions | Typical Use |
|------|-------------|-------------|
| Admin | `["*"]` | Full system access |
| Compliance Manager | `["profiles:*", "evidence:*", "escalations:*"]` | Manage compliance |
| Recruiter | `["profiles:read", "profiles:create", "applications:*"]` | Manage candidates |
| Team Lead | `["profiles:read", "evidence:read", "team:*"]` | View team compliance |
| Candidate | `["own:*"]` | Manage own data only |

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

  // Skills granted when this element is compliant (micro-credentialling)
  grantsSkillIds?: string[];   // Links to Skill entities

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

### Profile

Compliance data for a person at an organisation. Created when someone needs compliance tracking (candidates, clinical staff, etc.).

**Important:** Profile is linked via OrgMembership, not directly to User. Personal identity (name, email) lives on User. Profile holds org-specific compliance data.

```ts
interface Profile {
  id: string;
  organisationId: string;

  // Denormalised from User for convenience (synced on change)
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;

  // Compliance-specific personal data
  dateOfBirth?: string;
  nationalId?: string;                    // NI number, SSN, etc.
  professionalRegistration?: string;       // NMC PIN, GMC number
  address?: Address;
  emergencyContact?: EmergencyContact;

  // Job context (which Role drives their compliance requirements)
  roleId?: string;

  // Candidate-scoped evidence (fulfilled items)
  // These apply to ALL placements for this profile
  evidence: Evidence[];

  // Computed: overall status across all placements
  overallStatus: 'compliant' | 'non_compliant' | 'pending';

  // Lifecycle
  status: 'invited' | 'onboarding' | 'active' | 'inactive' | 'archived';

  // Data ownership (for passport model)
  // Determines if evidence can be shared to other orgs
  dataOwnership: 'candidate' | 'organisation';

  // Extensibility
  customFields?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}
```

**Relationship to User:**
```
User (global identity)
    ↓
OrgMembership (per-org access)
    ↓
Profile (compliance data, if needed)
```

A person can have multiple Profiles (one per org they work with). Candidate-owned evidence can be shared across Profiles via the passport model.

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

## Skills & Micro-Credentialling Entities

Skills provide a granular view of candidate capabilities beyond simple compliance status. They enable workforce allocation systems (rostering) to match candidates to shifts, procedures, or work environments based on specific skills.

**Key Principle:** Skills are evidenced by compliance elements. When a candidate completes a training requirement or holds a certification, they gain the associated skills. Same data, different lens.

### SkillFramework

Standard skill taxonomies that can be used as templates. Orgs can adopt frameworks and customise.

```ts
interface SkillFramework {
  id: string;
  code: string;                    // "uk-cstf", "aus-ahpra", "us-ancc"
  name: string;                    // "UK Core Skills Training Framework"
  jurisdiction?: string;           // "uk", "australia", "us"
  isTemplate: boolean;             // true = system-provided template
  version?: string;                // Framework version
}
```

**Example Frameworks:**

| Code | Name | Jurisdiction |
|------|------|--------------|
| uk-cstf | UK Core Skills Training Framework | UK |
| uk-nhs-ksa | NHS Knowledge and Skills Framework | UK |
| us-ancc | ANCC Nursing Certifications | US |
| custom | Organisation Custom | Per-org |

### SkillCategory

Hierarchical groupings for skills. Can come from a framework or be org-defined.

```ts
interface SkillCategory {
  id: string;
  organisationId?: string;         // null = from framework template
  frameworkId?: string;            // Which framework this belongs to
  name: string;                    // "Clinical Skills", "Resuscitation", "Infection Control"
  parentId?: string;               // For nested categories
  order?: number;                  // Display order
}
```

**Example Hierarchy:**

```
Clinical Skills (category)
├── Resuscitation (category)
│   ├── Basic Life Support (skill)
│   ├── Immediate Life Support (skill)
│   └── Advanced Life Support (skill)
├── Medication Administration (category)
│   ├── Oral Medication (skill)
│   ├── IV Administration (skill)
│   └── Controlled Drugs (skill)
└── Wound Care (category)
    ├── Basic Wound Dressing (skill)
    └── Complex Wound Management (skill)
```

### Skill

Individual skill definitions within a category.

```ts
interface Skill {
  id: string;
  categoryId: string;
  organisationId?: string;         // null = from framework template
  code?: string;                   // Standard code if from framework
  name: string;                    // "IV Cannulation", "Tracheostomy Care"
  description?: string;

  // How is this skill verified?
  verificationType: 'evidence' | 'assessment' | 'self_declared' | 'attestation';

  // Proficiency levels (optional - most skills are binary)
  proficiencyLevels?: string[];    // ["Foundation", "Competent", "Expert"]

  // Expiry (skills can expire like compliance items)
  validityPeriod?: string;         // "P1Y" = 1 year, "P3Y" = 3 years

  isActive: boolean;
}
```

### CandidateSkill

Links a candidate to a skill, evidenced by a compliance element.

```ts
interface CandidateSkill {
  id: string;
  candidateId: string;
  skillId: string;

  // The compliance element that grants/evidences this skill
  complianceElementId: string;

  // Status derived from the compliance element
  // If element is compliant → skill is verified
  // If element expires → skill expires
  status: 'verified' | 'expired' | 'pending';

  // Optional enrichment
  proficiencyLevel?: string;       // If skill has levels
  context?: string[];              // ["paediatric", "emergency", "ICU"]

  // Temporal (derived from evidence)
  acquiredAt?: string;             // When the compliance element was fulfilled
  expiresAt?: string;              // When the compliance element expires

  // Portability (future - credential marketplace)
  sourceOrganisationId?: string;   // Who paid for/provided the training
  isPortable: boolean;             // Can be transferred to other orgs
  transferredAt?: string;          // When transferred (if applicable)
}
```

### CandidateExperience

Tracks environment/context experience. Can be derived from placements or explicitly declared.

```ts
interface CandidateExperience {
  id: string;
  candidateId: string;

  type: 'environment' | 'speciality' | 'procedure';
  name: string;                    // "Emergency Department", "Cardiac Surgery", "Ventilator Management"

  // Derived from placement history (future - rostering integration)
  derivedFromPlacementIds?: string[];

  // Experience metrics (for matching)
  recency?: string;                // Last worked in this context
  duration?: string;               // Total time in this context
  volume?: number;                 // Procedure count (if applicable)

  // Verification
  verificationStatus: 'unverified' | 'placement_derived' | 'reference_verified';
}
```

### SkillRequirement (Future)

For matching candidates to jobs/shifts based on required skills.

```ts
interface SkillRequirement {
  id: string;

  // What entity requires this skill?
  entityType: 'job' | 'shift' | 'procedure' | 'work_node';
  entityId: string;

  skillId: string;

  // Requirement level
  required: boolean;               // true = must have, false = preferred
  minimumProficiency?: string;     // If skill has levels

  // Context requirements
  contextRequired?: string[];      // Must have skill in specific context
  recencyRequired?: string;        // Must have used skill within timeframe
}
```

**Example: Matching a Shift to Candidates**

```ts
// ICU Night Shift at St Mary's requires:
const shiftRequirements: SkillRequirement[] = [
  { skillId: 'sk-ils', required: true },              // Immediate Life Support
  { skillId: 'sk-iv-admin', required: true },         // IV Administration
  { skillId: 'sk-ventilator', required: true },       // Ventilator Management
  { skillId: 'sk-tracheostomy', required: false },    // Tracheostomy (preferred)
];

// Query: Find candidates with all required skills
// Returns: Candidates ranked by skill match + experience recency
```

### Skill-Compliance Link Examples

| Compliance Element | Grants Skills |
|--------------------|---------------|
| BLS Training Certificate | Basic Life Support |
| ILS Training Certificate | Immediate Life Support, Basic Life Support |
| IV Cannulation Competency | IV Cannulation, IV Administration |
| NMC Registration | Registered Nurse (implies base clinical skills) |
| Ventilator Training | Ventilator Management |
| Trust Induction | (No skills - administrative compliance) |

**Note:** Not all compliance elements grant skills. Administrative requirements (inductions, contracts, declarations) typically don't. Skill-granting elements are primarily training, certifications, and competency assessments.

---

## Entity Descriptions

Summary of each entity's purpose and what it enables. Used for ERD tooltips and documentation.

### Tenant & Structure Domain

| Entity | Description | Purpose | Enables |
|--------|-------------|---------|---------|
| **Organisation** | Top-level tenant with settings and terminology | Multi-tenant isolation with hierarchy support | Parent-child orgs, inherited settings, custom terminology per org |
| **OrgSettings** | Configuration for an organisation | Centralised org-level settings | Data ownership defaults, terminology config, feature flags |
| **WorkNodeType** | User-defined hierarchy level type | Flexible location hierarchy | Customers define their own levels (Trust, Hospital, Ward, State, etc.) |
| **WorkNode** | Where work happens - unified location entity | Replace rigid Client/Facility/OrgUnit with flexible hierarchy | Customer-defined structures, jurisdiction-based compliance, multi-org visibility |
| **Role** | Job role/type within organisation | Role-based compliance requirements | Different requirements per role (Nurse vs HCA vs Doctor) |

### Compliance Domain

| Entity | Description | Purpose | Enables |
|--------|-------------|---------|---------|
| **ComplianceElement** | Definition of a compliance requirement | Define what needs to be fulfilled | Configurable requirements with scope, expiry, verification rules |
| **CompliancePackage** | Bundle of compliance elements | Group requirements together | Reusable requirement sets, assignment rules |
| **PackageElement** | Link between package and element | Package composition with overrides | Required vs optional elements, per-package configuration |
| **AssignmentRule** | When a package applies | Automatic package assignment | Role-based, location-based, job-based requirement assignment |

### Skills Domain

| Entity | Description | Purpose | Enables |
|--------|-------------|---------|---------|
| **SkillFramework** | Standard skill taxonomy template | Provide industry frameworks as starting point | UK Core Skills, NHS KSF, custom frameworks |
| **SkillCategory** | Hierarchical skill grouping | Organise skills into logical groups | Clinical Skills → Resuscitation → BLS/ILS/ALS |
| **Skill** | Individual skill definition | Define what capabilities to track | Granular skill tracking with verification type and expiry |
| **CandidateSkill** | Candidate's attained skill | Link candidate to skill via compliance evidence | Skill profiles for workforce matching |
| **CandidateExperience** | Environment/context experience | Track where candidate has worked | ER vs ICU vs Ward experience for matching |
| **SkillRequirement** | Skills required for job/shift | Define what skills are needed | Workforce matching, rostering integration |

### Identity & Access Domain

| Entity | Description | Purpose | Enables |
|--------|-------------|---------|---------|
| **User** | Global identity linked to auth | Who you are across all orgs | Single sign-on, global preferences, passport identity |
| **OrgMembership** | User's access to an organisation | Per-org permissions and profile link | Multi-org access, different roles per org, passport model |
| **UserRole** | Permission role within an organisation | What users can do | Admin, Compliance Manager, Recruiter, Candidate permissions |

### People Domain

| Entity | Description | Purpose | Enables |
|--------|-------------|---------|---------|
| **Profile** | Compliance data for a person at an org | Track compliance requirements and evidence | Candidate-scoped evidence, overall compliance status, passport sharing |

### Work Domain

| Entity | Description | Purpose | Enables |
|--------|-------------|---------|---------|
| **Job** | Position/opening to be filled | ATS-style job postings | Future CRM expansion, requirement preview at application time |
| **Application** | Candidate applying to a job | Track application journey | Pre-placement compliance, application pipeline |
| **Placement** | Active assignment for a candidate | Where and when someone is working | Placement-scoped compliance, location-specific requirements |

### Evidence Domain

| Entity | Description | Purpose | Enables |
|--------|-------------|---------|---------|
| **Evidence** | Proof that a requirement is fulfilled | Store documents, check results, attestations | Multi-source evidence, ownership tracking, jurisdiction support |
| **ComplianceGap** | Missing or problematic requirement | Computed gap analysis | Gap-driven AI chasing, clear action items |

### Journey Domain

| Entity | Description | Purpose | Enables |
|--------|-------------|---------|---------|
| **Pipeline** | Configurable multi-stage journey | Replace hardcoded status fields | Custom pipelines per entity type, stage ownership |
| **PipelineStage** | Single stage in a pipeline | Define journey steps | Stage ownership, auto-advance rules, SLAs |
| **EntityStagePosition** | Where an entity is in its pipeline | Track current position | Pipeline views, stage history |
| **StageTransition** | Record of a stage change | Audit trail for journey | History of who moved what, when, why |

### Operations Domain

| Entity | Description | Purpose | Enables |
|--------|-------------|---------|---------|
| **Activity** | Log of AI and human actions | Track what happened | Audit trail, AI transparency, candidate timeline |
| **Escalation** | Decision requiring human input | Route exceptions to humans | AI escalations, approval workflows, HITL |
| **EscalationOption** | Available action for an escalation | Present choices to human | Structured decision-making, recommendation highlighting |
| **Task** | Actionable items for staff | In-app task management for compliance teams | AI-generated tasks, chase reminders, expiry alerts, manual follow-ups |

---

## Relationship Descriptions

Key relationships between entities and what they enable.

### Organisation Relationships

| Relationship | From → To | Cardinality | Purpose |
|--------------|-----------|-------------|---------|
| Org hierarchy | Organisation → Organisation | Many-to-one | Parent-child orgs for multi-level tenancy |
| Org owns WorkNodeTypes | WorkNodeType → Organisation | Many-to-one | Each org defines their own hierarchy levels |
| Org owns WorkNodes | WorkNode → Organisation | Many-to-one | Locations belong to an org |
| Org owns Roles | Role → Organisation | Many-to-one | Job roles are org-specific |
| Org owns UserRoles | UserRole → Organisation | Many-to-one | Permission roles are org-specific |

### Identity & Access Relationships

| Relationship | From → To | Cardinality | Purpose |
|--------------|-----------|-------------|---------|
| User to auth | User → auth.users | One-to-one | Links to Supabase authentication |
| User memberships | OrgMembership → User | Many-to-one | One person can belong to multiple orgs |
| Membership org | OrgMembership → Organisation | Many-to-one | Which org this membership is for |
| Membership role | OrgMembership → UserRole | Many-to-one | What permissions they have in this org |
| Membership profile | OrgMembership → Profile | One-to-one (optional) | Links to compliance data if needed |
| User current org | User → Organisation | Many-to-one (optional) | Which org user is currently viewing |

### WorkNode Relationships

| Relationship | From → To | Cardinality | Purpose |
|--------------|-----------|-------------|---------|
| WorkNode type | WorkNode → WorkNodeType | Many-to-one | Defines what level this node is (Hospital, Ward, etc.) |
| WorkNode hierarchy | WorkNode → WorkNode | Many-to-one | Parent-child for location tree |
| Placement location | Placement → WorkNode | Many-to-one | Where the candidate is placed - drives compliance |
| Job location | Job → WorkNode | Many-to-one | Where the job is located - enables requirement preview |

### Compliance Relationships

| Relationship | From → To | Cardinality | Purpose |
|--------------|-----------|-------------|---------|
| Package contains elements | PackageElement → CompliancePackage | Many-to-one | Package composition |
| Element in package | PackageElement → ComplianceElement | Many-to-one | Which requirement is included |
| Evidence fulfils element | Evidence → ComplianceElement | Many-to-one | Proof of compliance |
| Evidence on profile | Evidence → Profile | Many-to-one | Candidate-scoped evidence |
| Evidence on placement | Evidence → Placement | Many-to-one | Placement-scoped evidence |
| Element grants skills | ComplianceElement → Skill | Many-to-many | Micro-credentialling link |

### Work Relationships

| Relationship | From → To | Cardinality | Purpose |
|--------------|-----------|-------------|---------|
| Placement for profile | Placement → Profile | Many-to-one | Which candidate is placed |
| Placement role | Placement → Role | Many-to-one | What role they're filling - drives requirements |
| Application for job | Application → Job | Many-to-one | Which job they applied to |
| Application by profile | Application → Profile | Many-to-one | Who is applying |
| Placement from application | Placement → Application | One-to-one | Link when application accepted |

### Skills Relationships

| Relationship | From → To | Cardinality | Purpose |
|--------------|-----------|-------------|---------|
| Skill in category | Skill → SkillCategory | Many-to-one | Organises skills hierarchically |
| Category in framework | SkillCategory → SkillFramework | Many-to-one | Links to standard framework |
| Candidate has skill | CandidateSkill → Profile | Many-to-one | Skill attribution |
| Skill evidenced by | CandidateSkill → ComplianceElement | Many-to-one | Compliance element proves skill |
| Skill definition | CandidateSkill → Skill | Many-to-one | Which skill they have |

### Pipeline Relationships

| Relationship | From → To | Cardinality | Purpose |
|--------------|-----------|-------------|---------|
| Pipeline for org | Pipeline → Organisation | Many-to-one | Org-specific pipelines |
| Stage in pipeline | PipelineStage → Pipeline | Many-to-one | Pipeline composition |
| Entity in pipeline | EntityStagePosition → Pipeline | Many-to-one | Which pipeline entity is in |
| Entity at stage | EntityStagePosition → PipelineStage | Many-to-one | Current position |

### Activity Relationships

| Relationship | From → To | Cardinality | Purpose |
|--------------|-----------|-------------|---------|
| Activity about profile | Activity → Profile | Many-to-one | Who the activity is about |
| Activity for placements | Activity → Placement | Many-to-many | Which placements drove this |
| Escalation about profile | Escalation → Profile | Many-to-one | Who the escalation concerns |
| Escalation for element | Escalation → ComplianceElement | Many-to-one | Which requirement triggered it |

### Task Relationships

| Relationship | From → To | Cardinality | Purpose |
|--------------|-----------|-------------|---------|
| Task for org | Task → Organisation | Many-to-one | Org that owns this task |
| Task subject | Task → Profile/Placement/Evidence/Escalation | Many-to-one (polymorphic) | What entity this task is about |
| Task assignee | Task → User | Many-to-one (optional) | Who is responsible for this task |

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

- **2026-01-04** (schema-sync): Synced documentation with current schema:
  - Added Task entity to Operations Domain (in-app task management for staff)
  - Added Task Relationships section
  - Verified Identity & Access entities (User, OrgMembership, UserRole) match schema
  - Removed outdated profiles → userRoleId relationship (now via OrgMembership)
- **2026-01-04** (user-model): Added unified User model (D5):
  - New entities: User, OrgMembership, UserRole
  - Separates authentication (auth.users), identity (User), authorisation (OrgMembership), and compliance (Profile)
  - Supports passport model: one User can have multiple OrgMemberships across orgs
  - Supports staff with compliance requirements (clinical managers with own DBS)
  - Updated Profile to be compliance-focused, linked via OrgMembership
  - Added Identity & Access Domain to entity descriptions and relationships
- **2025-12-28** (erd): Added documentation for ERD visualisation:
  - Entity Descriptions section with purpose and enables for each entity
  - Relationship Descriptions section with cardinality and purpose
- **2025-12-28** (skills): Added Skills & Micro-Credentialling:
  - Design decision D4: Skills via Compliance Elements
  - New entities: SkillFramework, SkillCategory, Skill, CandidateSkill, CandidateExperience
  - Future entity: SkillRequirement for workforce matching
  - Added grantsSkillIds to ComplianceElement
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
