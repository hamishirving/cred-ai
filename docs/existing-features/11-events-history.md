# Section 12: Events History

**PDF Section:** 12. Events History (p. 25-26)
**Feature Count:** 2 events history features

---

## Features Extracted

### EH-1: View History of Email Notifications
**Functionality:** The system allows viewing the history of email notifications sent to the candidate.

**Type:** Audit Trail
**User Facing:** Admin
**Scope:** Per-candidate email history
**Purpose:** Track what communications were sent

---

### EH-2: Filter Email Notification History
**Functionality:** The system allows filtering the history of sent email notifications by:
1. Date
2. Email notification type
3. User who triggered the email sending

**Type:** Audit Trail (Filtering)
**User Facing:** Admin
**Filter Fields:** 3
**Purpose:** Find specific communications

---

## Summary

**Total Features:** 2

**Purpose:**
- Email audit trail
- Communication tracking
- Troubleshooting (did the email send?)
- Compliance documentation

**Primitive Mapping:**
- **EH-1, EH-2 = P004 (Temporal Data/Historical Data)** - Audit trail
- Also related to **P009 (Notifications)** - Notification history tracking

**Implementation Status:**
- **🟢 Fully Implemented:** Basic email history
- **🟡 Limited:** Only email, not other event types
- **🔴 Missing:**
  - Event history for non-email events
  - Webhook delivery history
  - API call logs
  - Broader audit trail (see AP-20 for staff member events history)

**Note:** This is specifically for EMAIL notifications. Broader event history is covered by AP-20 (View history of staff member's events), which likely includes state changes, profile updates, document uploads, etc.
