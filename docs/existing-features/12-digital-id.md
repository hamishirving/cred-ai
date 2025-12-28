# Section 13: Digital ID

**PDF Section:** 13. Digital ID (p. 26)
**Feature Count:** 3 Digital ID features

---

## Features Extracted

### DI-1: Complete Right to Work Check with Digital ID
**Functionality:** The system allows candidates to complete their Right To Work check with Digital ID

**Type:** Integration (Digital ID Verification)
**User Facing:** Candidate
**Purpose:** Automated RTW verification
**Integration:** Digital ID provider

---

### DI-2: Complete DBS ID Information with Digital ID
**Functionality:** The system allows candidates to complete ID Information in DBS Application with Digital ID

**Type:** Integration (Digital ID Verification)
**User Facing:** Candidate
**Purpose:** DBS application identity verification
**Integration:** Digital ID provider

---

### DI-3: Admin Review Digital ID Verification Details
**Functionality:** The system allows Administrators to review the details of Digital ID verification in a candidate's profile

**Type:** Review/Audit
**User Facing:** Admin
**Purpose:** Verify Digital ID check results
**Permission Required:** Likely AP-59, AP-54 (RTW, DBS permissions)

---

## Summary

**Total Features:** 3

**Purpose:**
- Streamline RTW verification
- Streamline DBS identity verification
- Reduce manual document review
- Faster onboarding

**Integration:**
- Digital ID provider (vendor not specified in PDF)
- Likely uses third-party identity verification service

**Use Cases:**
1. **Right to Work (DI-1):** Candidate uses Digital ID to prove identity and right to work
2. **DBS Application (DI-2):** Candidate uses Digital ID to provide identity information for DBS check
3. **Admin Verification (DI-3):** Admin reviews results of Digital ID verification

**Primitive Mapping:**
- **DI-1, DI-2, DI-3 = P011 (External Service Connector Framework)** - Integration with Digital ID provider
- **DI-3 = P017 (RBAC)** - Admin permission to view verification details

**Implementation Status:**
- **🟢 Implemented:** Digital ID integration for RTW and DBS
- **🟢 Implemented:** Admin review capability

**Gaps/Unknowns:**
- **Provider:** Which Digital ID provider? (Yoti, Onfido, Veriff, etc.)
- **Fallback:** What happens if Digital ID fails? Manual upload still supported?
- **Coverage:** Is Digital ID mandatory or optional?
- **Countries:** UK-specific or multi-country support?

**Benefits:**
- **Candidate UX:** Faster, mobile-friendly identity verification
- **Admin efficiency:** Less manual document review
- **Compliance:** Automated, auditable identity verification
