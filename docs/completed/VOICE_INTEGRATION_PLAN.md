# Voice AI Integration Plan

**Status:** Complete
**Completed:** 2025-12-29

This document outlines the plan to integrate the voice-ai system into the cred-ai application as a **generic voice communication channel** that can support multiple use cases.

## Overview

Voice AI is a communication channel that enables outbound phone calls with dynamically configured AI agents. Each call is driven by a **template** that defines:
- The agent's instructions/persona
- Data fields to capture during the call
- Context variables to inject into the conversation

### Current Use Case: Employment Verification
The initial implementation focuses on reference checking, but the architecture supports future use cases like surveys, appointment reminders, document collection, and more.

### Integration Goals

1. **Generic architecture** - Support any voice use case via templates
2. **Database persistence** - Store calls, templates, and results in PostgreSQL
3. **Sample data** - Use controlled test data for demo purposes
4. **Authentication** - Require login to access voice features
5. **Standalone pages** - Dedicated UI for voice call management

---

## Architecture

### Core Concepts

| Concept | Description |
|---------|-------------|
| **VoiceTemplate** | Defines a type of call: instructions, data schema, VAPI assistant config |
| **VoiceCall** | A single call instance with context, status, and captured data |
| **Context** | Variables passed to the agent (e.g., candidate name, company) |
| **CapturedData** | Structured output from the call (e.g., verified employment details) |

### New Directory Structure

```
app/
├── (voice)/                              # Voice section (requires auth)
│   ├── layout.tsx                        # Voice section layout
│   ├── page.tsx                          # Dashboard: recent calls, templates
│   ├── templates/
│   │   ├── page.tsx                      # List available templates
│   │   └── [slug]/
│   │       └── page.tsx                  # Template detail + start call
│   ├── calls/
│   │   ├── page.tsx                      # Call history
│   │   └── [id]/
│   │       └── page.tsx                  # Call detail (transcript, results)
│   └── demo/                             # Demo-specific pages (MVP)
│       ├── page.tsx                      # Demo dashboard
│       └── candidates/
│           ├── page.tsx                  # Sample candidates list
│           └── [id]/
│               └── page.tsx              # Candidate detail + initiate call
├── (chat)/
│   └── api/
│       └── voice/                        # Voice API endpoints
│           ├── calls/
│           │   ├── route.ts              # GET list, POST create
│           │   └── [id]/
│           │       ├── route.ts          # GET single call
│           │       └── status/
│           │           └── route.ts      # GET poll status
│           └── templates/
│               └── route.ts              # GET list templates

lib/
├── voice/                                # Voice module
│   ├── vapi-client.ts                    # VAPI SDK wrapper
│   ├── templates.ts                      # Template definitions
│   └── types.ts                          # Voice-specific types
├── db/
│   └── schema.ts                         # Add voice tables
│   └── queries.ts                        # Add voice queries

components/
├── voice/                                # Voice components
│   ├── call-form.tsx                     # Dynamic call form from template
│   ├── call-card.tsx                     # Call summary card
│   ├── call-status-badge.tsx             # Status indicator
│   ├── call-results.tsx                  # Display captured data
│   ├── initiate-call-button.tsx          # Button with polling
│   ├── transcript-viewer.tsx             # Formatted transcript
│   └── data-comparison-table.tsx         # Compare expected vs captured

hooks/
└── use-call-polling.ts                   # Poll for call status

data/
└── demo/
    └── candidates.ts                     # Sample candidates for demo
```

### Database Schema

Add to `lib/db/schema.ts`:

