# PRD: AI Compliance Agents Platform (Playground)

**Status:** Draft
**Created:** 2025-01-03
**Owner:** Engineering
**Priority:** High

---

## Overview

Build a modular AI Agent platform in the Credentially 2.0 Playground that supports multiple agents, audiences, and delivery channels. The first implementation focuses on the Compliance Companion agent, but the architecture must support expansion to other agents and channels.

### The Vision

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI AGENT PLATFORM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │ Compliance  │    │  Recruiter  │    │   Future    │        │
│   │ Companion   │    │  Assistant  │    │   Agents    │        │
│   │   Agent     │    │    Agent    │    │    ...      │        │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│          │                  │                  │                │
│          ▼                  ▼                  ▼                │
│   ┌─────────────────────────────────────────────────────┐      │
│   │              INSIGHT / ACTION ENGINE                 │      │
│   │   Agents produce insights about what's important     │      │
│   └──────────────────────────┬──────────────────────────┘      │
│                              │                                  │
│          ┌───────────────────┼───────────────────┐             │
│          ▼                   ▼                   ▼             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │  Candidate  │    │  Compliance │    │  Recruiter  │        │
│   │  Audience   │    │   Manager   │    │  Audience   │        │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│          │                  │                  │                │
│          ▼                  ▼                  ▼                │
│   ┌─────────────────────────────────────────────────────┐      │
│   │                 CHANNEL ADAPTERS                     │      │
│   │  Email │ In-App Task │ Notification │ SMS │ Voice   │      │
│   └─────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Separation of Concerns**
   - **Agent**: Decides WHAT is important (analysis)
   - **Router**: Decides WHO should know (audience)
   - **Channel**: Decides HOW to deliver (medium)

2. **Primitive Alignment**
   - P021 (AI Agent) → Agent layer
   - P009 (Notifications) → Channel layer
   - P005 (Events) → Trigger layer
   - P006 (Scheduled Actions) → Execution layer
   - P010 (HITL) → Escalation handling
   - P004 (Audit) → Activity logging

3. **Extensibility First**
   - New agents can be added without changing channels
   - New channels can be added without changing agents
   - Audience routing is configurable per org

### MVP Scope

**In Scope (V1):**
- ✅ Compliance Companion Agent (candidate onboarding)
- ✅ Candidate audience (their own status)
- ✅ Compliance Manager audience (candidates needing attention)
- ✅ Email channel (candidates) - preview only
- ✅ In-app Tasks channel (compliance managers)
- ✅ Communications history UI

**Future Scope:**
- ❌ Recruiter Assistant Agent
- ❌ SMS/WhatsApp channels
- ❌ Voice channel
- ❌ Actual email sending
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

## Modular Architecture

### Layer 1: Agents

Agents are the "brain" - they analyze context and produce insights/recommendations.

```typescript
// lib/ai/agents/types.ts
interface Agent {
  id: string;
  name: string;
  description: string;

  // What triggers this agent to run?
  triggers: AgentTrigger[];

  // Who can this agent produce insights for?
  audiences: AudienceType[];

  // Run the agent for a specific context
  run(context: AgentContext): Promise<AgentInsight[]>;
}

interface AgentTrigger {
  type: 'scheduled' | 'event' | 'manual';
  config: {
    schedule?: string;        // Cron expression for scheduled
    eventType?: string;       // Event name for event-triggered
  };
}

type AudienceType = 'candidate' | 'compliance_manager' | 'recruiter' | 'admin';
```

**MVP Agents:**

| Agent | Description | Audiences |
|-------|-------------|-----------|
| **Compliance Companion** | Monitors candidate onboarding progress, identifies blockers, generates personalized guidance | Candidate, Compliance Manager |

**Future Agents:**

| Agent | Description | Audiences |
|-------|-------------|-----------|
| Recruiter Assistant | Pipeline health, candidate engagement | Recruiter |
| Document Processor | AI document review, extraction | Compliance Manager |
| Expiry Monitor | Ongoing compliance, renewal tracking | Candidate, Compliance Manager |

