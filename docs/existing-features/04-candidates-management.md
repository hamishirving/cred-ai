# Section 5: Candidates Management

**PDF Section:** 5. Candidates management (p. 9-10)
**Feature Count:** 11 candidate management features

---

## Features Extracted

### CM-1: Add New Candidates via Multiple Methods
**Functionality:** The system allows adding new candidates via the following methods:
- Credentially Public API
- Manually from UI
- Import CSV file
- Sign up self-service link (if enabled for the organisation)

**Type:** Create / Import
**User Facing:** Admin, Candidate (self-service), System (API)
**Channels:** 4

---

### CM-2: Sign Up and Login Methods
**Functionality:** The system allows signing up and logging in via the following methods:
- Email (magic link)
- SSO

**Type:** Authentication
**User Facing:** All users
**Methods:** 2
**Passwordless:** Yes (magic link)

---

### CM-3: Two-Factor Authentication
**Functionality:** The system allows enabling two factor authentication for the organisation

**Type:** Security / Authentication
**User Facing:** All users (enforced org-wide)
**Configurable:** Yes (org-level setting)

---

### CM-4: Archive Candidates
**Functionality:** The system allows archiving each candidate

**Type:** Lifecycle Management (State Transition)
**User Facing:** Admin
**Permission Required:** AP-16

---

### CM-5: Activate Candidates from Archive
**Functionality:** The system allows activating each candidate from the archive

**Type:** Lifecycle Management (State Transition)
**User Facing:** Admin
**Permission Required:** AP-17

---

### CM-6: View Candidates by Status
**Functionality:** The system allows the administrator to see active, invited, not invited, and archived candidates in Staff Table

**Type:** Filtering / View
**User Facing:** Admin
**Statuses:** 4 (active, invited, not invited, archived)

---

### CM-7: Assign Candidates to Administrators
**Functionality:** The system allows assigning each candidate to one or more administrators

**Type:** Assignment / Workload Distribution
**User Facing:** Admin
**Permission Required:** AP-15
**Cardinality:** Many-to-many (one candidate can have multiple admins)

---

### CM-8: Configure Staff Table Individually
**Functionality:** The system allows configuring Staff Table individually for each administrator

**Type:** Personalization / View Configuration
**User Facing:** Admin
**Scope:** Per-admin customization

---

### CM-9: Enable/Disable Staff Table Columns
**Functionality:** The system allows enabling or disabling the following Staff Table columns:
- Role
- Assigned to
- Groups
- Compliance Packages
- Compliance
- Tags
- Signed Off
- Active
- Phone Number
- User Tags
- Onboarding
- Onboarding Step
- Signed Documents
- Role Type
- Specialty
- City
- Postcode

**Type:** View Configuration
**User Facing:** Admin
**Configurable Columns:** 17

---

### CM-10: Reorder Staff Table Columns
**Functionality:** The system allows reordering Staff Table columns.

**Type:** View Configuration
**User Facing:** Admin

---

### CM-11: Export Candidates Data
**Functionality:** The system allows exporting candidates data

**Type:** Data Export
**User Facing:** Admin
**Permission Required:** AP-5, AP-6

---

## Summary

**Total Features:** 11

**Categories:**
- **Authentication:** 2 (CM-2, CM-3)
- **Creation/Import:** 1 (CM-1 - 4 methods)
- **Lifecycle Management:** 2 (CM-4, CM-5)
- **Assignment/Workload:** 1 (CM-7)
- **View Configuration:** 4 (CM-6, CM-8, CM-9, CM-10)
- **Export:** 1 (CM-11)

**Key Capabilities:**
- **Passwordless authentication** (magic link)
- **SSO support**
- **Multi-channel candidate creation** (UI, API, CSV, self-service)
- **Archive/activate** workflow (soft delete pattern)
- **Per-admin view customization**
- **Flexible column configuration** (17 columns)

**Primitive Mapping:**
- **CM-4, CM-5 = P002 (Entity Lifecycle States)** - Archive/active transitions
- **CM-1 (API) = P014 (Data Export & API Framework)** - API-first principle
- **CM-9, CM-10 = P018 (Dashboard & View Configuration)** - Personalized views
