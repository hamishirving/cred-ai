# Current Platform Features - Complete Index

**Source:** Product General Specification PDF (Date: 5 Dec 2024)
**Extraction Date:** 2025-11-29
**Total Sections Extracted:** 12 product feature sections

⚠️ **IMPORTANT:** See `STRATEGIC-CONTEXT.md` for critical rebuild strategy context.

**Key Context:**
- Current platform will be **completely rewritten** (not refactored)
- This analysis provides **reference implementation learning**, not reuse assessment
- Strangler fig migration pattern: feature freeze old, build new API-first
- Two teams: maintain old (current team) vs build new (small, AI-augmented team)
- Speed and value delivery are paramount

---

## Extraction Summary

| Section | File | Features | Status |
|---------|------|----------|--------|
| 2. Groups Management | `01-groups-management.md` | 4 | ✅ Complete |
| 3. Roles & Permissions | `02-roles-permissions.md` | 68 (5 + 63) | ✅ Complete |
| 4. Profile Setup | `03-profile-setup.md` | 8 | ✅ Complete |
| 5. Candidates Management | `04-candidates-management.md` | 11 | ✅ Complete |
| 6. Public API | `05-api.md` | 9 | ✅ Complete |
| 7. Compliance Requirements | `06-compliance-requirements.md` | 22 | ✅ Complete |
| 8. Compliance Monitoring | `07-compliance-monitoring.md` | 18 | ✅ Complete |
| 9. Onboarding Management | `08-onboarding.md` | 32 (17 + 15) | ✅ Complete |
| 10. Notifications | `09-notifications.md` | 49 (26 + 21 + 2) | ✅ Complete |
| 11. Reports | `10-reports.md` | 24 | ✅ Complete |
| 12. Events History | `11-events-history.md` | 2 | ✅ Complete |
| 13. Digital ID | `12-digital-id.md` | 3 | ✅ Complete |
| **TOTAL** | **12 files** | **250 features** | ✅ Complete |

---

## Not Extracted (Non-Feature Sections)

**Section 14:** Quality Assurance and UAT (process description, not features)
**Section 15:** Customer Support and CSM Responsibilities (support model, not features)
**Section 16:** Development Requests Out of Project Scope (process description, not features)

These sections describe operational processes, not platform features.

---

## Feature Count Breakdown

### By Major Category

| Category | Features | % of Total |
|----------|----------|------------|
| Permissions & Access Control | 68 | 27% |
| Notifications | 49 | 20% |
| Onboarding | 32 | 13% |
| Reports & Analytics | 24 | 10% |
| Compliance Requirements | 22 | 9% |
| Compliance Monitoring | 18 | 7% |
| Candidates Management | 11 | 4% |
| Public API | 9 | 4% |
| Profile Setup | 8 | 3% |
| Groups Management | 4 | 2% |
| Digital ID | 3 | 1% |
| Events History | 2 | 1% |

---

## Key Platform Capabilities Summary

### 1. Data Management
- **Custom Fields:** 10 field types, conditional logic, validation rules (CP-7, CP-8)
- **Default Profile Fields:** 9 default + unlimited custom (CP-1, CP-2)
- **Groups:** Hierarchical access control (GR-1 to GR-4)
- **Lifecycle Management:** Archive/Activate states (CM-4, CM-5)

### 2. Access Control & Security
- **63 Granular Permissions:** Fine-grained RBAC (AP-1 to AP-63)
- **Role Management:** Clinical/Non-clinical roles (R&P-1 to R&P-5)
- **Group-based Access:** Multi-tenancy support (GR-4, AP-1, AP-2)
- **Two-Factor Authentication:** Org-wide 2FA (CM-3)
- **SSO Support:** Magic link + SSO (CM-2)

### 3. Compliance & Monitoring
- **6 Integration Checks:** GMC, NMC, HCPC, DBS, RTW, Performers List (CR-15, CE-13)
- **5 Compliance Status Levels:** Requirement → Package → Candidate → Package (org) → Org (CE-2 to CE-6)
- **Automatic Polling:** Daily (GMC), Weekly (NMC, HCPC) (CE-15)
- **Real-time Recalculation:** Event-driven compliance updates (CE-8, CE-10, CE-12, CE-14, CE-18)

### 4. Form Building & Templates
- **15 Question Types:** Radio, checkbox, dropdown, matrix, signature, file upload, etc. (CR-10)
- **Conditional Logic:** Branching questions based on answers (CR-10)
- **Document Types:** Configurable templates with AI extraction (CR-1, CR-2, CR-3)
- **Reference Forms:** Configurable with business rules (CR-4, CR-5)
- **Questionnaires:** Role-based assignment (CR-8, CR-9)

### 5. AI/ML Capabilities
- **Document Field Extraction:** LLM-powered extraction of Issue Date, Expiry Date, Document Number, Type (CR-3)
- **Digital ID Integration:** Automated identity verification for RTW and DBS (DI-1, DI-2)

