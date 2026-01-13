# Seed Data Architecture Plan

## Overview

Redesign the seed script to support repeatable, tailored demo data that can be refreshed without losing user associations. Each organisation represents a distinct market segment with compelling, realistic data.

## Goals

1. **Upsert orgs** - Update existing orgs rather than skipping them
2. **Preserve user links** - Keep org memberships and real auth users intact
3. **Cascade refresh** - Clear and reseed org-specific data cleanly
4. **Auto-assign admin** - Configure admin email(s) in seed, assign automatically
5. **Rich tailored data** - Each org tells a distinct story for its audience

## Seed Sequence

```
For each org config:
1. UPSERT organisation
   - If exists: UPDATE name, description, settings
   - If new: INSERT
   - Preserve: org ID, user memberships

2. CLEAR cascade (order matters for FK constraints)
   - activities (references profiles, placements)
   - escalations (references profiles)
   - entity_stage_positions (references profiles)
   - tasks (references profiles)
   - evidence (references placements, profiles)
   - placements (references profiles, work_nodes)
   - profiles (references organisations)
   - package_elements (references packages, compliance_elements)
   - compliance_packages (references organisations)
   - compliance_elements (references organisations)
   - work_nodes (references work_node_types)
   - work_node_types (references organisations)
   - pipelines (references organisations)
   - roles (references organisations) - except admin role

3. RESEED structure
   - work_node_types
   - work_nodes (with hierarchy)
   - roles (standard roles per market)
   - compliance_elements
   - compliance_packages
   - package_elements (link elements to packages)
   - pipelines + stages

4. RESEED candidates
   - profiles with varied compliance states
   - placements at work nodes
   - evidence (verified, pending, expired, missing)
   - activities (realistic timeline)
   - escalations (some open, some resolved)
   - pipeline positions

5. ASSIGN admin
   - Create/update membership for configured admin email(s)
   - Assign admin role
```

## Admin Configuration

```typescript
const ADMIN_EMAILS = [
  "hamish.irving@credentially.io",
];
```

These users get admin role on all orgs after seeding.

---

## Organisation Profiles

### 1. Meridian Healthcare (UK Agency)

**Audience:** NHS procurement teams, healthcare staffing buyers

**Story:** Large healthcare staffing agency placing nurses and HCAs across NHS trusts and private providers. High volume, compliance-critical.

| Attribute | Value |
|-----------|-------|
| Market | UK |
| Type | Agency |
| Terminology | Candidate, Booking |
| Description | UK Healthcare Staffing Agency |

**Work Structure:**
```
NHS Trust North
├── City General Hospital
│   ├── A&E Department
│   ├── Intensive Care Unit
│   └── Medical Assessment Unit
└── Community Hospital
    └── Rehabilitation Ward

NHS Trust South
├── Royal Hospital
│   ├── Surgical Ward
│   └── Paediatrics
└── District Hospital

Private Care Group
├── Sunrise Care Home
└── Oak Lodge Care Home
```

**Compliance Packages:**
- NHS Band 5 Nurse
- NHS Band 2 HCA
- Care Home Nurse
- Care Home HCA

**Candidate Mix (10 profiles):**
- 3 fully compliant, actively working
- 2 nearly compliant (1-2 items pending)
- 2 with expired documents
- 2 new starters (multiple items outstanding)
- 1 blocked (failed DBS or reference issue)

**AI Prompt Tone:** Professional, efficient, NHS-focused. Emphasise framework compliance, shift availability, competitive rates.

---

### 2. Oakwood Care Group (UK Domiciliary Care)

**Audience:** UK social care providers, domiciliary care operators, care home groups

**Story:** Family-run domiciliary and residential care provider. Employs carers directly to provide in-home care and runs care homes across England and Scotland. CQC regulated, person-centred approach.

| Attribute | Value |
|-----------|-------|
| Market | UK |
| Type | Direct Employer |
| Terminology | Carer, Placement |
| Description | UK Domiciliary & Residential Care Provider |

**Work Structure:**
```
England - North West
├── Manchester Domiciliary
├── Liverpool Domiciliary
└── Willow House (Residential)

England - South East
├── London Domiciliary
├── Kent Domiciliary
└── Oakwood Manor (Residential)

Scotland
├── Edinburgh Domiciliary
├── Glasgow Domiciliary
└── Heather Glen (Residential)
```

**Compliance Packages:**
- Domiciliary Carer
- Residential Carer
- Senior Carer
- Care Coordinator

