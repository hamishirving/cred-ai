# PRD: Compliance Companion Email MVP (Playground)

**Status:** Draft
**Created:** 2025-01-03
**Owner:** Engineering
**Priority:** High

---

## Overview

Implement an MVP of the AI Compliance Companion automated daily emails feature in the Credentially 2.0 Playground. This demonstrates the core value proposition: **"AI does work, human supervises"** — where candidates receive personalised, AI-generated emails about their onboarding progress.

### Goals

1. **Demonstrate email generation** — Show AI-generated, personalised compliance emails
2. **Prove blocking logic value** — Differentiate "what candidate needs to do" vs "what we're handling"
3. **Showcase org customisation** — Org-level prompt configuration for brand voice
4. **Enable realistic demos** — Use existing seed data to show varied email scenarios
5. **Build foundation** — Architecture that extends to production implementation

### Non-Goals (V1)

- ❌ Actually sending emails (preview only)
- ❌ Admin digest emails (candidate-focused only)
- ❌ Ongoing compliance emails (onboarding only)
- ❌ Multi-channel (email only, no SMS/WhatsApp)
- ❌ Reply handling / conversational

---

## Reference: Production PRD

This playground implementation is based on the production PRD: `PRD-ai-compliance-companion.md`

Key concepts from production PRD:
- 3-layer prompt architecture (System → Org → Dynamic)
- Blocking logic: candidate vs admin vs third-party
- Warm, encouraging tone - not robotic notifications
- 150-250 words, scannable format
- Clear next steps and contact details

---

## Data Requirements

### Current State Assessment

| Data | Required For | Status | Location |
|------|--------------|--------|----------|
| Candidate name/email | Personalisation | ✅ Exists | `profiles` |
| Compliance items | Progress tracking | ✅ Exists | `compliance_elements` via `evidence` |
| Item status | What's complete/pending | ✅ Exists | `evidence.status` |
| Days in onboarding | Urgency/tone adjustment | ✅ Derivable | `profiles.createdAt` |
| Org name/contact | Sign-off, escalation | ⚠️ Partial | `organisations` (need contact details) |
| Compliance manager | CC/contact info | ❌ Missing | Need to add to org or as user |
| **Who's blocking** | Core differentiator | ⚠️ Needs design | See Blocking Logic section |
| Previous messages | Avoid repetition | ✅ Exists | `activities` table |
| Start date | Urgency context | ✅ Exists | `placements.startDate` |
| Role | Context in message | ✅ Exists | `roles` via `placements` |

### Data Gaps to Fill

#### 1. Organisation Contact Details

Add to `organisations.settings`:

```typescript
interface OrgSettings {
  // ... existing fields
  complianceContact?: {
    name: string;
    email: string;
    phone?: string;
  };
  supportContact?: {
    email: string;
    phone?: string;
  };
}
```

#### 2. Org-Level AI Prompt

Add to `organisations.settings`:

```typescript
interface OrgSettings {
  // ... existing fields
  aiCompanion?: {
    enabled: boolean;
    orgPrompt: string;        // Custom org voice/instructions
    emailFrequency: 'daily' | 'every_2_days' | 'weekly';
    sendTime: string;         // e.g., "09:00"
    timezone: string;         // e.g., "Europe/London"
  };
}
```

#### 3. Activity Types for Email Tracking

The `activities` table already supports `message_sent` with `channel: 'email'`. We need to ensure we're capturing:

```typescript
// Activity for AI email
{
  activityType: 'message_sent',
  actor: 'ai',
  channel: 'email',
  summary: 'Sent daily compliance update',
  details: {
    emailType: 'daily_companion',
    subject: 'Quick update on your onboarding, Sarah',
    blockedBy: { candidate: 2, admin: 1, thirdParty: 0 },
    complianceSnapshot: { completed: 5, total: 7, percentage: 71 },
  },
  aiReasoning: 'Candidate has 2 items pending action, DBS upload needed...',
}
```

---

## Blocking Logic Design

### The Core Challenge

The key differentiator of the Compliance Companion is knowing **who is responsible** for each pending item:

