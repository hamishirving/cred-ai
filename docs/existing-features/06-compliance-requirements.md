# Section 7: Compliance Requirements Management

**PDF Section:** 7. Compliance requirements management (p. 11-14)
**Feature Count:** 22 compliance configuration features

---

## Document Types Configuration

### CR-1: Configure Document Types (Templates)
**Functionality:** The system allows configuring Document Types (document template)

**Type:** Configuration (Templates)
**User Facing:** Admin
**Purpose:** Define reusable document templates

---

### CR-2: Configure Document Type Parameters
**Functionality:** The system allows configuring the following Document Type parameters:
- Name
- Description
- Category
- Access by role
- Access restricted for profile owner

**Type:** Configuration (Access Control + Metadata)
**User Facing:** Admin
**Access Control:** Role-based + hide-from-owner

---

### CR-3: Automatic Document Field Extraction (AI/LLM)
**Functionality:** The system automatically extracts and fills in the following fields using LLM:
- Issue Date
- Expiry Date
- Document Number
- Document Type (automatic classification)

**Type:** AI/ML (Document Understanding)
**User Facing:** System (automatic), Candidate/Admin (sees results)
**Technology:** LLM-powered extraction
**Fields Extracted:** 4

**NOTE:** This is a CORE AI PRIMITIVE - Document Understanding & Validation

---

## Reference Forms Configuration

### CR-4: Configure Reference Forms (Templates)
**Functionality:** The system allows configuring Reference Forms (reference template)

**Type:** Configuration (Templates)
**User Facing:** Admin

---

### CR-5: Configure Reference Form Parameters
**Functionality:** The system allows configuring the following Reference Form parameters:
- Name
- Reference Business Rules (text description)
- Contact Requirements
- Whether reference form expires or not
- Description
- Questions (see CR-10)

**Type:** Configuration (Form Builder)
**User Facing:** Admin
**Advanced:** Expiry rules, business rules, dynamic questions

---

## Organisation Documents

### CR-6: Upload and Assign Organisation Documents
**Functionality:** The system allows uploading Organisation Documents and assigning them to all candidates who have a specific role or to an individual candidate

**Type:** Configuration (Document Distribution)
**User Facing:** Admin
**Assignment:** Role-based OR individual
**Use Cases:** Policy documents, contracts, agreements

---

### CR-7: Configure Organisation Document Parameters
**Functionality:** The system allows configuring the following parameters for each uploaded Organisation Document:
- Name
- Description
- Purpose (Signature required, download only)
- Roles the organisation document will be automatically added to for new candidates

**Type:** Configuration
**User Facing:** Admin
**Automation:** Auto-assignment to new candidates by role

---

## Questionnaires Configuration

### CR-8: Configure and Assign Questionnaires
**Functionality:** The system allows configuring Questionnaires and assigning them to all candidates who have a specific role (via Onboarding) or to an individual candidate

**Type:** Configuration (Form Builder)
**User Facing:** Admin
**Assignment:** Role-based (via onboarding) OR individual

---

### CR-9: Configure Questionnaire Parameters
**Functionality:** The system allows configuring the following Questionnaire parameters:
- Name
- Questions
- Access by role

**Type:** Configuration
**User Facing:** Admin
**Access Control:** Role-based

---

### CR-10: Configure Question Types
**Functionality:** The system allows configuring the following types of questions:
- Radio Button Group
- Rating Scale
- Checkboxes
- Dropdown
- Multi Select Dropdown
- Boolean
- Ranking
- Single Line Input
- Long Text
- Multiple Textboxes
- Single Select Matrix
- Multi Select Matrix
- Dynamic Matrix
- Draw a Signature
- File Upload

**Additional Capability:**
- **Conditions and logic builder:** The system allows configuring conditions for those questions.

**Type:** Configuration (Form Builder - Advanced)
**User Facing:** Admin (configures), Candidate (completes)
**Question Types:** 15
**Advanced Features:** Conditional logic, branching

**NOTE:** This is FORM BUILDER PRIMITIVE with conditional logic

---

### CR-11: Configure Other Compliance Requirements
**Functionality:** The system allows configuring Other Compliance Requirements

**Type:** Configuration (Catch-all)
**User Facing:** Admin
**Purpose:** Custom compliance items not fitting other categories

---

## Compliance Packages

### CR-13: Group Requirements into Packages
**Functionality:** The system allows grouping individual compliance requirements into compliance requirements packages. The system requires the administrator to specify Package Name.

**Type:** Configuration (Packaging/Grouping)
**User Facing:** Admin
**Purpose:** Bundle related requirements for roles

---

### CR-14: Auto-Assign Packages by Role
**Functionality:** The system allows the administrator to select the roles the compliance requirements package will be automatically added to for new candidates

**Type:** Configuration (Automation)
**User Facing:** Admin (configures), System (enforces)
**Trigger:** New candidate creation

---

### CR-15: Add Requirements to Package
**Functionality:** The system allows the administrator to add the following compliance requirements to the package:
- Document Types
- Reference Forms
- Checks:
  - UK General Medical Council (GMC)
  - NHS England National Performers List
  - UK Health & Care Professionals Council (HCPC)
  - The Nursing and Midwifery Council (NMC)
  - DBS Update Service Check [England & Wales]
  - Right to Work
