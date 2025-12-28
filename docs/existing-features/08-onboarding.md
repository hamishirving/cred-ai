# Section 9: Onboarding Management

**PDF Section:** 9. Onboarding management (p. 16-18)
**Feature Count:** 17 onboarding management features + 15 onboarding step types

---

## Onboarding Configuration Features

### OM-1: Display Onboarding Version Status
**Functionality:** The system displays information about the latest version of onboarding configuration being saved as draft OR published

**Type:** Configuration (Versioning)
**User Facing:** Admin
**States:** Draft / Published

---

### OM-2: Create New Onboarding
**Functionality:** The system allows the administrator to create a new onboarding

**Type:** Configuration (Create)
**User Facing:** Admin

---

### OM-3: Configure Custom Onboarding per Role
**Functionality:** The system allows the administrator to configure a custom onboarding process for each role

**Type:** Configuration (Role-based)
**User Facing:** Admin
**Scope:** Per-role customization

---

### OM-4: Add Multiple Onboarding Steps
**Functionality:** The system allows the administrator to add multiple onboarding steps

**Type:** Configuration (Composition)
**User Facing:** Admin

---

### OM-5: Add Child Steps and Group Them
**Functionality:** The system allows the administrator to add child steps to each onboarding step and group them together

**Type:** Configuration (Hierarchy)
**User Facing:** Admin
**Structure:** Parent-child step grouping

---

### OM-6: Rename Step Groups
**Functionality:** The system allows the administrator to rename step groups

**Type:** Configuration
**User Facing:** Admin

---

### OM-7: Reorder Steps and Step Groups
**Functionality:** The system allows the administrator to reorder steps and step groups

**Type:** Configuration (Sequencing)
**User Facing:** Admin

---

### OM-8: Delete Steps and Step Groups
**Functionality:** The system allows the administrator to delete steps and step groups

**Type:** Configuration
**User Facing:** Admin

---

### OM-9: Save Onboarding as Draft
**Functionality:** The system allows the administrator to save onboarding as draft if there is a difference between the current version of the onboarding and the version that was previously saved as draft or published

**Type:** Configuration (Versioning)
**User Facing:** Admin
**Purpose:** Work-in-progress save

---

### OM-10: Configure Strict Mode
**Functionality:** The system allows administrator to decide whether strict mode should apply to their onboarding or not

**Type:** Configuration (Enforcement)
**User Facing:** Admin
**Purpose:** Control whether candidates can exit onboarding wizard

---

### OM-11: Strict Mode Enforcement
**Functionality:** If Strict Mode is turned ON, the system does not allow the user to exit the Onboarding wizard

**Type:** Workflow Enforcement
**User Facing:** Candidate (enforced)
**Configurable:** Yes (OM-10)

---

### OM-12: Auto-Assign Onboarding to New Candidates
**Functionality:** The system automatically assigns the current onboarding version to the staff member if the following conditions are met:
- Onboarding is configured for the organisation AND
- The administrator doesn't skip the onboarding when adding or importing the staff member to the system AND
- The staff member successfully logged in to the system for the first time

**Type:** Automation
**User Facing:** System (automatic)
**Trigger:** First login
**Conditions:** 3

---

### OM-13: Onboarding Status Values
**Functionality:** The system supports the following onboarding statuses:
- Not applicable
- Not started
- In progress
- Completed
- Declined

**Type:** State Management
**Statuses:** 5

---

### OM-14: Admin Can Complete Steps/Onboarding
**Functionality:** The system allows the administrator to complete specific onboarding steps or the entire onboarding for the candidate

**Type:** Override/Assistance
**User Facing:** Admin
**Scope:** Individual steps OR entire onboarding

---

### OM-15: Manually Assign New Onboarding
**Functionality:** The system allows the administrator to assign a new onboarding to the staff member manually

**Type:** Manual Assignment
**User Facing:** Admin
**Purpose:** Re-onboarding or role change

---

### OM-16: Approve or Reject Candidate
**Functionality:** The system allows the administrator to approve or reject the candidate

**Type:** Workflow Action (Final)
**User Facing:** Admin
**Scope:** Approval gate

---

### OM-17: Display Assigned Administrators
**Functionality:** The system displays assigned administrators to the candidate passing the onboarding

**Type:** Visibility/Assignment
**User Facing:** Candidate
**Purpose:** Know who to contact for help

---

## Supported Onboarding Steps (15 Types)

### Step 1: Welcome Steps
**Multiple Steps per Onboarding:** No
**Ability to Add Child Steps:** Yes

**Type:** Informational
**Purpose:** Introduction, welcome message

---

### Step 2: Additional Information
**Multiple Steps per Onboarding:** Yes
**Ability to Add Child Steps:** Yes

**Type:** Data Collection
**Purpose:** Collect extra candidate information

---

### Step 3: Launch Webpage
**Multiple Steps per Onboarding:** Yes
**Ability to Add Child Steps:** Yes

**Type:** External Link
**Purpose:** Direct to external resource/training

