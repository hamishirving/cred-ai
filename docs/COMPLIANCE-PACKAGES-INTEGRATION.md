# Compliance Packages Integration

Draft ideas for leveraging the new compliance packages endpoint in the playground.

## The New Endpoint

```
GET /api/{organisationId}/compliance-packages/{profileId}
```

Returns structured compliance requirements for a candidate, including:
- Which packages they're assigned to
- Every requirement within each package
- Status of each requirement (compliant/not compliant)
- Type of requirement (document, reference, integration, text)
- Compliance tags indicating specific issues

## Data Structure

```
CompliancePackage
  ├── id, name, modified
  └── groups[]
        ├── id, name
        └── requirements[]
              ├── type: DOCUMENT_TYPE | INTEGRATION | REFERENCE_FORM | TEXT_REQUIREMENT
              ├── complianceStatus: COMPLIANT | NOT_COMPLIANT
              ├── complianceTags[] (COMPLIANCE_ERROR | COMPLIANCE_OK)
              ├── documentType (name, key, description, expiryPeriod)
              ├── referenceForm (title, businessRules, requiredNumber)
              ├── integration (name, type - e.g., DBS)
              ├── textRequirement (name)
              └── approved, approvedBy
```

## Integration Opportunities

### 1. Smarter AI Companion Emails

**Current state:** Generic compliance status, limited specificity

**With compliance packages:**

```
Hi Sarah,

You have 3 items remaining to complete your NHS Trust Onboarding package:

📄 Documents (2)
- Right to Work - Please upload your passport, visa, or share code
- ILS Certificate - Expires in 14 days, please upload renewed certificate

📋 References (1)
- Employment Reference - 1 of 2 received, awaiting second referee response

Your DBS check is in progress - no action needed from you.

[Complete Your Profile →]
```

**Benefits:**
- Requirement-specific guidance (not just "you have gaps")
- Grouped by type for clarity
- Acknowledges in-progress items (integrations)
- Actionable next steps per item

**Implementation:**
1. Fetch compliance packages when generating email
2. Parse requirements by type and status
3. Build structured message with priority ordering
4. Include specific document names, not generic categories

---

### 2. Chat Tool Enhancement

**New tool: `getCompliancePackages`**

Allow chat to query compliance package data directly.

**Example queries:**
- "What does Sarah need to complete?"
- "Show me candidates missing DBS checks"
- "Who has pending references in the Nursing package?"
- "Which requirements are blocking sign-off for this candidate?"

**Tool implementation:**
```typescript
{
  name: 'getCompliancePackages',
  description: 'Get compliance package requirements and status for a candidate',
  parameters: {
    profileId: { type: 'string', required: true },
    organisationId: { type: 'string', required: true }
  }
}
```

**Chat can then:**
- Summarise outstanding requirements
- Identify specific blockers
- Suggest prioritisation (references take longest, start those first)
- Compare across candidates ("who's closest to sign-off?")

---

### 3. Granular Task Creation

**Current state:** One task per candidate ("Follow up with Sarah")

**With compliance packages:** Task per requirement type

| Requirement Type | Task Created | Assigned To |
|-----------------|--------------|-------------|
| DOCUMENT_TYPE (missing) | "Request [Doc Name] from [Candidate]" | Compliance team |
| DOCUMENT_TYPE (expiring) | "Chase renewal: [Doc Name] expires [Date]" | Compliance team |
| REFERENCE_FORM (pending) | "Follow up on reference from [Referee]" | Compliance team |
| INTEGRATION (failed) | "Investigate DBS check failure for [Candidate]" | Compliance manager |

**Benefits:**
- Clearer accountability
- Better tracking (which requirement types are bottlenecks?)
- Automated escalation by type

---

### 4. Candidate Dashboard Enhancement

**Package completion visualisation:**

```
NHS Trust Onboarding          [████████░░] 80%
├── Identity & Right to Work  [██████████] 100%
├── Professional Registration [████████░░] 80%
├── Health & Safety          [██████░░░░] 60%
└── References               [████░░░░░░] 40%
```

**Breakdown by requirement type:**
- Documents: 8/10 complete
- References: 1/2 complete
- Integrations: 2/2 complete
- Text requirements: 3/3 complete

**Blocker identification:**
- "References are your biggest blocker - 50% of outstanding items"
- "2 candidates waiting on DBS results (avg 5 days remaining)"

---

### 5. Proactive Compliance Monitoring

**Use compliance tags to identify issues:**

| Tag | Meaning | Action |
|-----|---------|--------|
| `COMPLIANCE_ERROR` | Something's wrong | Investigate, escalate |
| `COMPLIANCE_OK` | All good | No action |

**Automated alerts:**
- "3 candidates have COMPLIANCE_ERROR on DBS checks"
- "Reference form expired for Nursing package - 12 candidates affected"

**Expiry monitoring:**
- Parse `documentType.expiryPeriodInMonths` and `expireSoonPeriodInDays`
- Proactive outreach before expiry, not after

---

### 6. Multi-Package Candidates

Some candidates have multiple packages (e.g., different placements, different roles).

**With this data:**
- Show compliance status per package
- Identify which package is blocking which placement
- "Sarah is compliant for Agency Pool but not NHS Trust Direct"

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Smarter AI emails with requirement specificity | Medium | High |
| 2 | Chat tool for querying packages | Low | Medium |
| 3 | Granular task creation | Medium | High |
| 4 | Dashboard visualisation | Medium | Medium |
| 5 | Proactive monitoring/alerts | High | High |

## Next Steps

1. [ ] Add `getCompliancePackages` as chat tool
2. [ ] Update email generation to fetch and parse packages
3. [ ] Build requirement-specific email templates
4. [ ] Add package data to candidate detail view
5. [ ] Create task-per-requirement logic

---

## Technical Notes

**Endpoint location:** External API (gateway)
**Auth:** Bearer JWT token required
**Rate limiting:** TBC - may need caching strategy for bulk operations

**Caching consideration:**
- Package structure changes infrequently
- Requirement status changes frequently
- Consider caching package structure, fetching status on-demand

---

*Draft document - for discussion*