```ts
// ============================================
// Voice Tables
// ============================================

/**
 * Voice call templates define reusable call configurations.
 * Each template specifies the agent behavior, data to capture,
 * and can be associated with a VAPI assistant.
 *
 * For MVP, templates are defined in code (lib/voice/templates.ts).
 * This table supports future dynamic template creation.
 */
export const voiceTemplate = pgTable('VoiceTemplate', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  slug: text('slug').notNull().unique(),              // URL-friendly identifier
  name: text('name').notNull(),                       // Human-readable name
  description: text('description'),                   // What this template does

  // Agent configuration
  systemPrompt: text('systemPrompt'),                 // Agent instructions
  vapiAssistantId: text('vapiAssistantId'),          // VAPI assistant to use

  // Schema definitions (JSON)
  contextSchema: jsonb('contextSchema').$type<FieldSchema[]>(),   // Expected input fields
  captureSchema: jsonb('captureSchema').$type<FieldSchema[]>(),   // Data to extract

  // Ownership & status
  userId: uuid('userId').references(() => user.id),   // null = system template
  isActive: boolean('isActive').notNull().default(true),

  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

/**
 * Voice calls represent individual call instances.
 * Generic structure supports any template/use case.
 */
export const voiceCall = pgTable('VoiceCall', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),

  // Relationships
  userId: uuid('userId').notNull().references(() => user.id),
  templateId: uuid('templateId').references(() => voiceTemplate.id),
  templateSlug: text('templateSlug').notNull(),       // Denormalized for queries

  // Call target
  phoneNumber: text('phoneNumber').notNull(),         // E.164 format
  recipientName: text('recipientName'),               // Optional display name

  // Dynamic data (schema defined by template)
  context: jsonb('context').$type<Record<string, unknown>>().notNull(),
  capturedData: jsonb('capturedData').$type<Record<string, unknown>>(),

  // VAPI integration
  vapiCallId: text('vapiCallId').unique(),
  vapiAssistantId: text('vapiAssistantId'),

  // Status tracking
  status: text('status').$type<VoiceCallStatus>().notNull().default('pending'),

  // Results (populated when call ends)
  recordingUrl: text('recordingUrl'),
  transcript: jsonb('transcript').$type<TranscriptMessage[]>(),
  duration: integer('duration'),                      // Call duration in seconds
  outcome: text('outcome').$type<'completed' | 'no_answer' | 'busy' | 'failed' | 'voicemail'>(),

  // Timestamps
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  scheduledAt: timestamp('scheduledAt'),              // For future: scheduled calls
  startedAt: timestamp('startedAt'),
  endedAt: timestamp('endedAt'),
});

// ============================================
// Type Definitions
// ============================================

type VoiceCallStatus =
  | 'pending'      // Created, not yet sent to VAPI
  | 'queued'       // VAPI has queued the call
  | 'ringing'      // Phone is ringing
  | 'in-progress'  // Call connected
  | 'ended'        // Call completed
  | 'failed';      // Call failed

interface TranscriptMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp?: number;
}

interface FieldSchema {
  key: string;                                        // Field identifier
  label: string;                                      // Display label
  type: 'string' | 'date' | 'phone' | 'email' | 'boolean' | 'select';
  required?: boolean;
  options?: string[];                                 // For select type
  description?: string;                               // Help text
}
```

### Template System

Templates define reusable call configurations. For MVP, templates are defined in code:

```ts
// lib/voice/templates.ts

export interface VoiceTemplate {
  slug: string;
  name: string;
  description: string;
  vapiAssistantId: string;                // VAPI assistant for this template

  // Fields the caller must provide (injected as VAPI variables)
  contextSchema: FieldSchema[];

  // Fields the agent will try to capture
  captureSchema: FieldSchema[];

  // Optional: UI customization
  ui?: {
    buttonLabel?: string;                 // e.g., "Start Reference Call"
    successMessage?: string;
    icon?: string;
  };
}

export const templates: Record<string, VoiceTemplate> = {
  'employment-verification': {
    slug: 'employment-verification',
    name: 'Employment Verification',
    description: 'Verify employment history with a previous employer',
    vapiAssistantId: process.env.VAPI_ASSISTANT_ID_EMPLOYMENT!,

    contextSchema: [
      { key: 'candidateName', label: 'Candidate Name', type: 'string', required: true },
      { key: 'jobTitle', label: 'Job Title', type: 'string', required: true },
      { key: 'companyName', label: 'Company', type: 'string', required: true },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'endDate', label: 'End Date', type: 'date' },
      { key: 'employmentType', label: 'Employment Type', type: 'select',
        options: ['full-time', 'part-time', 'contract', 'intern'] },
    ],

    captureSchema: [
      { key: 'confirmed_jobTitle', label: 'Confirmed Job Title', type: 'string' },
      { key: 'confirmed_startDate', label: 'Confirmed Start Date', type: 'date' },
      { key: 'confirmed_endDate', label: 'Confirmed End Date', type: 'date' },
      { key: 'confirmed_employmentType', label: 'Confirmed Type', type: 'string' },
      { key: 'eligible_for_rehire', label: 'Eligible for Rehire', type: 'boolean' },
      { key: 'additional_notes', label: 'Additional Notes', type: 'string' },
    ],

    ui: {
      buttonLabel: 'Initiate Reference Call',
      successMessage: 'Employment verification complete',
    },
  },

  // Future templates (not implemented in MVP)
  // 'candidate-survey': { ... },
  // 'appointment-reminder': { ... },
  // 'document-request': { ... },
};

export function getTemplate(slug: string): VoiceTemplate | undefined {
  return templates[slug];
}

export function listTemplates(): VoiceTemplate[] {
  return Object.values(templates);
}
```

### Environment Variables

```bash
# VAPI Voice AI (required)
VAPI_API_KEY=                           # VAPI authentication token
VAPI_PHONE_NUMBER_ID=                   # VAPI phone number to call FROM

# Template-specific assistants
VAPI_ASSISTANT_ID_EMPLOYMENT=           # Employment verification assistant

# Future templates would have their own assistant IDs
# VAPI_ASSISTANT_ID_SURVEY=
# VAPI_ASSISTANT_ID_APPOINTMENT=
```

