# Section 10: Notifications Management

**PDF Section:** 10. Notifications management (p. 18-21)
**Feature Count:** 49 notification types (26 candidate + 21 admin + 2 referee)

---

## Candidate Notifications (26 types)

### Login Process (3 notifications)

#### 1. Invite to Create a Profile
**Customisable:** Yes
**Trigger:** Admin invites candidate
**Purpose:** Initial invitation email

---

#### 2. Sign Up Link
**Customisable:** No
**Trigger:** Candidate requests sign up link
**Purpose:** Magic link for passwordless login

---

#### 3. Login Link
**Customisable:** No
**Trigger:** Candidate requests login
**Purpose:** Magic link authentication

---

### Onboarding (6 notifications)

#### 4. Approved Candidate Notification
**Customisable:** Yes
**Trigger:** Admin approves candidate at approval step
**Purpose:** Notify candidate of approval

---

#### 5. Approved Candidate on Last Step Notification
**Customisable:** Yes
**Trigger:** Admin approves candidate at final approval step
**Purpose:** Completion notification

---

#### 6. Denied Candidate Notification
**Customisable:** Yes
**Trigger:** Admin rejects candidate
**Purpose:** Rejection notification

---

#### 7. Denied Onboarding
**Customisable:** No
**Trigger:** Onboarding rejected
**Purpose:** System notification

---

#### 8. Pending Onboarding Reminder
**Customisable:** No
**Trigger:** Scheduled (onboarding incomplete for X days)
**Purpose:** Nudge to complete onboarding

---

#### 9. New Onboarding Assigned
**Customisable:** No
**Trigger:** Admin manually assigns onboarding
**Purpose:** Notify candidate of new onboarding

---

### Documents (6 notifications)

#### 10. Mandatory Document Expired
**Customisable:** No
**Trigger:** Document expiry date passed
**Purpose:** Alert candidate to non-compliance

---

#### 11. Non-Mandatory Document Expired
**Customisable:** No
**Trigger:** Document expiry date passed
**Purpose:** FYI notification

---

#### 12. Mandatory Document Expires Soon
**Customisable:** No
**Trigger:** X days before expiry
**Purpose:** Proactive renewal reminder

---

#### 13. Non-Mandatory Document Expires Soon
**Customisable:** Not required
**Trigger:** X days before expiry
**Purpose:** Optional renewal reminder

---

#### 14. Administrator Declined Candidate's Document
**Customisable:** No
**Trigger:** Admin rejects document
**Purpose:** Notify candidate to resubmit

---

#### 15. Mandatory Document Missing Reminder
**Customisable:** No
**Trigger:** Scheduled (document not uploaded for X days)
**Purpose:** Compliance reminder

---

### Organisation Documents (1 notification)

#### 16. Administrator Added New Organisation Document
**Customisable:** Yes
**Trigger:** Admin uploads org document and chooses to notify
**Purpose:** Notify candidate of new policy/document

---

### References (2 notifications)

#### 17. Referee Submitted Reference
**Customisable:** No
**Trigger:** Referee completes reference form
**Purpose:** Notify candidate of reference received

---

#### 18. Administrator Declined Reference
**Customisable:** No
**Trigger:** Admin rejects reference
**Purpose:** Notify candidate to request new reference

---

### Questionnaires (2 notifications)

#### 19. Administrator Assigned Questionnaire
**Customisable:** Yes
**Trigger:** Admin assigns questionnaire
**Purpose:** Notify candidate to complete

---

#### 20. Assigned Questionnaire Reminder
**Customisable:** Yes
**Trigger:** Scheduled (questionnaire incomplete for X days)
**Purpose:** Reminder to complete

---

### Right to Work (4 notifications)

#### 21. Administrator Declined Right to Work
**Customisable:** No
**Trigger:** Admin rejects RTW
**Purpose:** Notify candidate to resubmit

---

#### 22. Administrator Approved Right to Work
**Customisable:** No
**Trigger:** Admin approves RTW
**Purpose:** Confirmation notification

---

#### 23. Right to Work Expires Soon
**Customisable:** No
**Trigger:** X days before expiry
**Purpose:** Renewal reminder

---

#### 24. Right to Work Expired
**Customisable:** No
**Trigger:** Expiry date passed
**Purpose:** Non-compliance alert

---

### DBS (1 notification)

#### 25. DBS Application Failed
**Customisable:** No
**Trigger:** DBS check returned failure
**Purpose:** Alert candidate to issue

---

### Other (1 notification)

#### 26. Requested Data Export Ready
**Customisable:** No
**Trigger:** GDPR data export completed
**Purpose:** Download link notification

---

## Administrator Notifications (21 types)

### Login Process (3 notifications)

#### 1. Candidate Accepts Invitation
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** Candidate clicks invite link
**Purpose:** Notify admin that candidate engaged

---

#### 2. Candidate Declines Invitation
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** Candidate declines
**Purpose:** Notify admin of rejection

---

#### 3. New Candidate Signs Up
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** Self-service signup
**Purpose:** Notify admin of new candidate

---

### Candidates Management (2 notifications)

#### 4. New Candidate is Assigned
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** Candidate assigned to admin
**Purpose:** Workload notification

---