### Layer 2: Insights

Insights are the output of agents - structured data about what's important.

```typescript
// lib/ai/agents/types.ts
interface AgentInsight {
  id: string;
  agentId: string;

  // What is this about?
  subjectType: 'profile' | 'placement' | 'evidence' | 'escalation';
  subjectId: string;

  // Who should receive this?
  audiences: AudienceInsight[];

  // Classification
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'progress' | 'blocker' | 'expiry' | 'action_required' | 'celebration';

  // The insight content (structured)
  summary: string;
  details: Record<string, unknown>;

  // AI-generated content for each channel (lazy-loaded)
  content?: {
    email?: EmailContent;
    task?: TaskContent;
    notification?: NotificationContent;
  };

  // When to deliver (for batching)
  deliverAt?: Date;

  createdAt: Date;
}

interface AudienceInsight {
  audienceType: AudienceType;
  recipientId?: string;        // Specific user, or null for role-based
  channels: ChannelType[];     // Which channels to use
}
```

**Example Insight:**

```typescript
const insight: AgentInsight = {
  id: 'ins_123',
  agentId: 'compliance-companion',
  subjectType: 'profile',
  subjectId: 'sarah-thompson-id',
  priority: 'high',
  category: 'action_required',
  summary: 'Sarah Thompson needs DBS certificate, starts Monday',
  details: {
    candidateName: 'Sarah Thompson',
    completedItems: 5,
    totalItems: 7,
    missingItems: ['DBS Certificate'],
    blockedByCandidate: ['DBS Certificate'],
    blockedByAdmin: [],
    blockedByThirdParty: ['Employment Reference'],
    startDate: '2025-01-06',
    daysUntilStart: 3,
  },
  audiences: [
    {
      audienceType: 'candidate',
      recipientId: 'sarah-thompson-id',
      channels: ['email'],
    },
    {
      audienceType: 'compliance_manager',
      recipientId: null, // Assigned CM
      channels: ['task', 'notification'],
    },
  ],
  createdAt: new Date(),
};
```

### Layer 3: Channels

Channels are the delivery mechanism - they format insights for specific mediums.

```typescript
// lib/ai/channels/types.ts
type ChannelType = 'email' | 'task' | 'notification' | 'sms' | 'voice';

interface Channel {
  type: ChannelType;
  name: string;

  // Can this channel reach this audience?
  supportsAudience(audience: AudienceType): boolean;

  // Format insight for this channel
  format(insight: AgentInsight, audience: AudienceInsight): Promise<ChannelContent>;

  // Deliver (or preview) the content
  deliver(content: ChannelContent, options: DeliverOptions): Promise<DeliveryResult>;
}

interface DeliverOptions {
  preview: boolean;           // Don't actually send
  recipientOverride?: string; // Send to different recipient (testing)
}
```

**MVP Channels:**

| Channel | Audience | Purpose | MVP Status |
|---------|----------|---------|------------|
| **Email** | Candidate | External async communication | Preview only |
| **Task** | Compliance Manager | Internal actionable items | Full (in-app) |
| **Notification** | Compliance Manager | Internal alerts | Full (in-app) |

**Channel Implementations:**

```typescript
// lib/ai/channels/email-channel.ts
export const emailChannel: Channel = {
  type: 'email',
  name: 'Email',

  supportsAudience: (audience) =>
    ['candidate', 'recruiter'].includes(audience),

  async format(insight, audience) {
    // Use AI to generate email content
    const { subject, body } = await generateEmail(insight, audience);
    return { type: 'email', subject, body, html: renderEmailHtml(body) };
  },

  async deliver(content, options) {
    if (options.preview) {
      return { status: 'preview', content };
    }
    // Future: actually send via Resend
    return { status: 'sent', messageId: '...' };
  },
};

// lib/ai/channels/task-channel.ts
export const taskChannel: Channel = {
  type: 'task',
  name: 'In-App Task',

  supportsAudience: (audience) =>
    ['compliance_manager', 'recruiter', 'admin'].includes(audience),

  async format(insight, audience) {
    return {
      type: 'task',
      title: insight.summary,
      description: formatTaskDescription(insight),
      priority: insight.priority,
      dueDate: insight.details.startDate,
      linkedEntity: {
        type: insight.subjectType,
        id: insight.subjectId,
      },
    };
  },

  async deliver(content, options) {
    // Create task in database
    const task = await createTask(content);
    return { status: 'created', taskId: task.id };
  },
};
```

