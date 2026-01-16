# Employment History Verification Research

Research into HMRC and payroll-based employment verification for work history capture.

**Status:** Parked - speaking to Konfir about partnership

---

## Summary

Investigated building direct HMRC integration for employment history verification. Key finding: the public HMRC API doesn't include employment dates - only employer names. Richer data (with start/end dates) requires candidate consent flows.

## Three Verification Routes

| Route | How it works | Candidate friction | Coverage |
|-------|--------------|-------------------|----------|
| **Experian Work Report** | Pulls from employer's payroll (Sage, IRIS, Zellis) | Low - just consent | 82% UK employees |
| **Government Gateway (HMRC)** | Candidate logs into personal tax account | High - account creation, 5-7 day postal activation | 100% PAYE workers |
| **Open Banking** | Income verification via bank transactions | Medium - bank login | Variable |

## HMRC Public API (Not Useful)

**Endpoint:** `GET /individual-employment/sa/{utr}/annual-summary/{taxYear}`

Only returns:
- Employer name
- PAYE reference
- Off-payroll work flag

**Does NOT include:** Start date, end date, salary

This API is for Self Assessment users and requires UTR. Not suitable for employment history verification.

## Government Gateway Consent Flow

What Zinc built - candidate authenticates via Government Gateway to share personal tax account data.

**Pros:**
- 100% coverage of PAYE workers
- Includes start/end dates and salary
- Tamper-proof government data

**Cons:**
- Many candidates don't have Government Gateway accounts
- Account creation takes 5 mins, but activation code posted (5-7 working days)
- Significant friction for candidates without existing accounts

## Experian Work Report (Better Path)

Pulls employment data directly from employer's payroll system.

**Pros:**
- No government account needed
- Instant - just candidate consent
- Covers 82% of UK employees (Sage, IRIS, Zellis partnerships)

**Cons:**
- 18% of employees not covered (employer not on network)
- Requires Experian partnership/integration

## How Zinc Approaches It

Zinc (competitor) uses Government Gateway as primary route:
- Candidate receives link
- Logs into Government Gateway (or creates account)
- Consents to share employment data
- Zinc receives 5 years of history with dates

They claim "just a few seconds" but this assumes existing Government Gateway account.

## How Konfir Approaches It

Konfir uses multiple sources with fallback:
1. **Experian Work Report** (payroll) - primary, 82% coverage
2. **HMRC** (Government Gateway) - fallback
3. **Open Banking** - additional verification

Candidate receives SMS → consents → data pulled from best available source.

This multi-source approach minimises friction while maximising coverage.

---

## Next Steps

1. **Speak to Konfir** about partnership/integration options
2. Understand their API, pricing, and how it would integrate with Credentially workflow
3. Evaluate build vs buy decision based on conversation

---

## Technical Reference (If Building Later)

### OAuth Flow (Sandbox)

**Authorization URL:** `https://test-www.tax.service.gov.uk/oauth/authorize`
**Token URL:** `https://test-api.service.hmrc.gov.uk/oauth/token`
**Scope:** `read:individual-employment`

### Environment Variables

```
HMRC_CLIENT_ID=xxx
HMRC_CLIENT_SECRET=xxx
HMRC_REDIRECT_URI=http://localhost:3000/api/hmrc/callback
```

### API Response (Personal Tax Account - Full Data)

```json
{
  "employments": [
    {
      "employerName": "Company XYZ",
      "employerPayeReference": "123/AB456",
      "startDate": "2020-04-06",
      "endDate": "2023-03-15",
      "taxablePayToDate": 45000
    }
  ]
}
```

---

## Sources

- [HMRC Developer Hub](https://developer.service.hmrc.gov.uk/api-documentation/docs/api)
- [Experian Work Report](https://www.experian.co.uk/business/work-report/payroll)
- [Konfir](https://www.konfir.com/)
- [Zinc Employment Verification](https://zincwork.com/checks/employment-verification)
