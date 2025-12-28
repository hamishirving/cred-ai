# Section 11: Reports

**PDF Section:** 11. Reports (p. 22-25)
**Feature Count:** 24 reporting features across 5 report types

---

## 11.1: Onboarding Reports (OR-1 to OR-7)

### OR-1: Default Onboarding Dashboards
**Functionality:** Credentially provides the following default onboarding dashboards:
- Onboarding Statistics
- Onboarding Step Statistics
- Onboarding Time Statistics

**Type:** Analytics/BI (Pre-built)
**User Facing:** Admin
**Dashboards:** 3

---

### OR-2: Dashboard Refresh Frequency
**Functionality:** The system refreshes the dashboards data every hour

**Type:** Data Refresh
**Frequency:** Hourly
**Real-time:** No

---

### OR-3: Onboarding Statistics Dashboard Metrics
**Functionality:** Onboarding statistics dashboard provides the following metrics:
- Onboarding Not started
- Not Started (Top 5 roles)
- Onboarding In Progress
- In Progress (Top 5 roles)
- Onboarding Completed
- Completed (Top 5 roles)
- Breakdown by Role & Status

**Type:** Analytics (Aggregated)
**Metrics:** 7
**Dimensions:** Status, Role

---

### OR-4: Onboarding Step Statistics Dashboard Metrics
**Functionality:** Onboarding step statistics dashboard provides the following metrics:
- Onboarding in Progress
- Candidates Pending Approval
- Users by Onboarding Step (Top 5)
- Users by Onboarding Step (Details)
- Users by Role (Top 5)
- Users by Role (Details)

**Type:** Analytics (Step-level)
**Metrics:** 6
**Dimensions:** Step type, Role

---

### OR-5: Onboarding Time Statistics Dashboard Metrics
**Functionality:** Onboarding time statistics dashboard provides the following metrics:
- Number of Completed Onboardings
- Median / Average Time to Complete Onboarding
- Median / Average Time to Complete Onboarding by Role (Top 5)
- Median / Average Time to Complete Onboarding by Role (Details)
- Median / Average Time to Complete Onboarding Step (Top 5)
- Median / Average Time to Complete Onboarding Step (Details)
- Breakdown by Role & Status

**Type:** Analytics (Time-based)
**Metrics:** 7
**Dimensions:** Time, Role, Step
**Calculations:** Median, Average

---

### OR-6: Drill Down to Candidate Data
**Functionality:** The system allows drilling down to the candidates data:
- Email
- Full Name
- Role
- Onboarding status
- Current step name
- Onboarding event type
- Onboarding event date
- Onboarding event time

**Type:** Analytics (Drill-through)
**Fields:** 8
**Purpose:** Investigate individual candidates

---

### OR-7: Dashboard Filtering
**Functionality:** The system allows filtering the dashboards data by the following fields:
- Role
- Onboarding status
- Onboarding completed by
- Current Step name
- Current Step type
- Step name
- Step type
- Step completed by
- Candidate status
- Clinical/Non-clinical
- City
- Postcode
- ZIP code
- Professional registration number
- Signed off
- Full name
- Email
- Custom tag

**Type:** Analytics (Filtering)
**Filter Fields:** 18
**Advanced:** Includes custom fields (custom tag)

---

### OR-7 (duplicate ID in PDF): Export Dashboards
**Functionality:** The system allows exporting dashboards data in the XLS, CSV, PDF, or image format

**Type:** Data Export
**Formats:** 4 (XLS, CSV, PDF, image)

---

## 11.2: Default Dashboards (DB-1 to DB-4)

### DB-1: Default Dashboard Metrics
**Functionality:** The system provides the following default dashboard metrics:

**Pending Approvals:**
- Onboarding
- Mandatory Documents (Current Version & Latest Version)

**Users:**
- Total Users (Split by user status and Signed Off status)
- Added (Yesterday, Last 7 Days, Last 30 Days)
- Signed Up (Yesterday, Last 7 Days, Last 30 Days)
- Signed Off (Yesterday, Last 7 Days, Last 30 Days)
- Invited & Not Signed Up
- Not Assigned

**Compliance:**
- Compliance Status (Top 5)
- Approaching Compliance
- Signed Off & Non Compliant Users
- Non-Compliant Requirements (Mandatory Documents, References, DBS Update Service, Professional Registration & Performers List, RTW, Other)

**Onboarding:**
- Onboarding Status
- Stalled Onboardings (Top 5)
- Signed Up & Not Started Onboarding
- Onboarding In Progress
- Users Completed Onboarding (Yesterday, Last 7 Days, Last 30 Days)

**Documents (Current Version):**
- Document Status
- Expired (Today, Yesterday, Last 7 Days, Last 30 Days)
- Expiring Soon (Today, Yesterday, Last 7 Days, Last 30 Days)
- No Expiration Date

**Right to Work:**
- RTW Status
- Expired (Today, Yesterday, Last 7 Days, Last 30 Days)
- Expiring Soon (Today, Yesterday, Last 7 Days, Last 30 Days)

**DBS Update Service Check:**
- DBS Update Service Status
- DBS Certificate (Expired, Expiring Soon, Missing)

**References:**
- References Status

**Questionnaires:**
- Questionnaires Status

**Organisation Documents:**
- Org Documents Status

**Type:** Analytics/BI (Comprehensive)
**Categories:** 10
**Metrics:** 40+
**Time Ranges:** Today, Yesterday, Last 7 Days, Last 30 Days

---

### DB-2: Drill Through to Details
**Functionality:** The system allows drilling through to the details of each metrics

**Type:** Analytics (Drill-through)
**Purpose:** Investigate specific metric values

---