| Blocked By | Meaning | Example |
|------------|---------|---------|
| **Candidate** | They need to take action | Upload DBS certificate |
| **Admin** | We're reviewing/processing | Document pending approval |
| **Third Party** | External service in progress | DBS check with issuing authority |

### Current Data Model Limitations

The `evidence` table tracks:
- `status`: pending, processing, requires_review, approved, rejected, expired
- `source`: user_upload, external_check, admin_entry, etc.
- `verificationStatus`: unverified, auto_verified, human_verified, external_verified

**Problem:** We can't reliably derive "who's blocking" from these fields alone.

### Options for Capturing Blocking Status

#### Option A: Explicit `blockedBy` Field on Evidence

Add a field to the evidence table:

```typescript
// In evidence schema
blockedBy: varchar("blocked_by", {
  enum: ["candidate", "admin", "third_party", "none"],
}).default("candidate"),
```

**Pros:**
- Explicit, no ambiguity
- Simple queries
- Auditable

**Cons:**
- Requires updating when status changes
- Could get out of sync with actual status

#### Option B: Derived from Status + Source Combination

Create a function that derives blocking status:

```typescript
function deriveBlockedBy(evidence: Evidence, element: ComplianceElement): BlockedBy {
  // No evidence exists = candidate needs to provide
  if (!evidence) return 'candidate';

  // Evidence rejected = candidate needs to resubmit
  if (evidence.status === 'rejected') return 'candidate';

  // Evidence pending/processing with external source = third party
  if (['pending', 'processing'].includes(evidence.status) &&
      evidence.source === 'external_check') {
    return 'third_party';
  }

  // Evidence uploaded but pending review = admin
  if (['pending', 'requires_review'].includes(evidence.status) &&
      ['user_upload', 'cv_extraction'].includes(evidence.source)) {
    return 'admin';
  }

  // Evidence approved = none (complete)
  if (evidence.status === 'approved') return 'none';

  // Default to candidate for anything else
  return 'candidate';
}
```

**Pros:**
- No schema changes
- Always consistent with current status
- Single source of truth

**Cons:**
- Logic could get complex
- Might not capture all edge cases
- Business rules embedded in code

#### Option C: Hybrid - Derive with Override

Use derived logic as default, but allow explicit override:

```typescript
// Evidence table
blockedByOverride: varchar("blocked_by_override", {
  enum: ["candidate", "admin", "third_party"],
}).nullable(),

// Query logic
function getBlockedBy(evidence: Evidence, element: ComplianceElement): BlockedBy {
  if (evidence?.blockedByOverride) {
    return evidence.blockedByOverride;
  }
  return deriveBlockedBy(evidence, element);
}
```

**Pros:**
- Best of both worlds
- Handles edge cases with override
- Derived logic handles common cases

**Cons:**
- More complex
- Need to track when overrides are needed

### Recommendation

**For Playground MVP: Option B (Derived)**

Rationale:
- No schema changes needed
- Good enough for demo purposes
- Can iterate based on production needs

**For Production: Option C (Hybrid)**