**Candidate Mix (10 profiles):**
- 3 fully compliant senior carers
- 2 newly onboarded carers (training in progress)
- 2 with expiring mandatory training
- 2 awaiting DBS (can't start until cleared)
- 1 returning carer (gap in employment, needs refresh)

**Key Compliance Elements:**
- Enhanced DBS with Adults Barred List
- Right to Work
- Care Certificate (or working towards)
- Moving & Handling
- Medication Administration
- Safeguarding Adults Level 2
- First Aid
- Food Hygiene (residential)
- Two professional references

**AI Prompt Tone:** Warm, caring, personal. Family values, person-centred care, CQC excellence. "Our carers are the heart of what we do."

**Sample AI Prompt:**
```
You're writing on behalf of Oakwood Care Group, a family-run care provider delivering domiciliary and residential care across England and Scotland.

Tone: Warm, caring, and supportive. We're not a corporate - we're a family that genuinely cares about our team and the people we support.

Key messages:
- Person-centred care is everything
- Our carers make a real difference to people's lives
- CQC "Good" and "Outstanding" rated services
- Flexible shifts, supportive team, real career progression
- We invest in training and development

When chasing compliance items, be encouraging not demanding. Acknowledge that carers are busy. Offer help and support.

Sign off as: "The Oakwood Care Team"
```

---

### 3. TravelNurse Pro (US Agency)

**Audience:** US healthcare staffing companies, travel nursing agencies

**Story:** Premium travel nursing agency placing RNs and speciality nurses at top facilities across multiple states. High-paying assignments, comprehensive credentialing.

| Attribute | Value |
|-----------|-------|
| Market | US |
| Type | Agency |
| Terminology | Traveler, Assignment |
| Description | US Travel Nursing Agency |

**Work Structure:**
```
California
├── UCLA Medical Center
│   ├── Emergency Department
│   └── ICU
├── Cedars-Sinai Medical Center
└── Stanford Health

Texas
├── Houston Methodist
│   ├── Cardiovascular ICU
│   └── Neuro ICU
├── UT Southwestern
└── Baylor Scott & White

Florida
├── Tampa General Hospital
├── Baptist Health Miami
└── AdventHealth Orlando
```

**Compliance Packages:**
- Travel RN - California
- Travel RN - Texas
- Travel RN - Florida
- ICU Specialty
- ER Specialty
- L&D Specialty

**Candidate Mix (10 profiles):**
- 3 experienced travelers, multi-state licensed
- 2 first-time travelers (state license pending)
- 2 with expiring certifications (BLS/ACLS)
- 2 awaiting skills checklists
- 1 on assignment extension (compliance refresh needed)

**AI Prompt Tone:** Energetic, opportunity-focused. Highlight pay rates, location flexibility, adventure. Fast-track credentialing support.

---

### 4. Lakeside Health System (US Direct Employer)

**Audience:** US hospital systems, health system HR/credentialing teams

**Story:** Regional health system in Texas with multiple facilities. Direct employer focused on retention, internal mobility, and comprehensive onboarding.

| Attribute | Value |
|-----------|-------|
| Market | US |
| Type | Direct Employer |
| Terminology | Employee, Position |
| Description | Texas Regional Health System |

**Work Structure:**
```
Lakeside Medical Center (Flagship)
├── Emergency Services
├── Surgical Services
├── Critical Care
├── Medical/Surgical Units
└── Women's Services

Lakeside Community Hospital
├── General Medical
├── Outpatient Surgery
└── Rehabilitation

Lakeside Physician Group
├── Primary Care Clinics
├── Specialty Clinics
└── Urgent Care Centers
```

**Compliance Packages:**
- RN - Acute Care
- RN - Critical Care
- RN - Emergency
- Allied Health Professional
- Physician Assistant
- Medical Assistant

**Candidate Mix (10 profiles):**
- 3 long-tenured employees (annual renewal due)
- 2 new graduates (extensive onboarding)
- 2 internal transfers (credentialing for new unit)
- 2 PRN staff (minimal but current)
- 1 returning from leave (compliance gap)

**AI Prompt Tone:** Welcoming, supportive, career-focused. Emphasise benefits, growth opportunities, team culture. "Join the Lakeside family."

---

## Implementation Notes

### Candidate Data Richness

Each candidate should have:
- Realistic name and contact details
- Profile photo placeholder (initials)
- Job title and specialty
- Hire/start date
- Multiple compliance items in various states
- Activity history (emails sent, documents uploaded, etc.)
- At least one escalation (resolved or open)
- Pipeline position

### Activity Timeline

Generate realistic activity patterns:
- Application submitted
- Welcome email sent
- Documents requested
- Documents uploaded (some)
- Reminder emails (for pending items)
- Verification completed
- Escalation raised (if blocked)
- Placement confirmed

### Escalation Scenarios

- Expired DBS with no renewal submitted
- Reference not responding
- Training certificate unclear/illegible
- Right to work expiring soon
- Failed verification (needs manual review)

---

## File Structure

```
lib/db/seed/
├── index.ts              # Main orchestrator (redesigned)
├── db.ts                 # Database connection
├── clear.ts              # Clear functions (updated for cascade)
├── upsert-org.ts         # Upsert organisation logic
├── utils.ts              # Date/random helpers
├── admin.ts              # Admin assignment logic
├── markets/
│   ├── uk.ts             # UK compliance elements & packages
│   └── us.ts             # US compliance elements & packages
├── orgs/
│   ├── meridian.ts       # Meridian config + candidates
│   ├── oakwood.ts        # Oakwood config + candidates
│   ├── travelnurse.ts    # TravelNurse config + candidates
│   └── lakeside.ts       # Lakeside config + candidates
└── generators/
    ├── activities.ts     # Generate activity timeline
    ├── escalations.ts    # Generate escalations
    └── evidence.ts       # Generate evidence states
```

---

## Next Steps

1. Refactor seed/index.ts for upsert approach
2. Implement cascade clear per org
3. Create rich org configs in seed/orgs/
4. Build activity/escalation generators
5. Test full reseed cycle
6. Document in CLAUDE.md
