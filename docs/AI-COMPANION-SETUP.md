# AI Companion Setup & Testing Guide

This guide covers setup, testing, and demo of the Compliance Companion AI Agent system.

## Overview

The AI Companion system helps compliance managers by:
1. **Analyzing candidate progress** - Identifies blockers and determines priority
2. **Generating personalized emails** - AI-written communications for candidates
3. **Creating tasks** - Actionable items for compliance managers
4. **Providing insights** - Categorized by urgency and blocking status

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Compliance Companion Agent                │
│  Triggers: Scheduled (daily 9am) | Manual (on-demand)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Insights                             │
│  Priority: urgent | high | medium | low                      │
│  Category: action_required | blocker | expiry | progress     │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐     ┌─────────┐     ┌─────────┐
        │  Email  │     │  Task   │     │  Notif  │
        │ Channel │     │ Channel │     │ Channel │
        └─────────┘     └─────────┘     └─────────┘
              │               │               │
              ▼               ▼               ▼
        Candidates      Compliance       In-app
                        Managers         Alerts
```

## Setup

### 1. Environment Variables

Ensure these are set in your `.env.local`:

```bash
# Database
DATABASE_URL=postgres://...
# or
POSTGRES_URL=postgres://...

# AI (for email generation)
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Database Migration

The tasks table should already exist. If not, run:

```bash
npx drizzle-kit push
```

### 3. Seed Data

The seed script creates candidates with various blocking scenarios:

```bash
npx tsx scripts/seed.ts
```

This creates:
- **Sarah Thompson** - 45% complete, blocked by candidate (Right to Work, DBS)
- **James Wilson** - 75% complete, blocked by admin (pending review)
- **Emma Roberts** - 90% complete, blocked by third party (reference checks)
- **Michael Chen** - 60% complete, multiple blockers
- **Lisa Anderson** - 100% complete (fully compliant)

## Testing the System

### 1. Configure Organisation Settings

Navigate to **Settings > Organisation** and configure:

- **Compliance Contact** - Name, email, phone shown in communications
- **Organisation Voice** - Custom instructions for AI tone/style
- **Schedule** - Email frequency and send time

Example custom instructions:
```
You're writing on behalf of MedStaff Healthcare.
Tone: Warm, professional, and supportive.
We help healthcare professionals find flexible work opportunities.
Sign off as: "MedStaff Compliance Team"
```

### 2. Generate Email Preview

1. Go to **Candidates** page
2. Click on a candidate (e.g., Sarah Thompson)
3. Navigate to the **Communications** tab
4. Click **Generate Email Preview**

You should see:
- **AI-generated subject line** tailored to the candidate's situation
- **Personalized email body** with:
  - Progress summary (e.g., "3 of 7 items complete")
  - Items waiting on candidate (with clear actions)
  - Items being handled by staff
  - Appropriate urgency based on start date
- **AI reasoning** explaining why this email was crafted this way

### 3. View Tasks

Navigate to **/tasks** to see:

- **Stats cards** - Urgent, Overdue, Pending, Snoozed counts
- **Task cards** - Priority-coded with subject info
- **Filters** - By status, priority, source

Tasks are created automatically when:
- Email previews are generated for **high** or **urgent** priority candidates
- Priority is determined by:
  - Start date proximity (< 7 days = urgent)
  - Blocking status (candidate-blocked items)
  - Days in onboarding

### 4. Task Actions

Each task supports:
- **Mark Complete** - Task done
- **Snooze** - Defer for 1 day or 1 week
- **Dismiss** - Not actionable
- **Reopen** - Bring back completed/dismissed tasks
- **View Candidate** - Jump to candidate profile

## Demo Script

### Scenario 1: Urgent Candidate Chase

1. Open candidate **Sarah Thompson** (45% complete, starts in 5 days)
2. Go to Communications tab
3. Generate email preview
4. Note: Priority is "urgent" due to imminent start date
5. Show the AI reasoning explaining urgency
6. Navigate to Tasks - see new task created
7. Task shows "Chase Sarah - Right to Work needed"

### Scenario 2: Admin Review Required

1. Open candidate **James Wilson** (75% complete)
2. Generate email preview
3. Note: Items are blocked by admin (pending review)
4. Email reassures candidate that we're working on it
5. Task created for compliance manager to review

### Scenario 3: Fully Compliant Celebration

1. Open candidate **Lisa Anderson** (100% complete)
2. Generate email preview
3. Note: Congratulatory tone, no action required
4. No task created (nothing to follow up)

### Scenario 4: Customized Organisation Voice

1. Go to Settings > Organisation
2. Add custom instructions with specific tone
3. Click "Preview Sample Email"
4. See how the AI adapts to your organisation's voice

