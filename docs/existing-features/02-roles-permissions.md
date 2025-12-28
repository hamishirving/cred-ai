# Section 3: Roles and Permissions Management

**PDF Section:** 3. Roles and permissions management (p. 3-8)
**Feature Count:** 5 role management features + 63 granular admin permissions

---

## Role Management Features (R&P-1 to R&P-5)

### R&P-1: Specify Role Name
**Functionality:** The system requires the administrators to specify a role name.

**Type:** Configuration
**User Facing:** Admin
**Required:** Yes

---

### R&P-2: Specify Role Description
**Functionality:** The system allows the administrators to specify a role description.

**Type:** Configuration
**User Facing:** Admin
**Required:** Optional

---

### R&P-3: Select Role Type (Clinical/Non-clinical)
**Functionality:** The system requires the administrators to select a role type (Clinical/Non-clinical)

**Type:** Configuration
**User Facing:** Admin
**Required:** Yes

---

### R&P-4: Configure Administrative Permissions
**Functionality:** The system allows the administrators to configure whether the role should have administrative permissions

**Type:** Configuration / Access Control
**User Facing:** Admin
**Required:** Yes (boolean decision)

---

### R&P-5: Role Available for Sign Up
**Functionality:** The system allows the administrator to select whether the role is available for sign up

**Type:** Configuration
**User Facing:** Admin (affects candidate self-service)
**Required:** Yes (boolean decision)

---

## Configuration Notes

**3.2:** The candidate roles with no administrative permissions will be configured according to the customer's requests.

**3.3:** The default Administrator role with maximum permissions will be assigned to the user(s) who will be responsible for managing the organisation.

**3.4:** Additional administrative roles with different levels of access to the candidates data will be configured upon request.

---

## Admin Permissions (AP-1 to AP-63)

### All Staff

#### AP-1: View All Staff
**Functionality:**
- Enables other Manage Staff Member Profile permissions
- If organisation does not have restricted access groups, grants access to the list of **all** staff members and their profile data
- If organisation has at least one restricted access group, grants access to the **limited list** of staff members depending on the groups the administrator belongs to
- Grants access to the Organisation's Overall Compliance Indicator

**Type:** View Permission (Foundation)
**Scope:** Group-aware
**Dependencies:** GR-4 (group restrictions)

---

#### AP-2: View Staff Needing Approval
**Functionality:**
- Enables other Manage Staff Member Profile permissions
- If organisation does not have restricted access groups, grants access to the list of **all** staff members needing approval and their profile data
- If organisation has at least one restricted access group, grants access to the **limited list** of staff members depending on the groups the administrator belongs to
- Grants access to the Organisation's Overall Compliance Indicator

**Type:** View Permission (Filtered)
**Scope:** Group-aware, approval-focused
**Dependencies:** GR-4 (group restrictions)

---

### Import

#### AP-3: Import Staff Members from CSV
**Type:** Data Import
**Scope:** Bulk operation

---

#### AP-4: Import Staff Members' Documents
**Type:** Data Import
**Scope:** Bulk operation

---

### Export

#### AP-5: Export CSV with All Staff Members
**Type:** Data Export
**Scope:** Bulk operation

---

#### AP-6: Export All Staff Members' Profile Information
**Type:** Data Export
**Scope:** Bulk operation, detailed data

---

### Dashboard and Compliance Requirements

#### AP-7: View Staff Member's Compliance Requirements
**Type:** View Permission
**Scope:** Compliance-focused

---

#### AP-8: Edit Staff Member's Compliance Requirements
**Type:** Edit Permission
**Scope:** Compliance configuration

---

### User Tags

#### AP-9: View User Tags in Staff Member's Profile
**Type:** View Permission
**Scope:** Metadata

---

#### AP-10: Add and Delete User Tags in Staff Member's Profile
**Type:** Edit Permission
**Scope:** Metadata management

---

### Staff Member

#### AP-11: Add Staff Members to the Organisation
**Type:** Create Permission
**Scope:** User management

---

#### AP-12: Approve/Reject Staff Members at Approval Step
**Functionality:** Approve/reject staff members who are at the approval step of the onboarding

**Type:** Workflow Permission
**Scope:** Onboarding approval

---

#### AP-13: Remove Staff Members from the Organisation
**Type:** Delete Permission
**Scope:** User management

---

#### AP-14: Sign Off Staff Members
**Type:** Workflow Permission
**Scope:** Compliance certification

---

#### AP-15: Assign Staff Member to Administrators
**Type:** Assignment Permission
**Scope:** Access control / workload distribution

---

#### AP-16: Archive Staff Members
**Type:** State Management Permission
**Scope:** Lifecycle management

---

#### AP-17: Activate Staff Members
**Type:** State Management Permission
**Scope:** Lifecycle management (restore from archive)

---

### Notes

#### AP-18: View Notes in Staff Member's Profile
**Type:** View Permission
**Scope:** Collaboration

---

#### AP-19: Add and Delete Notes in Staff Member's Profile
**Type:** Edit Permission
**Scope:** Collaboration

---

### History

#### AP-20: View History of Staff Member's Events
**Type:** View Permission
**Scope:** Audit trail

---

### Events History

#### AP-21: View History of Sent Email Notifications
**Type:** View Permission
**Scope:** Notification tracking

---

### Profile Details

#### AP-22: View Profile Details
**Type:** View Permission
**Scope:** Personal data

---

#### AP-23: Edit Profile Details
**Type:** Edit Permission
**Scope:** Personal data management

---

