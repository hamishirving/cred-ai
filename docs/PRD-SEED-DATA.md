# PRD: Multi-Market Seed Data

**Status:** Complete
**Created:** 2025-12-29
**Priority:** High

---

## Overview

Create comprehensive seed data for the Credentially 2.0 playground that demonstrates platform flexibility across different markets (UK and US) and organisation types. This is critical for demonstrating localisation capabilities and multi-market support to stakeholders and prospects.

---

## Goals

1. **Demonstrate market flexibility** - Show the same platform adapts to UK and US healthcare compliance
2. **Showcase org type variety** - Different hierarchies, compliance flows, and use cases
3. **Enable realistic demos** - Named candidates with believable compliance journeys
4. **Support AI demonstrations** - Rich activity history for AI to reference
5. **Validate data model** - Stress test the schema with real-world complexity

---

## Scope

### In Scope (V1)
- 2 UK organisations (Agency + Direct Employer)
- 2 US organisations (Travel Agency + Health System)
- 10-15 candidates per organisation with varied compliance states
- Realistic compliance packages per market
- 30-90 days of activity history
- Wipe and recreate approach (idempotent seed script)

### Future Scope (V2)
- All 6 stress test scenarios (Neven, Cera, Sanctuary, Health Carousel, Ascension, Memorial Hermann)
- Multi-org sharing scenarios (MSP visibility)
- Candidate transfers between orgs
- Larger candidate pools (50+ per org)

---

## Market Configurations

### UK Market

**Regulatory Context:**
- DBS (Disclosure & Barring Service) - criminal record checks
- NMC (Nursing & Midwifery Council) - nurse registration
- GMC (General Medical Council) - doctor registration
- HCPC (Health & Care Professions Council) - allied health
- Right to Work checks
- Mandatory training requirements
- CQC (Care Quality Commission) oversight

**UK Compliance Elements:**

| Element | Scope | Category | Expiry |
|---------|-------|----------|--------|
| Enhanced DBS | candidate | Identity | 3 years |
| Right to Work | candidate | Identity | Varies |
| Passport/ID | candidate | Identity | Document expiry |
| NMC Registration | candidate | Professional | Annual |
| GMC Registration | candidate | Professional | Annual |
| HCPC Registration | candidate | Professional | 2 years |
| Information Governance | candidate | Training | Annual |
| Fire Safety | candidate | Training | Annual |
| Manual Handling | candidate | Training | 3 years |
| Basic Life Support | candidate | Training | Annual |
| Safeguarding Adults | candidate | Training | 3 years |
| Safeguarding Children | candidate | Training | 3 years |
| Infection Control | candidate | Training | Annual |
| NHS Trust Induction | placement | Orientation | Per placement |
| Ward/Unit Orientation | placement | Orientation | Per placement |
| Employment References (x2) | candidate | Verification | One-time |

**Scotland Variations:**
- PVG (Protecting Vulnerable Groups) instead of DBS
- Some different mandatory training requirements

---

### US Market

**Regulatory Context:**
- State nursing licenses (50 states, varying requirements)
- Nurse Licensure Compact (NLC) - 41 member states
- Joint Commission accreditation
- Federal I-9 (employment eligibility)
- State-specific background checks
- Hospital credentialing requirements

**US Compliance Elements:**

| Element | Scope | Category | Expiry |
|---------|-------|----------|--------|
| State RN License | candidate | Professional | 2 years (varies) |
| Compact License (NLC) | candidate | Professional | 2 years |
| BLS Certification | candidate | Training | 2 years |
| ACLS Certification | candidate | Training | 2 years |
| PALS Certification | candidate | Training | 2 years |
| I-9 Verification | candidate | Identity | One-time |
| State Background Check | candidate | Identity | Per state |
| Federal Background Check | candidate | Identity | Annual |
| TB Test | candidate | Health | Annual |
| Immunisations (Hep B, Flu, etc.) | candidate | Health | Varies |
| Drug Screen | candidate | Health | Per assignment |
| Physical Examination | candidate | Health | Annual |
| Hospital Credentialing | placement | Orientation | Per facility |
| Unit Competency Assessment | placement | Orientation | Per unit |

**State License Complexity:**
- Compact states: One license valid in 41 states
- Non-compact states: Separate license required (CA, NY, etc.)
- State-specific requirements: California = BRN, Texas = BON

---

## Seed Organisations

### UK-1: Meridian Healthcare (Staffing Agency)

**Type:** Recruitment agency placing nurses and care workers