### DB-3: Filter Dashboard Data
**Functionality:** The system allows filtering dashboards data

**Type:** Analytics (Filtering)
**Note:** Filter fields not specified (likely similar to OR-7)

---

### DB-4: Dashboard Refresh Frequency
**Functionality:** The system refreshes the dashboards data every hour

**Type:** Data Refresh
**Frequency:** Hourly
**Real-time:** No

---

## 11.3: Business Metrics (BM-1)

### BM-1: Business Metrics Provided
**Functionality:** Credentially provides the following business metrics:
- Processed Documents
- Sent Reference Requests
- Sent Reference Reminders
- Digital ID Checks (with drill through report)
- Professional Checks
- Completed Onboardings (split by final status: Approved or Declined)
- Average Number of Candidates Processed by Compliance Staff
- Median Time to Complete Onboarding
- Drop Out Rate

**Type:** Analytics (Business KPIs)
**Metrics:** 9
**Focus:** Operational efficiency, compliance activity

---

## 11.4: Detailed Reports (DR-1 to DR-6)

### DR-1: Detailed Staff Members Data
**Functionality:** The system provides details regarding the following staff members' data:
- Profile Details
- Staff Management
- Staff Members Statuses
- Events
- Onboarding
- Compliance Requirements (including References, Documents, Professional Registrations, Performers List, DBS Update Service)
- Non-Mandatory Documents
- Questionnaires
- Organisation Documents

**Type:** Analytics (Granular)
**Data Categories:** 9
**Purpose:** Deep dive into individual records

---

### DR-2: Drill Through to Details
**Functionality:** The system allows drilling through to the details of each record

**Type:** Analytics (Drill-through)

---

### DR-3: Filter Detailed Report Data
**Functionality:** The system allows filtering detailed report data

**Type:** Analytics (Filtering)

---

### DR-5: Detailed Report Refresh Frequency
**Functionality:** The system refreshes the detailed report data every hour

**Type:** Data Refresh
**Frequency:** Hourly
**Real-time:** No

**NOTE:** DR-4 missing from PDF (likely typo)

---

### DR-6: Drill Through to Custom Profile Details
**Functionality:** The system allows drilling through to the custom profile details

**Type:** Analytics (Custom Fields)
**Purpose:** View custom field data in reports

**NOTE:** This is important - reports support CUSTOM FIELDS

---

## 11.5: Saved Filters (SF-1 to SF-3)

### SF-1: Save Current Filters
**Functionality:** The system allows users to save current filters for any report, providing one-click access to the saved view.

**Type:** Personalization
**User Facing:** Admin
**Purpose:** Quick access to common views

---

### SF-2: Share Saved Filters Org-wide
**Functionality:** The system shares all saved filters across the organization, so they are visible to all users who have access to the reports.

**Type:** Collaboration
**User Facing:** All admins
**Scope:** Organisation-wide

**NOTE:** Could be useful, but no private filters supported

---

### SF-3: Edit and Delete Saved Filters
**Functionality:** The system allows editing and deleting existing saved filters

**Type:** Management
**User Facing:** Admin

---

## Summary

**Total Features:** 24

**Report Types:** 5
1. **Onboarding Reports:** 7 features (OR-1 to OR-7)
2. **Default Dashboards:** 4 features (DB-1 to DB-4)
3. **Business Metrics:** 1 feature (BM-1)
4. **Detailed Reports:** 5 features (DR-1 to DR-6, DR-4 missing)
5. **Saved Filters:** 3 features (SF-1 to SF-3)

**Pre-built Dashboards:**
- 3 onboarding-specific dashboards
- 1 comprehensive default dashboard (10 categories, 40+ metrics)
- 1 business metrics dashboard

**Key Capabilities:**
- **Drill-through:** Supported across all report types
- **Filtering:** Supported (18 fields documented for onboarding reports)
- **Export:** XLS, CSV, PDF, image
- **Time dimensions:** Today, Yesterday, Last 7 Days, Last 30 Days
- **Custom field support:** Yes (DR-6, OR-7 mentions "custom tag")
- **Saved filters:** Yes, org-wide sharing

**Refresh Rate:**
- **Hourly refresh** (OR-2, DB-4, DR-5)
- **Not real-time**

**Statistical Functions:**
- Median
- Average
- Count
- Percentage
- Top N

**Dimensions Available:**
- Role
- Status (onboarding, compliance, user)
- Step type/name
- Time periods
- Completion status
- Candidate attributes (clinical/non-clinical, location, etc.)
- Custom fields

**Business Metrics (BM-1):**
- Efficiency metrics (processed documents, time to complete)
- Activity metrics (reference requests, checks performed)
- Quality metrics (drop out rate, approval rate)

**Primitive Mapping:**
- **OR-1 to DR-6 = P018 (Dashboard & View Configuration)**
- **SF-1 to SF-3 = P018 (Saved Filters)** - Partial self-service BI
- **DR-6 = P001 (Custom Fields)** integration with reporting
- **Export = P014 (Export/API Framework)**

**Implementation Status:**
- **🟢 Fully Primitive:** Saved filters (SF-1 to SF-3)
- **🟡 Hardcoded:** Dashboards are pre-built, not user-configurable
- **🟠 Partial:** Filtering supported, but not ad-hoc report building
- **🔴 Missing:**
  - Real-time dashboards
  - User-defined metrics/calculations
  - Custom dashboard builder (drag-drop widgets)
  - Private saved filters

**Gaps Identified:**
- No self-service dashboard builder
- Hourly refresh only (not real-time)
- No user-defined calculated fields
- No private filters (all org-wide)
- Limited to pre-built dashboards
- No drill-down to change/trend analysis