Rationale:
- Derived handles 90% of cases
- Override handles edge cases (e.g., external check that's actually waiting on candidate input)
- Auditable override trail

### Implementation for MVP

Create a utility function in `lib/ai/compliance-companion/blocking.ts`:

```typescript
export type BlockedBy = 'candidate' | 'admin' | 'third_party' | 'complete';

export interface BlockingAnalysis {
  blockedBy: BlockedBy;
  reason: string;
  actionRequired?: string;
}

export function analyzeBlocking(
  element: ComplianceElement,
  evidence: Evidence | null
): BlockingAnalysis {
  // No evidence = candidate needs to provide
  if (!evidence) {
    return {
      blockedBy: 'candidate',
      reason: 'Not yet submitted',
      actionRequired: `Upload your ${element.name}`,
    };
  }

  switch (evidence.status) {
    case 'approved':
      return { blockedBy: 'complete', reason: 'Approved' };

    case 'rejected':
      return {
        blockedBy: 'candidate',
        reason: evidence.rejectionReason || 'Needs resubmission',
        actionRequired: `Resubmit your ${element.name}`,
      };

    case 'expired':
      return {
        blockedBy: 'candidate',
        reason: 'Document has expired',
        actionRequired: `Upload a current ${element.name}`,
      };

    case 'requires_review':
    case 'pending':
      // Check if waiting on external service
      if (evidence.source === 'external_check') {
        return {
          blockedBy: 'third_party',
          reason: 'Awaiting external verification',
        };
      }
      // Otherwise admin is reviewing
      return {
        blockedBy: 'admin',
        reason: 'Under review by our team',
      };

    case 'processing':
      return {
        blockedBy: 'admin',
        reason: 'Being processed',
      };

    default:
      return {
        blockedBy: 'candidate',
        reason: 'Action needed',
      };
  }
}
```

---

## Seed Data Assessment

### Current Candidates by Scenario

| Scenario | Candidates Available | Notes |
|----------|---------------------|-------|
| **Early progress** (Day 2, ~20% complete) | `mohammed.ali` (UK), `janet.lewis` (UK), `amanda.davis` (US) | ✅ Good coverage |
| **Stuck/unresponsive** | `james.wilson` (UK), `peter.jones` (UK), `michelle.garcia` (US) | ✅ Good coverage |
| **Near completion** (80%+) | `sarah.thompson`, `michael.taylor`, `fiona.macdonald` | ✅ Good coverage |
| **Fully compliant** | `emily.chen`, `david.brown`, `karen.mitchell`, `jennifer.martinez` | ✅ Good coverage |
| **Expiring soon** | `lisa.anderson`, `alan.wright`, `christopher.lee` | ✅ Good coverage |
| **Just expired** | `chris.davies`, `brian.anderson` | ✅ Good coverage |
| **Waiting on admin** | ⚠️ Need to add | Add `requires_review` evidence |
| **Waiting on third party** | ⚠️ Need to add | Add `external_check` evidence in pending |
| **Mixed blockers** | ⚠️ Partially covered | Ensure some candidates have mix |

### Seed Data Enhancements Needed

1. **Add "waiting on admin" scenario:**
   - Modify 1-2 candidates to have evidence with `status: 'requires_review'`

2. **Add "waiting on third party" scenario:**
   - Add DBS evidence with `source: 'external_check'` and `status: 'pending'`

3. **Enhance activity history:**
   - Add more `message_sent` activities with `channel: 'email'`
   - Include email subjects and AI reasoning

4. **Add org contact details:**
   - Update seed to include `complianceContact` in org settings

---

## Implementation Plan

### Phase 1: Data Layer (Week 1)

#### 1.1 Schema Updates

```typescript
// Update organisations.settings type
interface OrgSettings {
  defaultDataOwnership: 'candidate' | 'organisation';
  terminology: { candidate: string; placement: string };
  // NEW
  complianceContact?: {
    name: string;
    email: string;
    phone?: string;
  };
  aiCompanion?: {
    enabled: boolean;
    orgPrompt: string;
    emailFrequency: 'daily' | 'every_2_days' | 'weekly';
    sendTime: string;
    timezone: string;
  };
}
```

#### 1.2 Seed Data Updates

- Add compliance contact to each org
- Add default AI companion settings
- Add example org prompts for each market (UK/US)
- Create "waiting on admin" and "waiting on third party" evidence records
- Enhance activity history with email records

#### 1.3 Blocking Analysis Utility

- Create `lib/ai/compliance-companion/blocking.ts`
- Implement `analyzeBlocking()` function
- Add unit tests for all status combinations

### Phase 2: Email Generation (Week 1-2)

#### 2.1 Prompt Architecture

Create 3-layer prompt system:

```
lib/ai/compliance-companion/
├── prompts/
│   ├── system-prompt.ts    # Core behaviour, safety rails
│   ├── org-prompt.ts       # Fetches org-specific prompt
│   └── dynamic-context.ts  # Builds candidate context
├── generate-email.ts       # Main generation function
├── blocking.ts             # Blocking analysis
└── types.ts                # Shared types
```

#### 2.2 System Prompt

```typescript
export const SYSTEM_PROMPT = `You are an AI Compliance Companion helping candidates complete their onboarding journey.

## Core Principles
- Celebrate progress first, then mention gaps
- Never nag about things outside the candidate's control
- Be specific when you can, general when you must
- Write like a helpful colleague, not a system notification
- Keep it brief - 150-250 words max
- Always include clear contact details

## Message Structure
1. Greeting with first name
2. Progress celebration (X of Y complete)
3. What's needed from THEM (if anything)
4. What WE'RE handling (if anything)
5. Encouraging close
6. Contact details footer

## Tone
- Warm and supportive
- Professional but human
- Encouraging, not pressuring
- Clear and scannable

## Rules
- Never hallucinate requirements or misstate status
- Never mention items that are complete (unless celebrating)
- Always be clear about who is responsible for what
- If nothing is needed from candidate, explicitly say so`;
```

#### 2.3 Dynamic Context Builder

```typescript
export interface EmailContext {
  candidate: {
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
    startDate?: Date;
    daysInOnboarding: number;
  };
  compliance: {
    completed: number;
    total: number;
    percentage: number;
    itemsBlockedByCandidate: BlockingItem[];
    itemsBlockedByAdmin: BlockingItem[];
    itemsBlockedByThirdParty: BlockingItem[];
  };
  org: {
    name: string;
    complianceContact: { name: string; email: string };
    customPrompt?: string;
  };
  history: {
    daysSinceLastEmail: number;
    emailCount: number;
  };
}
```

#### 2.4 Email Generation API

```typescript
// POST /api/companion/generate-email
// Request: { profileId: string, organisationId: string }
// Response: { subject: string, body: string, context: EmailContext }
```

### Phase 3: UI Implementation (Week 2)

#### 3.1 Candidate Detail Page - Comms History

Add a "Communications" tab/section to the candidate detail page:

```
/candidates/[id]
├── Overview (existing)
├── Compliance (existing)
├── Documents (existing)
└── Communications (NEW)
    ├── Email preview card (expandable)
    ├── Sent emails history
    └── "Preview Next Email" button
```

**Components needed:**
- `CandidateCommsHistory` - List of past communications
- `EmailPreviewCard` - Shows email subject, snippet, timestamp
- `EmailDetailModal` - Full email view with AI reasoning
- `GenerateEmailButton` - Triggers email generation preview

#### 3.2 Organisation Settings - AI Companion

Add AI Companion configuration to org settings:

```
/settings/organisation
├── General (existing)
├── Terminology (existing)
└── AI Companion (NEW)
    ├── Enable/disable toggle
    ├── Org prompt textarea
    ├── Compliance contact fields
    ├── Email frequency selector
    └── Preview button (generates sample email)
```

### Phase 4: Integration & Polish (Week 2-3)

#### 4.1 Activity Logging

When email is generated (even preview):
- Log to activities table
- Include full context for audit trail
- Track AI reasoning

#### 4.2 Demo Flow

Create smooth demo experience:
1. Navigate to candidate with gaps
2. Show comms history
3. Click "Preview Next Email"
4. See AI-generated email with blocking analysis
5. Show AI reasoning (expandable)
6. Navigate to org settings to customize prompt
7. Generate new preview showing customised tone

---

## UI Specifications

### Candidate Communications Tab

```
┌─────────────────────────────────────────────────────────────┐
│ Communications                                    [Preview Next Email] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📧 Daily Compliance Update                    Today 9:00am │
│ │ "Great progress Sarah! You've completed 5 of 7..."      │ │
│ │ Status: Would send (preview only)              [View →] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📧 Reminder: DBS Certificate needed          Yesterday │ │
│ │ "Hi Sarah, just a quick reminder about your DBS..."    │ │
│ │ Status: Sent (demo)                           [View →] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📧 Welcome to NHS Professionals               5 days ago │
│ │ "Welcome Sarah! We're excited to help you get started." │ │
│ │ Status: Sent (demo)                           [View →] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Email Preview Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Email Preview                                          [×] │
├─────────────────────────────────────────────────────────────┤
│ To: sarah.thompson@email.com                               │
│ Subject: Quick update on your onboarding, Sarah            │
│ CC: compliance@meridian-healthcare.com                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Hi Sarah,                                                   │
│                                                             │
│ Great progress - you've completed 5 of your 7 compliance   │
│ requirements! Your NMC registration is verified and all    │
│ your documents look good.                                   │
│                                                             │
│ **Still needed from you:**                                  │
│ • DBS certificate - [Upload here →]                         │
│                                                             │
│ **We're handling:**                                         │
│ • Your reference is with your referee - we'll follow up    │
│                                                             │
│ Once that DBS is in, you're ready to start on Monday!      │
│                                                             │
│ Questions? Just reply to this email.                        │
│                                                             │
│ Meridian Healthcare Compliance Team                         │
│ Contact: Sarah Jones (compliance@meridian-healthcare.com)   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ▼ AI Reasoning                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Context Analysis:                                        │ │
│ │ • Candidate: Near completion (71%), starts Monday        │ │
│ │ • Blocking: 1 item on candidate (DBS), 1 on third party │ │
│ │ • Tone: Urgent but encouraging (imminent start date)    │ │
│ │ • Last email: 2 days ago (appropriate to send)          │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                              [Close]    [Copy to Clipboard] │
└─────────────────────────────────────────────────────────────┘
```

### Org Settings - AI Companion Section

```
┌─────────────────────────────────────────────────────────────┐
│ AI Companion Settings                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Enable AI Companion                              [Toggle ON] │
│ Send automated compliance emails to candidates              │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Compliance Contact                                          │
│ ┌─────────────────────┐ ┌─────────────────────────────────┐ │
│ │ Name                │ │ Sarah Jones                     │ │
│ └─────────────────────┘ └─────────────────────────────────┘ │
│ ┌─────────────────────┐ ┌─────────────────────────────────┐ │
│ │ Email               │ │ compliance@meridian.com         │ │
│ └─────────────────────┘ └─────────────────────────────────┘ │
│ ┌─────────────────────┐ ┌─────────────────────────────────┐ │
│ │ Phone               │ │ 0800 123 4567                   │ │
│ └─────────────────────┘ └─────────────────────────────────┘ │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Organisation Voice                                          │
│ Customise how the AI writes on behalf of your organisation │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ You're writing on behalf of Meridian Healthcare.        │ │
│ │                                                          │ │
│ │ Tone: Warm and supportive. We help healthcare           │ │
│ │ professionals find flexible work opportunities.          │ │
│ │                                                          │ │
│ │ Be encouraging about the shifts available once          │ │
│ │ compliant. Mention that we have roles at NHS trusts     │ │
│ │ across the North of England.                            │ │
│ │                                                          │ │
│ │ Sign off as: "Meridian Healthcare Compliance Team"      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                    [Preview Sample Email →] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Generate Email Preview

```typescript
// POST /api/companion/generate-email
interface GenerateEmailRequest {
  profileId: string;
  organisationId: string;
  previewOnly?: boolean; // default: true for playground
}

interface GenerateEmailResponse {
  subject: string;
  body: string;
  html?: string;
  context: {
    candidate: { name: string; email: string; daysInOnboarding: number };
    compliance: {
      completed: number;
      total: number;
      blockedByCandidate: string[];
      blockedByAdmin: string[];
      blockedByThirdParty: string[];
    };
    reasoning: string;
  };
}
```

### Get Candidate Communications

```typescript
// GET /api/candidates/[id]/communications
interface GetCommunicationsResponse {
  communications: {
    id: string;
    type: 'email' | 'sms' | 'voice';
    direction: 'outbound' | 'inbound';
    subject?: string;
    preview: string;
    status: 'sent' | 'preview' | 'failed';
    sentAt?: string;
    createdAt: string;
    actor: 'ai' | 'admin';
    reasoning?: string;
  }[];
}
```

### Update Org AI Settings

```typescript
// PATCH /api/organisations/[id]/settings
interface UpdateOrgSettingsRequest {
  aiCompanion?: {
    enabled?: boolean;
    orgPrompt?: string;
    complianceContact?: {
      name: string;
      email: string;
      phone?: string;
    };
  };
}
```

---

## Future Enhancements (V2+)

### V2: Dashboard Integration

- Add "AI Activity Today" section to home dashboard
- Show count of emails pending/sent
- Quick preview of next batch
- Link to full communications view

### V2: Batch Email Preview

- Page showing all candidates who would receive emails today
- Bulk preview with approval workflow
- Simulated "Run Daily Emails" for demos

### V3: Email Scheduling

- Actual cron job integration (Vercel Cron)
- Timezone-aware send times
- Frequency configuration per org

### V4: Email Sending

- Integrate with email provider (Resend)
- Email templates with org branding
- Delivery tracking and analytics

### V5: Multi-Channel

- SMS notifications
- WhatsApp integration
- Voice calls (connect to existing voice AI)

---

## Technical Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Playground UI                            │
├─────────────────────┬──────────────────────┬───────────────────┤
│  Candidate Page     │    Org Settings      │    (Future)       │
│  - Comms History    │    - AI Companion    │    Dashboard      │
│  - Email Preview    │    - Org Prompt      │    Batch Preview  │
└─────────────────────┴──────────────────────┴───────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                         API Layer                               │
├────────────────────────────────────────────────────────────────┤
│  /api/companion/generate-email                                  │
│  /api/candidates/[id]/communications                            │
│  /api/organisations/[id]/settings                               │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                    AI Generation Layer                          │
├─────────────────────┬──────────────────────┬───────────────────┤
│   System Prompt     │     Org Prompt       │  Dynamic Context  │
│   (hardcoded)       │   (from settings)    │  (from DB query)  │
└─────────────────────┴──────────────────────┴───────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                       Claude API                                │
│                    (claude-sonnet-4-5)                               │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                      Data Layer                                 │
├─────────────────────┬──────────────────────┬───────────────────┤
│     Profiles        │      Evidence        │    Activities     │
│   (candidates)      │  (compliance items)  │  (comms history)  │
└─────────────────────┴──────────────────────┴───────────────────┘
```

---

## Success Criteria

### Demo Effectiveness

- [ ] Can show personalised email for any candidate in 2 clicks
- [ ] Blocking logic clearly visible (what's on them vs us)
- [ ] Org customisation demonstrable in settings
- [ ] AI reasoning transparent and auditable
- [ ] Tone matches org voice when customised

### Technical Quality

- [ ] Email generation < 3 seconds
- [ ] No hallucinated requirements
- [ ] Blocking status always accurate
- [ ] Graceful handling of edge cases

### Code Quality

- [ ] Prompt architecture extensible for production
- [ ] Clear separation of concerns
- [ ] Type-safe throughout
- [ ] Unit tests for blocking logic

---

## Implementation Checklist

### Week 1: Data & Core Logic

- [ ] Update org settings schema (add aiCompanion, complianceContact)
- [ ] Update seed data with org contacts and AI settings
- [ ] Implement blocking analysis utility
- [ ] Add "waiting on admin/third party" evidence to seed
- [ ] Create prompt files (system, org, dynamic)
- [ ] Implement email generation function

### Week 2: API & UI

- [ ] Create `/api/companion/generate-email` endpoint
- [ ] Create `/api/candidates/[id]/communications` endpoint
- [ ] Update `/api/organisations/[id]/settings` for AI settings
- [ ] Build `CandidateCommsHistory` component
- [ ] Build `EmailPreviewCard` and `EmailDetailModal`
- [ ] Add "Communications" tab to candidate detail page
- [ ] Build org settings AI Companion section

### Week 3: Polish & Demo

- [ ] Add activity logging for generated emails
- [ ] Test all candidate scenarios
- [ ] Refine prompts based on output quality
- [ ] Create demo script/walkthrough
- [ ] Document for team

---

## References

- Production PRD: `PRD-ai-compliance-companion.md`
- Data Model: `docs/DATA_MODEL.md`
- Playground PRD: `docs/PRD-PLAYGROUND.md`
- Seed Data PRD: `docs/PRD-SEED-DATA.md`