### 6. Workflow & Automation
- **15 Onboarding Step Types:** Welcome, forms, checks, approvals, signatures (OM-4)
- **Hierarchical Steps:** Parent-child grouping (OM-5)
- **Strict Mode:** Enforce completion (OM-10, OM-11)
- **Auto-assignment:** Role-based package assignment (CR-14, CR-18)
- **Compliance Packages:** Bundle requirements by role (CR-13 to CR-22)

### 7. Notifications
- **49 Notification Types:** 26 candidate, 21 admin, 2 referee
- **27% Customisable:** 7 of 26 candidate notifications
- **Scheduled Reminders:** Document expiry, onboarding pending, reference requests
- **Integration-triggered:** DBS results, professional registration changes

### 8. API & Integrations
- **9 API Endpoints:** Create, update, read candidate data (PA-1 to PA-9)
- **6 Professional Body Integrations:** GMC, NMC, HCPC, DBS, RTW, Performers List
- **Digital ID Integration:** Identity verification provider
- **Custom Field Support:** API exposes custom fields (PA-2, PA-3)

### 9. Reporting & Analytics
- **3 Pre-built Onboarding Dashboards:** Statistics, Step Stats, Time Stats (OR-1)
- **1 Comprehensive Dashboard:** 10 categories, 40+ metrics (DB-1)
- **Business Metrics:** Efficiency, activity, quality KPIs (BM-1)
- **Saved Filters:** Org-wide filter sharing (SF-1 to SF-3)
- **Export:** XLS, CSV, PDF, image (OR-7)
- **Drill-through:** Supported across all reports
- **Custom Field Reporting:** Reports include custom fields (DR-6)

### 10. User Management
- **4 Creation Methods:** UI, API, CSV, self-service signup (CM-1)
- **Passwordless Auth:** Magic link (CM-2)
- **Assignment:** Many-to-many candidate-admin (CM-7)
- **17 Configurable Table Columns:** Personalized views (CM-9)

---

## Technology & Architecture Patterns

### Event-Driven Architecture
- Compliance recalculation triggered by events (CE-8)
- Notification system event-based (Section 10)
- Onboarding state machine (OM-13)

### Polling & Scheduled Operations
- **Hourly:** Dashboard refresh (OR-2, DB-4, DR-5)
- **Daily:** GMC checks (CE-15)
- **Weekly:** HCPC, NMC checks (CE-15)

### Data Model Patterns
- **Extensible Schema:** Custom fields, sections, tags
- **Hierarchical Groups:** Multi-tenancy support
- **State Machines:** Onboarding (5 states), User (active/invited/archived)
- **Versioning:** Onboarding draft/published (OM-1, OM-9)

### Integration Patterns
- **Polling:** Professional registration checks (CE-15)
- **Webhooks:** DBS, Professional reg updates (CE-14)
- **API-first:** Read-heavy API for HRIS integration (Section 6)
- **Third-party SaaS:** Digital ID provider (DI-1, DI-2)

---

## Identified Gaps & Limitations

### Configuration Flexibility
- **Document types configured upon request** (7.3) - Not fully self-service
- **Reference forms configured upon request** (7.4) - Not fully self-service
- **27% of notifications customisable** - Majority hardcoded
- **No custom dashboard builder** - Pre-built dashboards only

### Real-time & Performance
- **Hourly dashboard refresh** - Not real-time
- **No real-time compliance updates in dashboards** - Event-driven but batch refresh

### API & Integrations
- **No DELETE operations** via API
- **No webhook subscription endpoints** documented
- **Limited CREATE operations** - Only candidates, not documents/references

### Reporting & Analytics
- **No ad-hoc report builder**
- **No user-defined metrics/calculations**
- **No private saved filters** - All org-wide

### Multi-channel Notifications
- **Email only** - No SMS, in-app, push notifications mentioned

### Audit Trail
- **Email notifications only** in Events History (EH-1) - Not broader audit trail

---

## Next Steps (Task 3.1.B.2)

**Map features to primitive implementation status:**

### Revised Maturity Levels (See STRATEGIC-CONTEXT.md)

**IMPORTANT:** Since we're rewriting from scratch, maturity levels indicate "quality of reference implementation," not "code reuse potential."

1. For each of 250 features, assess reference quality:
   - 🟢 **Reference Implementation** - Works well, good guide for new primitive
   - 🟡 **Improvement Opportunity** - Exists but hardcoded/limited, new primitive can dramatically improve
   - 🟠 **Partial/Problematic** - Exists with gaps, new implementation needed to fix
   - 🔴 **Net New Capability** - Doesn't exist, must be designed from scratch

2. Group features by primitive (20 primitives from FINAL-PRIMITIVE-LIST.md)

3. Assess each primitive's implementation status:
   - What exists today? (Reference for requirements)
   - What are current limitations? (Pain points from Notion feedback)
   - What should the new primitive enable? (Future flexibility)
   - Build complexity: Low/Medium/High (from scratch)

4. Create primitive-by-primitive gap analysis:
   - Current implementation strengths (learn from)
   - Current implementation weaknesses (improve upon)
   - Net new capabilities needed (from Notion feedback)
   - API surface requirements (API-first principle)

**Estimated time:** 2-3 hours for comprehensive mapping of 250 features → 20 primitives

**Remember:** Every primitive is a **net-new build**, informed by current state + Notion feedback
