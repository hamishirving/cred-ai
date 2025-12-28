# Section 6: Credentially Public API

**PDF Section:** 6. Credentially public API (p. 10-11)
**Feature Count:** 9 API endpoints

---

## Features Extracted

### PA-1: API Endpoint - Create New Candidate
**Functionality:** Credentially provides an API endpoint to create a new candidate

**Type:** API - POST
**Resource:** Candidate
**Operation:** Create
**Permission Required:** (API authentication)

---

### PA-2: API Endpoint - Update Candidate's Profile Details
**Functionality:** Credentially provides an API endpoint to update candidate's profile details (default and custom fields)

**Type:** API - PUT/PATCH
**Resource:** Candidate Profile
**Operation:** Update
**Scope:** Default fields + custom fields (CP-7, CP-8)

---

### PA-3: API Endpoint - Provide Candidate's Profile Details
**Functionality:** Credentially provides an API endpoint to provide candidate's profile details to the external system (default and custom fields)

**Type:** API - GET
**Resource:** Candidate Profile
**Operation:** Read
**Scope:** Default fields + custom fields
**Direction:** Outbound (to external system)

---

### PA-4: API Endpoint - Provide Candidate's Document Details
**Functionality:** Credentially provides an API endpoint to provide candidate's document details to the external system

**Type:** API - GET
**Resource:** Documents
**Operation:** Read
**Direction:** Outbound

---

### PA-5: API Endpoint - Provide Candidate's RTW Details
**Functionality:** Credentially provides an API endpoint to provide candidate's RTW details to the external system

**Type:** API - GET
**Resource:** Right to Work
**Operation:** Read
**Direction:** Outbound
**Integration:** RTW compliance data

---

### PA-6: API Endpoint - Provide Candidate's DBS Details
**Functionality:** Credentially provides an API endpoint to provide candidate's DBS details to the external system

**Type:** API - GET
**Resource:** DBS Check
**Operation:** Read
**Direction:** Outbound
**Integration:** DBS compliance data

---

### PA-7: API Endpoint - Provide Candidate's Reference Details
**Functionality:** Credentially provides an API endpoint to provide candidate's reference details to the external system

**Type:** API - GET
**Resource:** References
**Operation:** Read
**Direction:** Outbound

---

### PA-8: API Endpoint - Provide General Candidate's Details
**Functionality:** Credentially provides an API endpoint to provide general candidate's details (such as professional registrations, overall compliance status and etc.) to the external system

**Type:** API - GET
**Resource:** Candidate (Aggregated)
**Operation:** Read
**Scope:** Professional registrations, compliance status, general overview
**Direction:** Outbound

---

### PA-9: API Documentation
**Functionality:** Credentially provides API documentation with authentication details, API methods, requests and responses samples

**Type:** Documentation
**Scope:** Authentication, methods, request/response samples

---

## Summary

**Total Features:** 9

**API Coverage:**
- **CREATE operations:** 1 (PA-1)
- **UPDATE operations:** 1 (PA-2)
- **READ operations:** 6 (PA-3, PA-4, PA-5, PA-6, PA-7, PA-8)
- **Documentation:** 1 (PA-9)

**Resources Exposed:**
- Candidate profile (create, update, read)
- Documents (read)
- Right to Work (read)
- DBS checks (read)
- References (read)
- Professional registrations & compliance (read)

**API Architecture:**
- **Direction:** Primarily outbound (read-heavy for integrations)
- **Custom Field Support:** Yes (PA-2, PA-3 explicitly mention custom fields)
- **Documented:** Yes (PA-9)

**Gaps Identified:**
- **No DELETE operations** documented
- **No PATCH for granular updates** (only full profile update)
- **Limited CREATE operations** (only candidates, not documents/references via API)
- **No webhook/event subscription** endpoints documented (see Section 12 for webhooks)

**Primitive Mapping:**
- **PA-1 to PA-9 = P014 (Data Export & API Framework)** - API-first architecture
- **PA-5, PA-6 = P011 (Connectors)** - Integration data exposure
- Supports API-first principle: external systems can read compliance data

**Note:** This is a READ-heavy API designed for integration with HRIS/CRM systems to pull compliance data OUT of Credentially. Limited write operations suggest Credentially is the system of record for compliance, while other systems are source of truth for HR data.
