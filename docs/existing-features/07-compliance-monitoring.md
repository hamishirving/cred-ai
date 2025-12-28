# Section 8: Compliance Monitoring

**PDF Section:** 8. Compliance monitoring (p. 14-16)
**Feature Count:** 18 compliance monitoring features

---

## Overview

### CE-1: Track Multiple Compliance Status Levels
**Functionality:** The system tracks a number of compliance statuses at various levels

**Type:** Monitoring/Tracking (Multi-level)
**Levels:** 5 different status types (CE-2 to CE-6)

---

## Compliance Status Types

### CE-2: Compliance Requirement Fulfilment Status
**Functionality:**
- This is the status of each individual compliance requirement assigned to the candidate
- This status is displayed on the Staff Member > Dashboard page
- It can be fulfilled or not fulfilled

**Type:** Monitoring (Individual Item Level)
**User Facing:** Admin, Candidate
**Location:** Dashboard
**Values:** Fulfilled / Not Fulfilled

---

### CE-3: Compliance Requirements Package Percentage Status
**Functionality:**
- This is the percentage status of each compliance requirements package assigned to the candidate
- This status is displayed on the Staff Member > Dashboard page
- The status is calculated based on the compliance requirements configured within the package for the candidate (the same package can have different compliance requirements since administrators can customise default packages for candidates)
- The status is calculated regardless of whether the candidate is Signed Off or not

**Type:** Monitoring (Package Level - Aggregated)
**User Facing:** Admin, Candidate
**Location:** Dashboard
**Format:** Percentage
**Note:** Package contents can vary per candidate (per CR-20)

---

### CE-4: Candidate's Compliance Status
**Functionality:**
- This is the resulting compliance status of each candidate
- This status is displayed in the Staff Table and on the Administrator Panel in the candidate's profile
- The status is calculated based on the compliance requirements package status of each package assigned to the candidate

**Type:** Monitoring (Candidate Level - Rollup)
**User Facing:** Admin
**Location:** Staff Table, Admin Panel
**Calculation:** Aggregates all packages

---

### CE-5: Compliance Requirements Package's Overall Compliance Indicator
**Functionality:**
- This status displays how many of the Signed Off candidates assigned with the corresponding compliance requirements package have all of the compliance requirements from the package fulfilled
- Different candidates can have different compliance requirements in the package since administrators can customise default packages for candidates
- This status is displayed for the package on the Organisation Settings > Compliance Requirements page
- It is displayed as a percentage

**Type:** Monitoring (Package Level - Org-wide)
**User Facing:** Admin
**Location:** Organisation Settings
**Format:** Percentage
**Scope:** Only Signed Off candidates

---

### CE-6: Organisation's Overall Compliance Indicator
**Functionality:**
- This status displays how many of the Signed Off candidates have the Compliant compliance status
- This status is displayed in the top navigation menu
- The status is only displayed if the user's permissions allow seeing other staff members profile data
- It is displayed as a percentage

**Type:** Monitoring (Organisation Level - Top-level KPI)
**User Facing:** Admin
**Location:** Top navigation menu
**Format:** Percentage
**Scope:** Only Signed Off candidates
**Permission Required:** AP-1 or AP-2

---

## Visual Encoding

### CE-7: Percentage Color Encoding
**Functionality:** For those statuses that are displayed as a percentage, the system applies the following colour encoding:
- Red if 0% <= Completeness Percentage < 50%
- Yellow if 50% <= Completeness Percentage < 70%
- Green if 70% <= Completeness Percentage <= 100%

**Type:** Visualization
**User Facing:** All users
**Purpose:** Quick visual status assessment

---

## Compliance Calculation Logic

### CE-8: Compliance Calculation Workflow
**Functionality:** Compliance calculation works as follows:
1. Trigger event initiates compliance recalculation.
2. The system recalculates the fulfilment status of the candidate's compliance requirement(s).
3. Fulfilment status of the candidate's compliance requirement(s) affects:
   - The percentage status of the compliance requirements package assigned to the candidate
   - The candidate's compliance status and system tags
   - The compliance requirements package's overall compliance indicator
4. Candidate's compliance status affects the organisation's overall compliance indicator

**Type:** System Logic (Reactive)
**Trigger:** Events
**Cascade:** Individual → Package → Candidate → Org

---

## Requirement-Specific Compliance Rules

### CE-9: Document Type Compliance Rule
**Functionality:** The system marks the Document Type compliance requirement is fulfilled when the active version of the corresponding document has one of the document statuses that the administrator configured to be compliant

**Type:** Compliance Logic (Documents)
**Configurable:** Yes (admin defines which statuses = compliant)

---

### CE-10: Document Update Triggers Recalculation
**Functionality:** The system immediately recalculates the compliance status of the candidate in case of an update to the mandatory documents (e.g. document expires, new version uploaded, etc.)

**Type:** Reactive Calculation (Real-time)
**Triggers:** Document expiry, new version, status change

---