- Other Compliance Requirements

**Type:** Configuration (Composition)
**User Facing:** Admin
**Supported Types:** Documents, References, Checks (6 integrations), Other
**Integration Count:** 6 professional/compliance checks

---

### CR-16: Assign Reference Form to Candidate
**Functionality:** The system allows assigning one reference form to a candidate

**Type:** Assignment
**User Facing:** Admin

---

### CR-17: Configure Minimum References Required
**Functionality:** The system requires the administrator to specify Minimum References Required number for Reference Form

**Type:** Configuration (Validation)
**User Facing:** Admin
**Purpose:** Compliance threshold

---

## Package Automation & Management

### CR-18: Auto-Assign Packages to New Candidates
**Functionality:** When a new candidate is added to the system, the system automatically assigns all of the compliance requirements packages where the Role configured for the package matches the candidate's selected role

**Type:** Automation
**User Facing:** System (automatic)
**Trigger:** Candidate creation
**Logic:** Role-based matching

---

### CR-19: Manually Assign/Remove Packages
**Functionality:** The system allows the administrator to manually assign a new compliance requirement package to the candidate or remove an existing one

**Type:** Manual Override
**User Facing:** Admin
**Purpose:** Exception handling

---

### CR-20: Manually Edit Assigned Package per Candidate
**Functionality:** The system allows the administrator to manually edit an assigned compliance requirement package for each candidate (i.e. override the default compliance requirements configured for the candidate's role)

**Type:** Manual Override (Granular)
**User Facing:** Admin
**Purpose:** Per-candidate customization
**Implication:** Same package can have different requirements for different candidates

---

### CR-21: Update Package and Auto-Apply to All Candidates
**Functionality:** The system allows the administrator to update an existing compliance requirements package and automatically apply the update to every candidate assigned with this package

**Type:** Bulk Update
**User Facing:** Admin
**Scope:** All candidates with package
**Warning:** Breaking change potential

---

### CR-22: View Package Update History
**Functionality:** The system allows the administrator to view the history of the updates made to any compliance requirements package

**Type:** Audit Trail
**User Facing:** Admin
**Scope:** Package versioning/history

---

## Configuration Notes

**7.2:** The following compliance requirements packages can be suggested to simplify the process:
- **Core Package:** Includes compliance requirements that apply to every candidate role (e.g. DBS, Information Governance, Colleague References)
- **Speciality Packages:** Includes compliance requirements that apply to specific specialities only (e.g. NMC for Nurses)

**7.3:** Document types will be configured upon request

**7.4:** Reference forms will be configured upon request

**7.5:** Other Compliance Requirements will be configured upon request

---

## Summary

**Total Features:** 22

**Categories:**
- **Document Types:** 3 (CR-1, CR-2, CR-3)
- **Reference Forms:** 3 (CR-4, CR-5, CR-16, CR-17)
- **Organisation Documents:** 2 (CR-6, CR-7)
- **Questionnaires:** 3 (CR-8, CR-9, CR-10)
- **Compliance Packages:** 8 (CR-13 to CR-22)
- **Other Requirements:** 1 (CR-11)

**AI/ML Features:**
- **CR-3: LLM-powered document field extraction** (Issue Date, Expiry Date, Document Number, Type classification)

**Form Builder Capabilities:**
- **15 question types** (CR-10)
- **Conditional logic builder** (CR-10)
- **Dynamic branching**

**Integration Checks Supported (CR-15):**
1. UK General Medical Council (GMC)
2. NHS England National Performers List
3. UK Health & Care Professionals Council (HCPC)
4. The Nursing and Midwifery Council (NMC)
5. DBS Update Service Check [England & Wales]
6. Right to Work

**Automation Features:**
- Auto-assign packages by role (CR-14, CR-18)
- Bulk update packages (CR-21)
- Package versioning/history (CR-22)

**Flexibility:**
- Per-candidate override (CR-20)
- Manual assignment (CR-19)
- Same package, different requirements per candidate

**Primitive Mapping:**
- **CR-1, CR-2 = P015 (Form/Template Builder)** - Document type templates
- **CR-3 = P019 (Document Understanding & Validation)** - AI field extraction
- **CR-4, CR-5, CR-16, CR-17 = P015 (Form Builder)** - Reference forms
- **CR-6, CR-7 = P006 (Scheduled Actions)** + P002 (Lifecycle) - Org document distribution
- **CR-8, CR-9, CR-10 = P015 (Form Builder)** + **P016 (Conditional Logic)** - Questionnaires with branching logic
- **CR-13 to CR-22 = Complex composition** - Package management is meta-configuration
- **CR-15 integrations = P011 (Connectors)** - 6 professional body checks

**Gap/Hardcoded Analysis:**
- **Document types configured upon request** (7.3) - Not fully self-service
- **Reference forms configured upon request** (7.4) - Not fully self-service
- **Other requirements configured upon request** (7.5) - Not fully self-service
- But templates CAN be created/configured once enabled (CR-1, CR-4)