### Layer 4: Orchestration

The orchestrator ties everything together:

```typescript
// lib/ai/agents/orchestrator.ts
export class AgentOrchestrator {
  private agents: Map<string, Agent>;
  private channels: Map<ChannelType, Channel>;

  // Run all agents for an organisation
  async runDaily(organisationId: string): Promise<OrchestratorResult> {
    const insights: AgentInsight[] = [];

    // Run each enabled agent
    for (const agent of this.getEnabledAgents(organisationId)) {
      const context = await this.buildContext(agent, organisationId);
      const agentInsights = await agent.run(context);
      insights.push(...agentInsights);
    }

    // Route insights to channels
    const deliveries: DeliveryResult[] = [];
    for (const insight of insights) {
      for (const audience of insight.audiences) {
        for (const channelType of audience.channels) {
          const channel = this.channels.get(channelType);
          const content = await channel.format(insight, audience);
          const result = await channel.deliver(content, { preview: true });
          deliveries.push(result);
        }
      }
    }

    // Log activity
    await this.logActivity(organisationId, insights, deliveries);

    return { insights, deliveries };
  }
}
```

### Data Flow Example

**Scenario:** Daily run for Meridian Healthcare

```
1. TRIGGER: Scheduled job fires at 9am

2. AGENT: Compliance Companion runs
   └── Scans all active onboarding candidates
   └── For each candidate:
       ├── Calculate compliance status
       ├── Analyze blocking items
       └── Generate insight

3. INSIGHTS PRODUCED:
   ├── Sarah Thompson: high priority, DBS needed, starts Monday
   ├── James Wilson: urgent, stuck 14 days, needs escalation
   └── Emily Chen: low priority, fully compliant (celebration)

4. ROUTING:
   Sarah's insight →
   ├── Candidate (Sarah): email channel
   └── Compliance Manager: task + notification channels

5. FORMATTING:
   ├── Email: AI generates personalized message for Sarah
   ├── Task: "Chase Sarah Thompson - DBS needed for Monday start"
   └── Notification: "High priority: Sarah Thompson blocked on DBS"

6. DELIVERY:
   ├── Email: Preview stored (not sent in MVP)
   ├── Task: Created in tasks table
   └── Notification: Created in notifications table

7. ACTIVITY LOG:
   └── Record all actions with AI reasoning
```

---

## Tasks System (New)

To support compliance managers, we need an in-app tasks system.

### Task Schema