---

### Step 4: Video Training
**Multiple Steps per Onboarding:** Yes
**Ability to Add Child Steps:** Yes

**Type:** Training
**Purpose:** Video-based learning

---

### Step 5: Document Upload
**Multiple Steps per Onboarding:** Yes
**Ability to Add Child Steps:** Yes

**Type:** Data Collection (Files)
**Purpose:** Collect candidate documents

---

### Step 6: Mandatory Document Upload
**Multiple Steps per Onboarding:** No
**Ability to Add Child Steps:** Yes

**Type:** Data Collection (Files - Required)
**Purpose:** Collect required compliance documents

---

### Step 7: Reference Check
**Multiple Steps per Onboarding:** No
**Ability to Add Child Steps:** Yes

**Type:** Compliance (External)
**Purpose:** Collect and verify references

---

### Step 8: DBS Check [England & Wales]
**Multiple Steps per Onboarding:** No
**Ability to Add Child Steps:** Yes

**Type:** Compliance (Integration)
**Purpose:** Trigger DBS application/check

---

### Step 9: Professional Registration Check
**Multiple Steps per Onboarding:** No
**Ability to Add Child Steps:** Yes

**Type:** Compliance (Integration)
**Purpose:** Verify professional credentials (GMC, NMC, HCPC)

---

### Step 10: Right to Work
**Multiple Steps per Onboarding:** No
**Ability to Add Child Steps:** Yes

**Type:** Compliance (Legal)
**Purpose:** Verify right to work in UK

---

### Step 11: Questionnaire
**Multiple Steps per Onboarding:** Yes
**Ability to Add Child Steps:** Yes

**Type:** Data Collection (Form)
**Purpose:** Collect structured responses

---

### Step 12: Read and Download Organisation's Documents
**Multiple Steps per Onboarding:** Yes
**Ability to Add Child Steps:** Yes

**Type:** Informational
**Purpose:** Share policies, handbooks

---

### Step 13: Sign Organisation's Documents
**Multiple Steps per Onboarding:** No
**Ability to Add Child Steps:** Yes

**Type:** Signature/Agreement
**Purpose:** E-sign contracts, policies

---

### Step 14: Staff Member's Approval
**Multiple Steps per Onboarding:** Yes
**Ability to Add Child Steps:** Yes

**Type:** Workflow Gate
**Purpose:** Admin review and approval

---

### Step 15: Profile Details
**Multiple Steps per Onboarding:** Yes
**Ability to Add Child Steps:** Yes

**Type:** Data Collection (Profile)
**Purpose:** Complete/update profile information

---

## Summary

**Total Features:** 32 (17 management + 15 step types)

**Configuration Features:**
- Versioning (draft/published) - OM-1, OM-9
- Per-role customization - OM-3
- Hierarchical steps (parent-child grouping) - OM-5
- Sequencing - OM-7
- Strict mode - OM-10, OM-11

**Automation:**
- Auto-assign on first login - OM-12
- Conditional assignment (skip option)

**Admin Controls:**
- Complete steps on behalf of candidate - OM-14
- Manual re-assignment - OM-15
- Approve/reject - OM-16

**Onboarding Step Types:** 15
- **Informational:** 3 (Welcome, Launch Webpage, Read Org Docs)
- **Data Collection:** 5 (Additional Info, Document Upload, Mandatory Docs, Questionnaire, Profile Details)
- **Training:** 1 (Video Training)
- **Compliance/Checks:** 4 (Reference, DBS, Professional Registration, RTW)
- **Signatures:** 1 (Sign Org Docs)
- **Workflow Gates:** 1 (Staff Approval)

**Reusable Steps:** 9 step types allow multiple instances per onboarding
**Single-instance Steps:** 6 step types (one per onboarding)

**Child Steps Capability:** All 15 step types support child steps (hierarchical)

**Primitive Mapping:**
- **OM-1 to OM-17 = P002 (Entity Lifecycle)** - Onboarding is a state machine with 5 states
- **OM-3 = P015 (Form Builder)** - Configurable per-role flows
- **OM-4 to OM-8 = P015 (Form Builder)** - Drag-drop step composition
- **OM-10, OM-11 = P007 (Rule Engine)** - Conditional enforcement
- **OM-12 = P005 (Events)** + P007 (Rules) - Event-driven auto-assignment
- **OM-13 = P002 (Entity Lifecycle)** - State values
- **OM-16 = P010 (Approval Workflows)** - Approval gate

**Step Type Primitive Mapping:**
- **Step 7, 8, 9, 10 = P011 (Connectors)** - Integration checks
- **Step 11 = P015 (Form Builder)** - Questionnaires
- **Step 13 = Signature capability** (not explicitly a primitive)
- **Step 14 = P010 (Approval Workflows)** - Review gate

**Implementation Status:**
- Highly configurable workflow builder
- Parent-child hierarchy support
- Version control (draft/published)
- Per-role customization
- Mix of informational, data collection, compliance, and approval steps