## API Endpoints

### Tasks API

```bash
# List tasks
GET /api/tasks?organisationId={id}&status=active

# Get single task
GET /api/tasks/{id}

# Update task
PATCH /api/tasks/{id}
Body: { "status": "completed" }

# Create task
POST /api/tasks
Body: {
  "organisationId": "...",
  "title": "Follow up with candidate",
  "priority": "high",
  "subjectType": "profile",
  "subjectId": "..."
}
```

### Communications API

```bash
# Get communication history
GET /api/candidates/{id}/communications?organisationId={id}

# Generate email preview (also creates task if high/urgent)
POST /api/candidates/{id}/communications
Body: { "organisationId": "..." }
```

### Organisation Settings API

```bash
# Get organisation with settings
GET /api/organisations/{id}

# Update AI settings
PATCH /api/organisations/{id}
Body: {
  "aiCompanion": {
    "enabled": true,
    "orgPrompt": "Custom instructions...",
    "emailFrequency": "daily",
    "sendTime": "09:00",
    "timezone": "Europe/London"
  },
  "complianceContact": {
    "name": "Sarah Jones",
    "email": "compliance@example.com",
    "phone": "0800 123 4567"
  }
}

# Preview sample email
POST /api/organisations/{id}/preview-email
```

## Blocking Logic

The system categorizes compliance items by who is blocking progress:

| Blocker | Color | Description |
|---------|-------|-------------|
| `candidate` | Orange | Waiting on candidate action |
| `admin` | Blue | Needs internal review/approval |
| `third_party` | Purple | External verification pending |
| `complete` | Green | Item completed |

Priority is calculated based on:
1. **Start date proximity** - Closer = more urgent
2. **Blocking status** - Candidate-blocked items need chasing
3. **Days in onboarding** - Long delays may need escalation
4. **Compliance percentage** - Lower progress = higher priority

## Troubleshooting

### No email generated
- Check ANTHROPIC_API_KEY is set
- Verify candidate has incomplete compliance items
- Check organisation settings are configured

### Tasks not appearing
- Ensure organisationId filter matches
- Check status filter (default is "active")
- Verify task was created (check for high/urgent priority)

### AI tone is wrong
- Update Organisation Voice in settings
- Be specific about desired tone and sign-off
- Include examples if needed

## Files Reference

| File | Purpose |
|------|---------|
| `lib/ai/agents/compliance-companion/` | Agent implementation |
| `lib/ai/channels/task/index.ts` | Task channel |
| `lib/ai/channels/index.ts` | Channel dispatcher |
| `app/api/tasks/` | Tasks API |
| `app/(app)/tasks/page.tsx` | Tasks UI |
| `components/settings/ai-companion-settings.tsx` | Settings UI |
| `components/candidate/communications.tsx` | Email preview UI |

## What's Next (Roadmap)

Features remaining to complete the AI Companion system, in priority order:

| Priority | Feature | Description | Complexity |
|----------|---------|-------------|------------|
| 1 | **Email Channel** | Integrate email provider (Resend/SendGrid) to actually send emails | Medium |
| 2 | **Scheduled Runs** | Cron job to run agent daily at org's configured time | Medium |
| 3 | **Notification Channel** | Real-time in-app notifications for compliance managers | Medium |
| 4 | **Dashboard Widget** | "Tasks Needing Attention" card on home page | Low |
| 5 | **Bulk Operations** | Run agent for all candidates in org, batch task creation | Medium |
| 6 | **Email Sending UI** | "Send" button after preview approval, confirmation flow | Low |
| 7 | **Activity Logging** | Track all sent emails with delivery status, opens, clicks | Medium |
| 8 | **Escalation Rules** | Auto-escalate tasks that aren't actioned within SLA | High |
| 9 | **Analytics Dashboard** | Email performance, task completion rates, response times | High |

### Implementation Notes

**Email Channel (Priority 1)**
- Add Resend or SendGrid SDK
- Create `lib/ai/channels/email/index.ts`
- Handle bounce/complaint webhooks
- Add email templates with org branding

**Scheduled Runs (Priority 2)**
- Use Vercel Cron or external scheduler
- Create `/api/cron/compliance-companion` endpoint
- Respect org timezone and send time settings
- Rate limit to avoid overwhelming candidates

**Notification Channel (Priority 3)**
- Create notifications table
- Real-time updates via polling or WebSocket
- Badge count in sidebar
- Mark as read/dismiss functionality

**Dashboard Widget (Priority 4)**
- Add to home page (`app/(app)/page.tsx`)
- Show top 5 urgent tasks
- Quick actions (complete, snooze)
- Link to full tasks page