```typescript
// lib/db/schema/tasks.ts
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull(),

  // Who is this task for?
  assigneeId: uuid("assignee_id"),              // Specific user
  assigneeRole: varchar("assignee_role"),       // Or role-based (e.g., "compliance_manager")

  // What is this task about?
  subjectType: varchar("subject_type", {
    enum: ["profile", "placement", "evidence", "escalation"],
  }),
  subjectId: uuid("subject_id"),

  // Task details
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority", {
    enum: ["low", "medium", "high", "urgent"],
  }).default("medium"),

  // Source tracking
  source: varchar("source", {
    enum: ["ai_agent", "manual", "system"],
  }).notNull(),
  agentId: varchar("agent_id"),                 // Which agent created this
  insightId: uuid("insight_id"),                // Link to insight

  // Status
  status: varchar("status", {
    enum: ["pending", "in_progress", "completed", "dismissed"],
  }).default("pending"),

  // Dates
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  completedBy: uuid("completed_by"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Task UI Integration

Tasks appear in multiple places:

1. **Tasks Page** (`/tasks`) - Full task list with filters
2. **Home Dashboard** - "Tasks needing attention" widget
3. **Candidate Page** - Tasks related to this candidate

### Task Actions

| Action | Description |
|--------|-------------|
| View | Open linked entity (e.g., candidate profile) |
| Complete | Mark as done |
| Dismiss | Acknowledge but don't action |
| Snooze | Delay until later |
| Reassign | Move to different user/role |

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

### Directory Structure

```
lib/ai/
├── agents/                           # Agent Layer (P021)
│   ├── types.ts                      # Agent, Insight, Trigger interfaces
│   ├── orchestrator.ts               # Runs agents, routes insights
│   ├── compliance-companion/         # First agent implementation
│   │   ├── index.ts                  # Agent definition
│   │   ├── analyzer.ts               # Compliance analysis logic
│   │   ├── blocking.ts               # Blocking status derivation
│   │   └── prompts.ts                # System + dynamic prompts
│   └── registry.ts                   # Agent registration
│
├── channels/                         # Channel Layer (P009)
│   ├── types.ts                      # Channel interfaces
│   ├── email/                        # Email channel
│   │   ├── index.ts                  # Channel implementation
│   │   ├── formatter.ts              # AI content generation
│   │   └── templates.ts              # Email HTML templates
│   ├── task/                         # Task channel
│   │   ├── index.ts                  # Channel implementation
│   │   └── formatter.ts              # Task content formatting
│   ├── notification/                 # Notification channel
│   │   └── index.ts                  # Channel implementation
│   └── registry.ts                   # Channel registration
│
├── insights/                         # Insight storage & routing
│   ├── types.ts                      # Insight interfaces
│   ├── router.ts                     # Audience routing logic
│   └── storage.ts                    # Insight persistence
│
└── prompts/                          # Shared prompt components
    ├── system-prompt.ts              # Core AI behaviour
    └── org-prompt.ts                 # Org-specific voice
```

### System Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         PLAYGROUND UI                               │
├──────────────┬───────────────┬────────────────┬────────────────────┤
│  Candidate   │   Tasks       │   Org          │   Home             │
│  Page        │   Page        │   Settings     │   Dashboard        │
│  - Comms     │   - Task List │   - AI Config  │   - Task Widget    │
│  - Preview   │   - Filters   │   - Org Prompt │   - Activity Feed  │
└──────┬───────┴───────┬───────┴────────┬───────┴────────┬───────────┘
       │               │                │                │
       ▼               ▼                ▼                ▼
┌────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                 │
├────────────────────────────────────────────────────────────────────┤
│  /api/agents/run                    Run agent manually              │
│  /api/agents/[id]/insights          Get insights for agent          │
│  /api/candidates/[id]/communications Get comms history              │
│  /api/tasks                         Task CRUD                       │
│  /api/organisations/[id]/settings   Update org AI settings          │
└────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                      AGENT ORCHESTRATOR                             │
├────────────────────────────────────────────────────────────────────┤
│  1. Load enabled agents for org                                     │
│  2. Build context (candidates, evidence, activities)                │
│  3. Run each agent → produce insights                               │
│  4. Route insights to audiences                                     │
│  5. Format for channels                                             │
│  6. Deliver (or preview)                                            │
│  7. Log activities                                                  │
└────────────────────────────────────────────────────────────────────┘
         │                    │                     │
         ▼                    ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ COMPLIANCE      │  │ (FUTURE)        │  │ (FUTURE)        │
│ COMPANION       │  │ RECRUITER       │  │ DOCUMENT        │
│ AGENT           │  │ ASSISTANT       │  │ PROCESSOR       │
└────────┬────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│                        INSIGHT ENGINE                               │
├────────────────────────────────────────────────────────────────────┤
│  Insights: { subject, priority, category, audiences[], content }   │
└────────────────────────────────────────────────────────────────────┘
         │
         ├─────────────────────┬─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ EMAIL CHANNEL   │  │ TASK CHANNEL    │  │ NOTIFICATION    │
│ (Candidates)    │  │ (Staff)         │  │ CHANNEL (Staff) │
│ [Preview Only]  │  │ [Full]          │  │ [Full]          │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                     │
         ▼                    ▼                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                  │
├──────────────┬────────────┬────────────┬────────────┬──────────────┤
│  profiles    │  evidence  │  tasks     │ activities │ insights     │
│              │            │  (NEW)     │            │ (NEW)        │
└──────────────┴────────────┴────────────┴────────────┴──────────────┘
```