---

## Implementation Steps

### Phase 1: Foundation ✅

#### 1.1 Types & Templates
- [x] Create `lib/voice/types.ts` with type definitions
- [x] Create `lib/voice/templates.ts` with employment verification template
- [x] Define `FieldSchema` and `VoiceTemplate` interfaces

#### 1.2 Database Setup
- [x] Add `voiceTemplate` table to schema (for future use)
- [x] Add `voiceCall` table with generic structure
- [x] Run `pnpm db:generate` and `pnpm db:migrate`

#### 1.3 VAPI Client
- [x] Create `lib/voice/vapi-client.ts`
- [x] Implement `initiateCall({ phoneNumber, assistantId, variables })`
- [x] Implement `getCallStatus(callId)`
- [x] Add error handling and types

#### 1.4 Sample Data
- [x] Create `data/demo/candidates.ts` with test candidates
- [x] Include work history with controllable phone numbers (3 candidates, 9 work histories)

### Phase 2: API Routes ✅

#### 2.1 Create Call
`POST /api/voice/calls`
- [x] Validate template slug and context against schema
- [x] Check authentication
- [x] Create database record
- [x] Initiate VAPI call with template's assistant
- [x] Return call ID

#### 2.2 Get Call Status
`GET /api/voice/calls/[id]/status`
- [x] Verify user owns call
- [x] Fetch latest status from VAPI
- [x] Update database if changed
- [x] Save transcript and captured data when ended
- [x] Return current state

#### 2.3 Get Call Detail
`GET /api/voice/calls/[id]`
- [x] Return full call record with results

#### 2.4 List Calls
`GET /api/voice/calls`
- [x] Paginated list of user's calls
- [x] Filter by template, status, date range

#### 2.5 List Templates
`GET /api/voice/templates`
- [x] Return available templates

### Phase 3: Database Queries ✅

Add to `lib/db/queries.ts`:

- [x] `createVoiceCall(params)` - Insert new call
- [x] `getVoiceCallById(id, userId)` - Get with ownership check
- [x] `getVoiceCallByVapiId(vapiCallId)` - Lookup by VAPI ID
- [x] `updateVoiceCall(id, data)` - Update status/results
- [x] `listVoiceCalls(userId, filters)` - Paginated list
- [x] `getRecentVoiceCalls(userId, limit)` - Recent calls (bonus)
- [x] `getVoiceCallStats(userId)` - Call statistics (bonus)

### Phase 4: Components ✅

#### 4.1 Core Components
- [x] `components/voice/call-form.tsx` - Dynamic form from template schema
- [x] `components/voice/call-status-badge.tsx` - Status indicator
- [x] `components/voice/call-card.tsx` - Call summary for lists

#### 4.2 Results Components
- [x] `components/voice/call-results-sheet.tsx` - Display captured data with comparison
- [x] `components/voice/transcript-viewer.tsx` - Formatted transcript with download

#### 4.3 Polling Hook
- [x] `hooks/use-call-polling.ts` - Poll status endpoint (5s interval, 10min timeout)

### Phase 5: Pages ✅

#### 5.1 Layout & Dashboard
- [x] `app/(chat)/voice/page.tsx` - Dashboard with stats and recent calls

#### 5.2 Call Pages
- [x] `app/(chat)/voice/calls/page.tsx` - Call history list

#### 5.3 Demo Pages (Employment Verification)
- [x] `app/(chat)/voice/demo/page.tsx` - Demo candidates listing
- [x] `app/(chat)/voice/demo/[candidateId]/page.tsx` - Candidate detail with work history
- [x] `app/(chat)/voice/demo/[candidateId]/[workHistoryId]/page.tsx` - Verification workflow

### Phase 6: Polish ✅

- [x] Add voice to main navigation
- [x] Error handling and user feedback
- [x] Loading states and skeletons
- [x] Real-time status polling with visual feedback

---

## API Specifications

### POST /api/voice/calls

Create a new call using a template.

**Request:**
```ts
{
  templateSlug: string;                   // Which template to use
  phoneNumber: string;                    // E.164 format: +1234567890
  recipientName?: string;                 // Optional display name
  context: Record<string, unknown>;       // Template-specific variables
}
```

**Response:**
```ts
{
  success: true;
  call: {
    id: string;
    status: 'pending' | 'queued';
  };
}
```

**Validation:**
- Template must exist and be active
- Context must satisfy template's `contextSchema`
- Phone number must be valid E.164 format

### GET /api/voice/calls/[id]/status

Poll for call status updates.

**Response:**
```ts
{
  id: string;
  status: VoiceCallStatus;
  duration?: number;
  outcome?: 'completed' | 'no_answer' | 'busy' | 'failed' | 'voicemail';

  // Only when status is 'ended'
  recordingUrl?: string;
  transcript?: TranscriptMessage[];
  capturedData?: Record<string, unknown>;
}
```