**Hierarchy:**
```
Meridian Healthcare (Organisation)
└── WorkNodes:
    ├── NHS Trust North
    │   ├── City Hospital
    │   │   ├── A&E
    │   │   ├── ICU
    │   │   └── Medical Ward
    │   └── Community Hospital
    ├── NHS Trust South
    │   └── General Hospital
    └── Private Care Group
        ├── Sunrise Care Home
        └── Oak Lodge Care Home
```

**Compliance Packages:**
- **Core Package** (all candidates): DBS, RTW, ID, Info Gov, Fire Safety
- **Nursing Package** (nurses): Core + NMC, BLS, Manual Handling
- **NHS Package** (NHS placements): Nursing + Trust Induction
- **Care Package** (care workers): Core + Care Certificate, Safeguarding

**Roles:** Band 5 Nurse, Band 6 Nurse, Healthcare Assistant, Care Worker

---

### UK-2: Oakwood Care (Direct Employer)

**Type:** Domiciliary care provider (direct employer)

**Hierarchy:**
```
Oakwood Care (Organisation)
└── WorkNodes (by region):
    ├── England North
    │   ├── Manchester Branch
    │   └── Leeds Branch
    ├── England South
    │   ├── London Branch
    │   └── Bristol Branch
    └── Scotland
        ├── Edinburgh Branch
        └── Glasgow Branch
```

**Compliance Packages:**
- **Core Package** (all): DBS/PVG, RTW, ID
- **Care Worker Package**: Core + Care Certificate, Mandatory Training
- **Senior Carer Package**: Care Worker + Medication, Supervision
- **Scotland Package** (Scotland branches): PVG instead of DBS

**Roles:** Care Worker, Senior Care Worker, Care Coordinator

**Key Feature:** Scotland branches use PVG instead of DBS (jurisdictional variation)

---

### US-1: TravelNurse Pro (Travel Nursing Agency)

**Type:** National travel nursing agency

**Hierarchy:**
```
TravelNurse Pro (Organisation)
└── WorkNodes (by state/facility):
    ├── California
    │   ├── UCLA Medical Center
    │   │   ├── Emergency Dept
    │   │   └── ICU
    │   └── Cedars-Sinai
    ├── Texas
    │   ├── Houston Methodist
    │   └── UT Southwestern
    └── Florida
        ├── Tampa General
        └── Baptist Health Miami
```

**Compliance Packages:**
- **Core Package** (all): I-9, Federal Background, BLS, TB Test
- **RN Package** (nurses): Core + State License, ACLS
- **ICU Package** (ICU assignments): RN + Ventilator Comp, Critical Care Cert
- **California Package** (CA assignments): Core + CA RN License, CA Background
- **Texas Package** (TX assignments): Core + TX RN License, TX Background

**Roles:** Travel RN, Travel ICU RN, Travel ER RN

**Key Feature:** Multi-state licensing requirements, compact vs non-compact states

---

### US-2: Lakeside Health System (Direct Employer)

**Type:** Regional hospital system in Texas

**Hierarchy:**
```
Lakeside Health System (Organisation)
└── WorkNodes:
    ├── Lakeside Medical Center (flagship)
    │   ├── Emergency Services
    │   ├── Surgical Services
    │   ├── Critical Care (ICU/CCU)
    │   └── Medical/Surgical Units
    ├── Lakeside Community Hospital
    │   └── General Care
    └── Lakeside Clinics
        ├── Downtown Clinic
        └── Suburban Clinic
```

**Compliance Packages:**
- **Core Package** (all): I-9, TX Background, TB, Immunisations, Drug Screen
- **Clinical Package** (clinical staff): Core + TX RN License, BLS
- **Acute Care Package** (hospital): Clinical + ACLS, Hospital Credentials
- **Critical Care Package** (ICU): Acute + PALS, Critical Care Cert

**Roles:** Staff Nurse, Charge Nurse, Clinical Nurse Specialist

**Key Feature:** Single-state, internal hierarchy, department-level requirements

---

## Seed Candidates

### Per Organisation: 10-15 candidates with varied states

**Compliance State Distribution:**
- 2-3 candidates: Fully compliant, active
- 3-4 candidates: Near complete (1-2 items missing)
- 2-3 candidates: In progress (multiple items pending)
- 1-2 candidates: Stuck/blocked (unresponsive or issues)
- 1-2 candidates: Expiring soon (documents due in 7-30 days)
- 1 candidate: Recently non-compliant (item just expired)

**Named Candidates (UK-1 Meridian Healthcare):**

