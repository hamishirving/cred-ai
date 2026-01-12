# Plan: Collaborative Task Creation in Chat

## Overview

Add ability to create tasks for team members directly from chat, with @ mention autocomplete for assigning tasks. Demonstrates collaborative AI-assisted workflow management.

**Demo scenario:**
> "Create a task for @Sarah to chase Marcus's DBS by Friday"
> → AI creates task with assignee=Sarah, description about DBS, due=Friday
> → Task displayed as rich card in chat

---

## Components

### 1. Create Task Tool (`lib/ai/tools/create-task.ts`)

AI tool that creates tasks in the database.

**Input schema:**
```typescript
{
  title: string;           // Task title (required)
  description?: string;    // Detailed description
  assigneeId: string;      // UUID of assignee (from @ mention)
  priority?: "low" | "medium" | "high" | "urgent";  // Default: medium
  category?: "chase_candidate" | "review_document" | "follow_up" | "escalation" | "expiry" | "general";
  dueAt?: string;          // ISO date string (AI parses "Friday" → date)
  subjectType?: "profile" | "placement" | "evidence" | "escalation";
  subjectId?: string;      // Link to related entity
}
```

**Execute:**
- Insert into `tasks` table using existing schema
- Set `source: "ai_agent"`, `agentId: "chat-companion"`
- Return created task with assignee details

**Files:**
- Create: `lib/ai/tools/create-task.ts`
- Update: `app/(app)/api/chat/route.ts` - register tool
- Update: `lib/ai/prompts.ts` - add to tool descriptions

---

### 2. Task Tool Handler (`components/tool-handlers/handlers/task-tool.tsx`)

Display created task as a card in chat.

**Design:**
- Compact card with task details
- Shows: title, assignee (avatar + name), due date, priority badge
- Status indicator (pending by default)
- Optional link to related profile if subjectId provided

**Files:**
- Create: `components/tool-handlers/handlers/task-tool.tsx`
- Update: `components/tool-handlers/index.tsx` - register handler

---

### 3. @ Mention Autocomplete

Add mention support to chat input.

**Behaviour:**
1. User types `@` in textarea
2. Dropdown appears with list of admins (filtered as user types)
3. Selecting an admin inserts `@FirstName` into text
4. Store selected admin ID in message metadata for AI to use

**Implementation approach:**
- Create `MentionPopover` component with Radix Popover
- Track cursor position in textarea
- Filter admins list as user types after `@`
- On select: insert name, store `{ mentionedUsers: [{ id, name }] }` in state
- Pass mentions to AI tool call context

**Files:**
- Create: `components/mention-popover.tsx`
- Update: `components/multimodal-input.tsx` - integrate mention detection
- Create: `lib/hooks/use-mentions.ts` - hook for mention state management

---

### 4. Mock Admin Data

6 mock admins for the current organisation.

**Data structure:**
```typescript
interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;  // For avatar
  role: string;      // e.g., "Compliance Manager"
}
```

**Mock admins:**
1. Sarah Chen - Compliance Manager
2. James Wilson - Senior Recruiter
3. Priya Patel - Compliance Lead
4. Marcus Johnson - Onboarding Specialist
5. Emma Thompson - HR Manager
6. David Kim - Compliance Officer

**Implementation:**
- Create: `lib/data/mock-admins.ts` - static mock data
- API endpoint: `app/(app)/api/admins/route.ts` - returns mock admins for org
- Later: replace with real query from `users` + `org_memberships`

---

### 5. Database Query

Add query to fetch/create tasks.

**Files:**
- Update: `lib/db/queries.ts` - add `createTask`, `getAdminUsers` functions

---

## Implementation Order

1. **Mock admins** - Static data + API endpoint
2. **Create task tool** - AI tool + register in route
3. **Task handler** - UI component for displaying tasks
4. **Mention popover** - Autocomplete component
5. **Integrate mentions** - Wire up to multimodal-input
6. **Test end-to-end** - Full demo flow

---

## File Changes Summary

**New files:**
- `lib/ai/tools/create-task.ts`
- `lib/data/mock-admins.ts`
- `lib/hooks/use-mentions.ts`
- `app/(app)/api/admins/route.ts`
- `components/mention-popover.tsx`
- `components/tool-handlers/handlers/task-tool.tsx`

**Modified files:**
- `app/(app)/api/chat/route.ts` - register tool
- `lib/ai/prompts.ts` - tool description
- `lib/db/queries.ts` - task creation query
- `components/tool-handlers/index.tsx` - register handler
- `components/multimodal-input.tsx` - mention integration

---

## Open Questions

None - all clarified.

---

*Created: 11 January 2026*
