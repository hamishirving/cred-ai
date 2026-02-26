# First Advantage Demo Test Data

Test data for the Medsol technical deep dive. Three scenarios show different compliance states, deal types and FA package selections.

## Candidates

All three candidates are seeded into the TravelNurse Pro organisation.

### Scenario 1: Ashlyn Torres (New Clinician, Standard Deal)

| Field | Value |
|-------|-------|
| Name | Ashlyn Torres |
| Email | ashlyn.torres@email.com |
| DOB | 1995-06-12 |
| Location | Nashville, TN |
| Role | Travel ICU RN |
| Target State | Florida |
| Facility | Memorial Hospital Jacksonville |
| Deal Type | Standard |
| Professional Reg | Compact nursing license |

**Compliance state:** 40% complete (in_progress)

Has:
- Compact nursing license (valid)
- BLS certification
- ACLS certification
- PALS certification
- Health records (from Tennessee)

Missing:
- Federal background check
- Florida Level 2 background check (fingerprint)
- Florida RN license
- Drug screen
- Hospital credentialing
- Hospital orientation
- Unit competency

**FA package:** Package #1 (Standard). FACES sanctions screening bundled in every background package.

**Demo story:** First Florida placement for a new travel ICU nurse. Shows the full gap analysis with grouped requirements. FA handles the background screening, candidate provides the FL license, facility handles orientation.

### Scenario 2: Lexie Chen (Reassignment, Worker Passport)

| Field | Value |
|-------|-------|
| Name | Lexie Chen |
| Email | lexie.chen@email.com |
| DOB | 1990-03-28 |
| Location | Dallas, TX |
| Role | Travel RN |
| Target State | California |
| Facility | UCLA Medical Center |
| Deal Type | Reassignment |
| Professional Reg | Compact nursing license |

**Compliance state:** 90% complete (near_complete)

Carries forward from TX assignment:
- Federal background check (still current)
- Drug screen (still current)
- BLS certification
- ACLS certification
- Health records

Missing (CA-specific only):
- California RN license
- California DOJ LiveScan background check
- Hospital credentialing
- Hospital orientation
- Unit competency

**FA package:** Package #1 (Standard). Reassignment, but no lapse triggers.

**Demo story:** The worker passport in action. Most items carry forward from the Texas assignment. Only California-specific items and facility onboarding are needed. Shows the value of Credentially's intelligence layer knowing what carries forward vs what's state-specific.

### Scenario 3: Peter Walsh (Lapse Deal, Full Re-screening)

| Field | Value |
|-------|-------|
| Name | Peter Walsh |
| Email | peter.walsh@email.com |
| DOB | 1983-11-15 |
| Location | Jacksonville, FL |
| Role | Travel RN |
| Target State | Florida |
| Facility | Baptist Health Miami |
| Deal Type | Lapse |
| Professional Reg | FL nursing license (still current) |

**Compliance state:** Non-compliant (lapse, 6 months inactive)

Has (still current):
- FL nursing license

Missing (expired or never had):
- Federal background check (expired)
- Florida Level 2 background check (expired)
- Drug screen (expired)
- FACES sanctions screening
- Hospital credentialing
- Hospital orientation
- Unit competency

Expiring:
- BLS certification (expiring soon)
- TB test (expiring soon)

**FA package:** Package #2 (Standard + FACES sanctions). Tier-2 trigger: lapse deal. FACES covers 200+ sources including OIG, SAM, GSA, state exclusion lists and FDA debarment.

**Demo story:** The worst case. Inactive 6 months, everything has lapsed. Needs full re-screening including FACES sanctions package because lapse deals trigger tier-2 package selection. Shows Credentially's intelligence in auto-detecting package escalation.

### Scenario 4: Natasha Smith (Medsol Scorecard, Iowa Compact)