### GET /api/voice/calls/[id]

Get full call details.

**Response:**
```ts
{
  id: string;
  templateSlug: string;
  phoneNumber: string;
  recipientName?: string;
  context: Record<string, unknown>;
  capturedData?: Record<string, unknown>;
  status: VoiceCallStatus;
  outcome?: string;
  recordingUrl?: string;
  transcript?: TranscriptMessage[];
  duration?: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}
```

### GET /api/voice/calls

List calls with filtering.

**Query params:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `templateSlug` - Filter by template
- `status` - Filter by status
- `from` / `to` - Date range

**Response:**
```ts
{
  calls: VoiceCall[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### GET /api/voice/templates

List available templates.

**Response:**
```ts
{
  templates: Array<{
    slug: string;
    name: string;
    description: string;
    contextSchema: FieldSchema[];
    captureSchema: FieldSchema[];
    ui?: { buttonLabel?: string; icon?: string };
  }>;
}
```

---

## Component Specifications

### CallForm

Renders a dynamic form based on template's `contextSchema`.

```ts
interface CallFormProps {
  template: VoiceTemplate;
  phoneNumber: string;
  recipientName?: string;
  defaultValues?: Record<string, unknown>;
  onSubmit: (context: Record<string, unknown>) => void;
  isSubmitting?: boolean;
}
```

### InitiateCallButton

Handles call initiation and status polling.

```ts
interface InitiateCallButtonProps {
  templateSlug: string;
  phoneNumber: string;
  recipientName?: string;
  context: Record<string, unknown>;
  onCallComplete?: (call: VoiceCall) => void;
  buttonLabel?: string;                   // Override template default
}
```

**States:**
- Idle → "Initiate Call"
- Creating → "Starting..."
- Queued → "Queued..."
- Ringing → "Ringing..."
- In Progress → "In Progress..."
- Ended → "View Results"
- Failed → "Call Failed" (with retry)

### DataComparisonTable

Compares `context` (expected) vs `capturedData` (verified).

```ts
interface DataComparisonTableProps {
  template: VoiceTemplate;
  context: Record<string, unknown>;
  capturedData: Record<string, unknown>;
}
```

Uses `captureSchema` to determine which fields to compare and how to label them.

---

## Sample Data Structure

```ts
// data/demo/candidates.ts

export interface DemoCandidate {
  id: string;
  name: string;
  email: string;
  workHistory: DemoWorkHistory[];
}

export interface DemoWorkHistory {
  id: string;
  jobTitle: string;
  companyName: string;
  startDate: string;
  endDate?: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'intern';
  reference?: {
    name: string;
    title: string;
    phone: string;                        // Controllable test number
    email?: string;
  };
}

export const demoCandidates: DemoCandidate[] = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell@example.com',
    workHistory: [
      {
        id: 'wh-1',
        jobTitle: 'Software Engineer',
        companyName: 'Acme Inc',
        startDate: '2020-03',
        endDate: '2023-12',
        employmentType: 'full-time',
        reference: {
          name: 'John Smith',
          title: 'Engineering Manager',
          phone: '+1234567890',           // Your test number
        },
      },
    ],
  },
  // ... more candidates
];
```

---

## Files to Delete After Migration

```
voice-ai/                                 # DELETE entire directory after migration
```

---

## Testing Checklist

### API ✅
- [x] Create call validates template and context
- [x] Create call validates phone format (E.164)
- [x] Status endpoint returns correct state
- [x] Status endpoint updates DB on completion
- [x] Unauthorized requests rejected
- [x] Users can only access own calls

### Components ✅
- [x] CallForm renders fields from schema
- [x] CallForm validates required fields
- [x] Status polling shows correct status
- [x] Polling stops when call ends
- [x] Results display correctly with comparison table

### End-to-End ✅
- [x] User can view candidates
- [x] User can initiate call
- [x] Call progresses through statuses
- [x] Results display when complete
- [x] Call appears in history

---

## Future Enhancements (Out of Scope for MVP)

### Short Term
- **Webhooks** - Receive VAPI status updates instead of polling
- **Retry Logic** - Automatic retry for failed/no-answer calls
- **Scheduled Calls** - Queue calls for future execution

### Medium Term
- **Chat Integration** - AI tool to initiate calls from chat context
- **Credentially API** - Fetch real candidates/profiles
- **Bulk Calls** - Initiate multiple calls at once
- **Analytics** - Call success rates, average duration

### Long Term
- **Dynamic Templates** - Create/edit templates via UI
- **Inbound Calls** - Receive and route incoming calls
- **Multi-language** - Support different languages per call
- **Custom Voices** - Template-specific voice selection