### New Database Tables

| Table | Purpose |
|-------|---------|
| `tasks` | In-app tasks for staff (compliance managers, recruiters) |
| `insights` | Stored agent insights (optional, for analytics/replay) |
| `agent_runs` | Log of when agents ran (for debugging/audit) |

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

### Phase 1: Foundation (Week 1)

**Data Layer:**
- [ ] Create `tasks` schema (`lib/db/schema/tasks.ts`)
- [ ] Update org settings schema (add aiCompanion, complianceContact)
- [ ] Update seed data with org contacts and AI settings
- [ ] Add "waiting on admin/third party" evidence to seed
- [ ] Run migration

**Agent Framework:**
- [ ] Create agent types (`lib/ai/agents/types.ts`)
- [ ] Create channel types (`lib/ai/channels/types.ts`)
- [ ] Create insight types (`lib/ai/insights/types.ts`)
- [ ] Implement agent orchestrator (`lib/ai/agents/orchestrator.ts`)
- [ ] Implement blocking analysis utility (`lib/ai/agents/compliance-companion/blocking.ts`)

### Phase 2: Compliance Companion Agent (Week 1-2)

**Agent Implementation:**
- [ ] Create Compliance Companion agent (`lib/ai/agents/compliance-companion/index.ts`)
- [ ] Implement compliance analyzer (`lib/ai/agents/compliance-companion/analyzer.ts`)
- [ ] Create system prompt (`lib/ai/agents/compliance-companion/prompts.ts`)
- [ ] Add org prompt fetching

**Channel Implementations:**
- [ ] Implement email channel (preview only) (`lib/ai/channels/email/`)
- [ ] Implement task channel (`lib/ai/channels/task/`)
- [ ] Implement notification channel (`lib/ai/channels/notification/`)

### Phase 3: API Layer (Week 2)

- [ ] Create `/api/agents/run` - Run agent for org
- [ ] Create `/api/agents/[id]/insights` - Get agent insights
- [ ] Create `/api/candidates/[id]/communications` - Get comms history
- [ ] Create `/api/tasks` - Task CRUD
- [ ] Update `/api/organisations/[id]/settings` for AI settings

### Phase 4: UI (Week 2-3)

**Candidate Page:**
- [ ] Build `CandidateCommsHistory` component
- [ ] Build `EmailPreviewCard` component
- [ ] Build `EmailDetailModal` with AI reasoning
- [ ] Add "Communications" tab to candidate detail page

**Tasks Page (NEW):**
- [ ] Create `/tasks` page
- [ ] Build task list with filters (priority, status, subject)
- [ ] Build task detail view
- [ ] Add task actions (complete, dismiss, snooze)

**Org Settings:**
- [ ] Build AI Companion settings section
- [ ] Add org prompt textarea
- [ ] Add compliance contact fields
- [ ] Add "Preview Sample Email" button

**Home Dashboard:**
- [ ] Add "Tasks Needing Attention" widget
- [ ] Add "AI Activity Today" summary

### Phase 5: Polish & Demo (Week 3)

- [ ] Activity logging for all agent actions
- [ ] Test all candidate scenarios
- [ ] Refine prompts based on output quality
- [ ] Add "Run Daily Agent" demo button
- [ ] Create demo script/walkthrough
- [ ] Document architecture for team

---

## References

- Production PRD: `PRD-ai-compliance-companion.md`
- Data Model: `docs/DATA_MODEL.md`
- Playground PRD: `docs/PRD-PLAYGROUND.md`
- Seed Data PRD: `docs/PRD-SEED-DATA.md`