| Field | Value |
|-------|-------|
| Name | Natasha Smith |
| Email | natasha.smith@email.com |
| DOB | 1992-09-03 |
| Location | Des Moines, IA |
| Role | Travel RN |
| Target State | Iowa |
| Facility | UnityPoint Health Des Moines |
| Deal Type | Standard |
| Professional Reg | Compact nursing license |

**Compliance state:** 35% complete (in_progress)

Has:
- Compact nursing license (valid)
- BLS certification
- Driver's licence
- Social security card
- Background auth consent
- COVID vaccination

Missing:
- Federal background check
- State background check
- Drug screen
- TB test
- Physical examination
- MMR vaccination
- Varicella vaccination
- Hepatitis B vaccination
- TDAP vaccination
- Skills checklist
- Professional references
- Hospital credentialing
- Hospital orientation

**FA package:** Package #1 (Standard). Iowa is a compact state — no Iowa-specific package needed. FACES sanctions screening bundled in every background package.

**Expected packages:** federal-core + rn-package + hospital-package. No state-specific package (compact licence covers Iowa).

**Demo story:** Medsol scorecard candidate. First-time clinician with Medical Solutions. 13-week contract starting 3/22/2026. Shows the most common onboarding scenario — new clinician needing the full screening pipeline. Key demo moment: intelligent drug test ordering with 13-panel analyte matching (FA product code DHS90007).

## Agent Input Defaults

Pre-populated form values for each agent. The first scenario (Ashlyn Torres) is the default for all agents. The other scenarios can be run by changing the form values.

### Compliance Gap Analyzer

Default form values (Scenario 1):
- Candidate Search: `Ashlyn Torres`
- Target State: `florida`
- Facility Name: `Memorial Hospital Jacksonville`
- Role Name: `Travel ICU RN`
- Deal Type: `standard`

Scenario 2 (Lexie Chen):
- Candidate Search: `Lexie Chen`
- Target State: `california`
- Facility Name: `UCLA Medical Center`
- Role Name: `Travel RN`
- Deal Type: `reassignment`

Scenario 3 (Peter Walsh):
- Candidate Search: `Peter Walsh`
- Target State: `florida`
- Facility Name: `Baptist Health Miami`
- Role Name: `Travel RN`
- Deal Type: `lapse`

### Background Screening

Default form values (Scenario 1):
- Candidate Search: `Ashlyn Torres`
- Target State: `florida`
- Facility Name: `Memorial Hospital Jacksonville`
- Deal Type: `standard`

Scenario 2 (Lexie Chen):
- Candidate Search: `Lexie Chen`
- Target State: `california`
- Facility Name: `UCLA Medical Center`
- Deal Type: `reassignment`

Scenario 3 (Peter Walsh):
- Candidate Search: `Peter Walsh`
- Target State: `florida`
- Facility Name: `Baptist Health Miami`
- Deal Type: `lapse`

### Screening Status Monitor

Default form values:
- Screening ID: _(leave empty, retrieves from agent memory)_
- Candidate Search: `Ashlyn Torres`

This agent is designed to run after Background Screening has been executed. It looks up the screening ID from agent memory by candidate name. For the demo, run Background Screening first, then Screening Status Monitor with the same candidate name.

## Demo Flow

Recommended order for the Medsol deep dive:

1. **Gap Analyzer** with Ashlyn Torres (standard deal). Shows the grouped compliance analysis, structured output card, FA package recommendation.

2. **Background Screening** with Ashlyn Torres. Creates the FA candidate, selects Package #1, initiates screening. Real Sterling API call.

3. **Screening Status Monitor** with Ashlyn Torres. Checks the screening status, maps reportItems back to compliance elements.

4. **Gap Analyzer** with Peter Walsh (lapse deal). Shows the worst case, auto-escalation to Package #2 with FACES sanctions.

5. **Gap Analyzer** with Lexie Chen (reassignment). Shows worker passport carrying forward from TX, only CA-specific gaps.
