# Section 2: Groups Management

**PDF Section:** 2. Groups management (p. 2-3)
**Feature Count:** 4 core features + 1 configuration note

---

## Features Extracted

### GR-1: Create Restricted Access Groups
**Functionality:** The system allows creating restricted access groups.

**Type:** Data Organization
**User Facing:** Admin
**Configuration:** Required upon customer request (2.2)

---

### GR-2: Custom Tags for Groups
**Functionality:** The system allows adding custom tags to each group.

**Type:** Metadata Management
**User Facing:** Admin
**Configuration:** Self-service

---

### GR-3: Allocate Users to Groups
**Functionality:** The system allows to allocate administrators and candidates to group(s) or to leave them not allocated.

**Type:** Access Control
**User Facing:** Admin
**Configuration:** Self-service

---

### GR-4: Group-Based Access Restrictions
**Functionality:** The system limits administrator's access to the list of candidates depending on the group(s) both administrator and candidate belong to. See AP-1 and AP-2 for more information.

**Type:** Access Control / RBAC
**User Facing:** Admin (enforced automatically)
**Configuration:** Automatic based on group membership
**Dependencies:** AP-1, AP-2 (admin permissions)

---

## Configuration Notes

**2.2:** Groups will be created upon request (not self-service for initial setup)

---

## Summary

**Total Features:** 4
**Self-Service:** 2 (GR-2, GR-3)
**Requires CS Setup:** 2 (GR-1, GR-4 - initial configuration)

**Primary Purpose:** Hierarchical access control and multi-tenancy support within organizations