#### 5. Administrator Mentioned in a Note
**Opt-out or Send Only for Assigned:** No
**Trigger:** @mention in candidate note
**Purpose:** Collaboration notification

---

### Onboarding (2 notifications)

#### 6. Candidate Pending Approval
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** Candidate reaches approval step
**Purpose:** Action required notification

---

#### 7. Candidate Completed Onboarding
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** Onboarding status = Completed
**Purpose:** FYI notification

---

### Compliance Monitoring (1 notification)

#### 8. Compliant and Signed Off Candidate Becomes Non-Compliant
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** Compliance status change (Compliant → Non-compliant)
**Purpose:** Alert admin to issue

---

### Documents (2 notifications)

#### 9. Candidate Uploads New Version of Document
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** Candidate uploads document (expired, declined, expires soon, or missing)
**Purpose:** Review required notification

---

#### 10. Administrator Mentioned in Document Comment
**Opt-out or Send Only for Assigned:** No
**Trigger:** @mention in document comment
**Purpose:** Collaboration notification

---

### References (3 notifications)

#### 11. Referee Submitted Reference
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** Referee completes form
**Purpose:** Review required notification

---

#### 12. Candidate's Reference Response Expired
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** Reference expiry date passed
**Purpose:** Alert admin to request new reference

---

#### 13. Candidate's Reference Response Expires Soon
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** X days before reference expiry
**Purpose:** Proactive reminder

---

### Right to Work (3 notifications)

#### 14. Right to Work on Review
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** Candidate submits RTW
**Purpose:** Review required notification

---

#### 15. Right to Work Expires Soon
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** X days before RTW expiry
**Purpose:** Proactive reminder

---

#### 16. Right to Work Expired
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** RTW expiry date passed
**Purpose:** Non-compliance alert

---

### Professional Registration (1 notification)

#### 17. Candidate's Professional Registration Status Changed
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** GMC/NMC/HCPC status update (from polling CE-15)
**Purpose:** Compliance status change notification

---

### DBS (3 notifications)

#### 18. DBS Application Failed
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** DBS check failure
**Purpose:** Alert admin to issue

---

#### 19. DBS Application Results Received
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** DBS results returned
**Purpose:** Review required notification

---

#### 20. Candidate's DBS Certificate Status Changed
**Opt-out or Send Only for Assigned:** Yes
**Trigger:** DBS Update Service status change
**Purpose:** Compliance status change notification

---

### Other (1 notification)

#### 21. Requested Data Export Ready
**Opt-out or Send Only for Assigned:** No
**Trigger:** Admin's GDPR data export completed
**Purpose:** Download link notification

---

## Referee Notifications (2 types)

### 1. Reference Request
**Trigger:** Admin/system requests reference
**Purpose:** Initial reference form link

---

### 2. Reference Request Reminder
**Trigger:** Scheduled (reference not submitted for X days)
**Purpose:** Nudge referee to complete

---

## Summary

**Total Notifications:** 49

**Breakdown:**
- **Candidate Notifications:** 26
- **Administrator Notifications:** 21
- **Referee Notifications:** 2

**Customisable Notifications (Candidate):** 7 of 26 (27%)
- Invite to create profile
- Approved candidate (2 types)
- Denied candidate
- New org document added
- Questionnaire assigned
- Questionnaire reminder

**Non-Customisable (Candidate):** 19 of 26 (73%)

**Admin Notification Opt-out:** 18 of 21 (86%) can be opted out or filtered to assigned candidates only

**Notification Triggers:**
- **User Actions:** 15 (admin approves, candidate uploads, etc.)
- **System Events:** 12 (document expires, compliance changes, etc.)
- **Scheduled/Reminders:** 8 (pending onboarding, document expiry, reference reminder)
- **Integration Events:** 5 (DBS results, professional reg status change)
- **Collaboration:** 2 (@mentions)

**Notification Categories (Candidate):**
- **Login:** 3
- **Onboarding:** 6
- **Documents:** 6
- **Organisation Documents:** 1
- **References:** 2
- **Questionnaires:** 2
- **Right to Work:** 4
- **DBS:** 1
- **Other:** 1

**Notification Categories (Admin):**
- **Login:** 3
- **Candidate Management:** 2
- **Onboarding:** 2
- **Compliance:** 1
- **Documents:** 2
- **References:** 3
- **Right to Work:** 3
- **Professional Registration:** 1
- **DBS:** 3
- **Other:** 1

**Primitive Mapping:**
- **All notifications = P009 (Notification/Alert System)**
- Customisable notifications = Template system (partial P009 implementation)
- Scheduled reminders = P006 (Scheduled Actions) + P009
- Integration-triggered = P011 (Connectors) + P005 (Events) + P009
- @Mentions = Collaboration feature (not explicitly primitive)

**Implementation Status:**
- **27% customisable (candidate)** - Limited template flexibility
- **73% hardcoded (candidate)** - Fixed notification types
- **86% opt-out available (admin)** - Good admin control
- **Scheduled reminders** - Some automation present
- **Multi-channel:** Email only (no SMS/in-app mentioned)

**Gaps Identified:**
- No self-service notification builder
- No multi-channel support documented (SMS, in-app, push)
- Limited template customization
- No user-defined notification rules
- No notification preferences per candidate