#### AP-24: View/Edit Sensitive Details
**Type:** Edit Permission (Elevated)
**Scope:** Sensitive data (requires special permission)

---

#### AP-63: Download Sensitive Info
**Type:** Export Permission (Elevated)
**Scope:** Sensitive data download

---

### Documents

#### AP-25: View Documents in the Staff Member's Profile
**Type:** View Permission
**Scope:** Document management

---

#### AP-26: Upload Documents for the Staff Member
**Type:** Create Permission
**Scope:** Document management

---

#### AP-27: Delete Documents from the Staff Member's Profile
**Type:** Delete Permission
**Scope:** Document management

---

#### AP-28: Review Documents
**Type:** Workflow Permission
**Scope:** Document approval process

---

#### AP-29: Edit Documents
**Type:** Edit Permission
**Scope:** Document metadata

---

#### AP-30: Approve/Decline Documents
**Type:** Workflow Permission
**Scope:** Document approval

---

#### AP-31: Comment Documents
**Type:** Collaboration Permission
**Scope:** Document review

---

### Organisation's Documents

#### AP-32: View List of the Organisation's Documents
**Type:** View Permission
**Scope:** Org-level documents

---

#### AP-33: Review Organisation's Documents
**Type:** View Permission (Detailed)
**Scope:** Org-level documents

---

#### AP-34: Upload Personal Organisation's Documents
**Type:** Create Permission
**Scope:** Org-level document management

---

#### AP-35: Delete Uploaded Personal Organisation's Documents
**Type:** Delete Permission
**Scope:** Org-level document management

---

### Professional Registration

#### AP-36: View Professional Registration
**Type:** View Permission
**Scope:** Compliance - professional credentials

---

#### AP-37: Add/Edit/Verify Professional Registration Info
**Type:** Edit Permission
**Scope:** Compliance - credential management

---

#### AP-38: View Professional Registration History
**Type:** View Permission (Historical)
**Scope:** Audit trail - credentials

---

### References

#### AP-39: View References
**Type:** View Permission
**Scope:** Reference management

---

#### AP-40: View Reference Details (Form or File)
**Type:** View Permission (Detailed)
**Scope:** Reference content

---

#### AP-41: Request References
**Type:** Create Permission
**Scope:** Reference workflow initiation

---

#### AP-42: Upload References
**Type:** Create Permission
**Scope:** Reference management

---

#### AP-43: Delete References
**Type:** Delete Permission
**Scope:** Reference management

---

#### AP-44: Approve/Decline References
**Type:** Workflow Permission
**Scope:** Reference approval

---

### Questionnaires

#### AP-45: View List of the Questionnaires in the Staff Member's Profile
**Type:** View Permission
**Scope:** Questionnaire management

---

#### AP-46: Review Completed Questionnaires in the Staff Member's Profile
**Type:** View Permission (Detailed)
**Scope:** Questionnaire responses

---

#### AP-47: Complete Questionnaire
**Type:** Create Permission
**Scope:** Admin completing on behalf of candidate

---

### Onboarding

#### AP-48: View Onboarding
**Type:** View Permission
**Scope:** Onboarding status tracking

---

#### AP-49: Assign Onboarding
**Type:** Assignment Permission
**Scope:** Onboarding workflow management

---

#### AP-50: Complete Onboarding
**Type:** Workflow Permission
**Scope:** Admin completing on behalf of candidate

---

### Performers List

#### AP-51: View Performers List
**Type:** View Permission
**Scope:** Integration - NHS Performers List

---

#### AP-52: Check Performers List
**Type:** Action Permission
**Scope:** Integration - trigger check

---

#### AP-53: View Performers List History
**Type:** View Permission (Historical)
**Scope:** Audit trail - performers list

---

### DBS Update Service

#### AP-54: View DBS Check [England & Wales]
**Type:** View Permission
**Scope:** Integration - DBS compliance

---

#### AP-55: Edit DBS Check [England & Wales]
**Type:** Edit Permission
**Scope:** Integration - DBS data management

---

#### AP-56: View History of DBS Check [England & Wales]
**Type:** View Permission (Historical)
**Scope:** Audit trail - DBS

---

### DBS Application

#### AP-57: View DBS Application [England & Wales]
**Type:** View Permission
**Scope:** Integration - DBS application status

---

#### AP-58: View DBS Application Results [England & Wales]
**Type:** View Permission
**Scope:** Integration - DBS results

---

### Right to Work

#### AP-59: View Right to Work Info
**Type:** View Permission
**Scope:** Compliance - RTW

---

#### AP-60: Approve/Decline Staff Member's Right to Work
**Type:** Workflow Permission
**Scope:** Compliance - RTW approval

---

#### AP-61: Submit Right to Work Info
**Type:** Create Permission
**Scope:** Admin submitting on behalf of candidate

---

### Reports

#### AP-62: View Onboarding Dashboards
**Type:** View Permission
**Scope:** Analytics/BI

---

## Summary

**Total Features:** 68 (5 role management + 63 permissions)

**Permission Categories:**
- **View Permissions:** 20
- **Edit Permissions:** 11
- **Create Permissions:** 9
- **Delete Permissions:** 4
- **Workflow Permissions:** 10
- **Assignment Permissions:** 3
- **Import/Export:** 4
- **Collaboration:** 2
- **Elevated (Sensitive):** 2

**Key Patterns:**
- Group-aware permissions (AP-1, AP-2)
- Fine-grained permission model (separate view/edit/delete/approve)
- Sensitive data controls (AP-24, AP-63)
- Integration-specific permissions (Performers List, DBS, RTW)