### CE-11: Reference Form Compliance Rule
**Functionality:** The system marks the Reference Form compliance requirement is fulfilled when the necessary number of the corresponding reference forms configured by the administrator is approved

**Type:** Compliance Logic (References)
**Threshold:** Based on CR-17 (Minimum References Required)

---

### CE-12: Reference Update Triggers Recalculation
**Functionality:** The system immediately recalculates the compliance status of the candidate in case of an update to the assigned reference (e.g. reference was declined by the administrator or reference expired)

**Type:** Reactive Calculation (Real-time)
**Triggers:** Reference declined, expired, approved

---

### CE-13: Checks Compliance Rule
**Functionality:** The system marks the Checks compliance requirement is fulfilled when a positive result is received from the corresponding integration:
- UK General Medical Council (GMC)
- NHS England National Performers List
- UK Health & Care Professionals Council (HCPC)
- The Nursing and Midwifery Council (NMC)
- DBS Update Service Check [England & Wales]

**Type:** Compliance Logic (Integrations)
**Integrations:** 5 professional body checks
**Result:** Positive = fulfilled

---

### CE-14: Integration Update Triggers Recalculation
**Functionality:** The system immediately recalculates the compliance status of the candidate in case of an update received from the vendor for the assigned check

**Type:** Reactive Calculation (Real-time)
**Trigger:** Vendor webhook/polling update

---

### CE-15: Professional Registration Check Frequency
**Functionality:** The system performs professional registration checks with the following frequency:
- GMC check: every day (displays check date, status)
- HCPC check: weekly (displays check date, status)
- NMC check: weekly (displays check date, qualification, and status)

Additional registration checks, for example the RCCP, can be collected from the candidate and manually checked

**Type:** Scheduled Polling (Integration)
**Automation:** Automatic background checks
**Frequency:** Daily (GMC), Weekly (HCPC, NMC)
**Manual Checks:** RCCP and others

**NOTE:** This is POLLING ENGINE primitive (P013)

---

### CE-16: Right to Work Compliance Rule
**Functionality:** The system marks the Right to Work compliance requirement as fulfilled when approved by the Administrator.

**Type:** Compliance Logic (Manual Approval)
**Trigger:** Admin approval action

---

### CE-17: Other Compliance Requirement Rule
**Functionality:** The system marks the Other Compliance Requirement as either fulfilled or not fulfilled when the Administrator manually changes its status.

**Type:** Compliance Logic (Manual)
**Trigger:** Admin manual status change

---

### CE-18: Other Compliance Update Triggers Recalculation
**Functionality:** The system immediately recalculates the compliance status of the candidate in case of any manual changes to the Other Compliance Requirement status

**Type:** Reactive Calculation (Real-time)
**Trigger:** Admin manual status change

---

## Summary

**Total Features:** 18

**Categories:**
- **Status Types:** 5 (CE-2 to CE-6)
- **Visualization:** 1 (CE-7)
- **Calculation Logic:** 1 (CE-8)
- **Document Compliance:** 2 (CE-9, CE-10)
- **Reference Compliance:** 2 (CE-11, CE-12)
- **Integration Compliance:** 3 (CE-13, CE-14, CE-15)
- **Manual Compliance:** 3 (CE-16, CE-17, CE-18)

**Compliance Hierarchy (5 Levels):**
1. **Individual Requirement** (CE-2) → Fulfilled / Not Fulfilled
2. **Package** (CE-3) → Percentage per candidate
3. **Candidate** (CE-4) → Overall candidate status
4. **Package (Org-wide)** (CE-5) → % of signed-off candidates compliant with package
5. **Organisation** (CE-6) → % of signed-off candidates fully compliant

**Real-time Recalculation Triggers:**
- Document expires/uploaded (CE-10)
- Reference approved/declined/expired (CE-12)
- Integration check updated (CE-14)
- Other compliance status changed (CE-18)

**Scheduled Operations:**
- **GMC check:** Daily
- **HCPC check:** Weekly
- **NMC check:** Weekly

**Manual Checks:**
- Right to Work (CE-16)
- Other Compliance Requirements (CE-17)
- RCCP and additional registrations (CE-15)

**Primitive Mapping:**
- **CE-1 to CE-8 = Complex dashboard/monitoring** - Not a single primitive, composition
- **CE-9 to CE-18 = P002 (Entity Lifecycle)** + **P005 (Events)** - State transitions trigger recalculations
- **CE-15 = P013 (Polling Engine)** - Scheduled integration checks
- **CE-7 = P018 (Dashboard)** - Visual encoding
- **CE-6 = P018 (Dashboard)** - Org-level KPI display

**Implementation Notes:**
- **Event-driven architecture:** All compliance changes trigger cascading recalculations
- **Configurable thresholds:** Admin defines what "compliant" means per document type (CE-9)
- **Per-candidate package variation:** Same package can have different requirements (affects CE-3, CE-5)
- **Signed Off gate:** Org-level metrics only count Signed Off candidates (CE-5, CE-6)