| Name | Role | Status | Key State |
|------|------|--------|-----------|
| Sarah Thompson | Band 5 Nurse | Near Complete | Missing DBS, starts Monday |
| James Wilson | Band 5 Nurse | Stuck | Unresponsive 2 weeks, NMC expiring |
| Emily Chen | Band 6 Nurse | Compliant | Recently cleared, active placement |
| Mohammed Ali | HCA | In Progress | New starter, 40% complete |
| Lisa Anderson | Band 5 Nurse | Expiring | DBS expires in 12 days |
| David Brown | Care Worker | Compliant | Experienced, multiple placements |
| Rachel Green | Band 6 Nurse | In Progress | Transferred from another agency |
| Michael Taylor | HCA | Near Complete | Missing Fire Safety training |
| Sophie Williams | Band 5 Nurse | Stuck | Document rejected, needs resubmit |
| Thomas Harris | Care Worker | Compliant | Long-tenured, all docs current |

**Named Candidates (US-1 TravelNurse Pro):**

| Name | Role | Status | Key State |
|------|------|--------|-----------|
| Jennifer Martinez | Travel ICU RN | Compliant | Active in California |
| Robert Johnson | Travel ER RN | Near Complete | Needs Texas license |
| Amanda Davis | Travel RN | In Progress | New to travel nursing |
| Christopher Lee | Travel ICU RN | Expiring | BLS expires in 10 days |
| Michelle Garcia | Travel RN | Stuck | Background check delayed |
| Daniel Kim | Travel ER RN | Compliant | Multi-state licensed |
| Stephanie Brown | Travel RN | In Progress | Compact license pending |
| Kevin Thompson | Travel ICU RN | Near Complete | Missing hospital credentials |
| Lauren Wilson | Travel RN | Compliant | Highly experienced |
| Brian Anderson | Travel ER RN | Non-Compliant | ACLS just expired |

---

## Activity History

### Volume
- 30-90 days of activity per organisation
- 10-50 activities per candidate (varies by tenure)
- Mix of AI-generated and manual activities

### Activity Types

**Candidate Actions:**
- Document uploaded
- Document resubmitted
- Training completed
- Profile updated
- Application submitted

**AI Agent Actions:**
- Sent document reminder (email/SMS)
- Sent expiry warning
- Sent welcome message
- Answered candidate question
- Escalated to human

**Admin Actions:**
- Document approved
- Document rejected (with reason)
- Compliance verified
- Placement confirmed
- Note added

**System Events:**
- External check completed (NMC/GMC/DBS)
- Document expired
- Compliance status changed
- Pipeline stage changed

### Sample Activity Timeline (Sarah Thompson)

```
Day -45: Application received
Day -44: AI sent welcome email with requirements list
Day -43: Sarah uploaded passport
Day -42: Admin approved passport, Right to Work verified
Day -40: Sarah uploaded NMC certificate
Day -39: System verified NMC via integration (active)
Day -38: AI sent reminder for outstanding items
Day -35: Sarah completed Fire Safety training
Day -33: Sarah uploaded references
Day -30: Reference 1 verified
Day -28: Reference 2 verified
Day -25: AI sent DBS reminder
Day -20: AI sent second DBS reminder
Day -15: Sarah messaged: "DBS delayed by issuing authority"
Day -15: AI escalated: "Candidate response needs review"
Day -14: Admin reviewed, added note: "Awaiting DBS, provisional start approved"
Day -10: AI sent gentle follow-up re DBS
Day -5: Current - DBS still pending, start date Monday
```

---

## Implementation Approach

### Seed Script Structure

```
lib/db/seed/
├── index.ts              # Main entry point, orchestrates seeding
├── clear.ts              # Wipe all data (respects FK constraints)
├── markets/
│   ├── uk.ts             # UK compliance elements, packages
│   └── us.ts             # US compliance elements, packages
├── orgs/
│   ├── meridian.ts       # UK agency setup
│   ├── oakwood.ts        # UK direct employer setup
│   ├── travelnurse.ts    # US agency setup
│   └── lakeside.ts       # US health system setup
├── candidates/
│   ├── uk-candidates.ts  # UK candidate profiles
│   └── us-candidates.ts  # US candidate profiles
├── activities/
│   └── generator.ts      # Activity history generation
└── utils/
    ├── dates.ts          # Date calculations (expiries, etc.)
    └── random.ts         # Controlled randomisation
```

### Execution

```bash
# Full seed (wipe + recreate)
pnpm db:seed

# Seed specific org only
pnpm db:seed --org=meridian

# Seed with more candidates
pnpm db:seed --candidates=50

# Clear only (no reseed)
pnpm db:clear
```

### Idempotency

- Script always starts by clearing existing data
- Uses transactions to ensure atomicity
- Generates consistent IDs using deterministic seeds (e.g., `uuid5` from names)
- Safe to run repeatedly

---

## Technical Considerations

### Foreign Key Order

Seed in dependency order:
1. Organisations
2. WorkNodeTypes → WorkNodes
3. Roles
4. SkillFrameworks → SkillCategories → Skills
5. ComplianceElements → CompliancePackages → PackageElements
6. AssignmentRules
7. Profiles
8. Jobs → Applications → Placements
9. Evidence
10. Pipelines → PipelineStages → EntityStagePositions
11. Activities
12. Escalations → EscalationOptions

### Realistic Data Generation

**Names:** Use culturally appropriate names per market
**Dates:** Relative to current date (not hardcoded)
**Documents:**
- Some with expiry dates in past (expired)
- Some with expiry in 7-30 days (expiring soon)
- Some with expiry 6-12 months out (healthy)

**Compliance States:**
- Calculate dynamically based on evidence vs package requirements
- Ensure gaps table matches missing evidence

### Jurisdiction Handling

UK organisations:
- Most candidates: `jurisdiction: 'england'`
- Scottish branches: `jurisdiction: 'scotland'`
- Affects which elements apply (DBS vs PVG)

US organisations:
- Travel agency: Multiple jurisdictions per candidate
- Health system: `jurisdiction: 'texas'` for all

---

## Success Criteria

- [x] 4 organisations seeded (2 UK, 2 US)
- [x] Each org has 8-10 candidates with varied states
- [x] UK orgs have realistic UK compliance packages (18 elements, 6 packages)
- [x] US orgs have realistic US compliance packages (22 elements, 7 packages)
- [x] Scotland branch demonstrates jurisdictional variation (PVG vs DBS)
- [x] Multi-state licensing visible in US travel agency
- [x] Activity history per org (welcome emails, reminders, uploads)
- [x] Activity feed shows realistic AI + human interactions
- [x] Escalation queue has pending items for stuck candidates
- [x] Pipeline view shows candidates at different stages
- [x] Data model stress tested with real complexity
- [x] Seed script is idempotent (safe to re-run)

---

## Implementation Steps

### Phase 1: Foundation ✅
1. [x] Create seed script structure (`lib/db/seed/`)
2. [x] Implement clear/wipe functionality (`clear.ts`)
3. [x] Create date/random utilities (`utils.ts`)

### Phase 2: Markets ✅
4. [x] Define UK compliance elements (`markets/uk.ts` - 18 elements)
5. [x] Define US compliance elements (`markets/us.ts` - 22 elements)
6. [x] Create compliance packages per market (6 UK, 7 US)

### Phase 3: Organisations ✅
7. [x] Seed Meridian Healthcare (UK agency)
8. [x] Seed Oakwood Care (UK direct employer)
9. [x] Seed TravelNurse Pro (US agency)
10. [x] Seed Lakeside Health System (US direct employer)

### Phase 4: Candidates ✅
11. [x] Create UK candidate profiles with varied states (18 candidates)
12. [x] Create US candidate profiles with varied states (18 candidates)
13. [x] Generate evidence based on candidate state (604 records)

### Phase 5: Activity & History ✅
14. [x] Implement activity generator
15. [x] Create activity timelines per candidate (58 activities)
16. [x] Add pipeline positions and transitions

### Phase 6: Polish ✅
17. [x] Add escalations with pending decisions
18. [x] Verify compliance calculations
19. [x] Test full seed cycle (`pnpm db:seed`)
20. [x] Document seed process (`lib/db/CLAUDE.md`)

---

## Future Enhancements

- Add remaining 2 stress test orgs (Neven MSP, Sanctuary multi-brand)
- Cross-org candidate sharing (MSP visibility)
- Candidate transfers between markets
- Larger candidate pools for load testing
- Configurable seed profiles (demo vs stress test)
- Seed data versioning for reproducibility

---

## References

- [DATA_MODEL.md](./DATA_MODEL.md) - Entity definitions and relationships
- [PRD-PLAYGROUND.md](./PRD-PLAYGROUND.md) - Customer scenarios and stress tests
- [PRD-DATA-MODEL-ERD.md](./completed/PRD-DATA-MODEL-ERD.md) - Schema visualisation
