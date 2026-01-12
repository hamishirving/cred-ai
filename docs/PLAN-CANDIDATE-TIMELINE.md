# Candidate Activity Timeline

## Overview

Add a horizontal activity timeline to the candidate details page showing a visual audit trail of all activities - what the candidate did, what AI did, what admins did, and third-party checks.

## Design

### Visual Style (Jimminy-inspired)
- Horizontal dot timeline under candidate header card
- Dots grouped by day
- **Size** = number of activities on that day (small/medium/large)
- **Colour** = actor type:
  - Purple (`bg-purple-500`) = AI
  - Blue (`bg-blue-500`) = Admin
  - Green (`bg-green-500`) = Candidate
  - Gray (`bg-gray-400`) = System/Integration

### Interactions
- **Default**: Show last 7 days with minimal info
- **Hover**:
  - Dot expands/scales up with smooth animation
  - Show tooltip with day summary (e.g., "3 activities on Mon 13 Jan")
  - Breakdown by actor type in tooltip
- **Click**: Expand to show activity details for that day
- **"View all"**: Link to dedicated page with full vertical timeline

### Data Model
Uses existing `activities` table with:
- `profileId` - links to candidate
- `actor` - system | ai | admin | candidate | integration
- `activityType` - message_sent, document_uploaded, check_initiated, etc.
- `summary` - brief description
- `details` - jsonb with extra data
- `createdAt` - timestamp

## Implementation

### Phase 1: Core Timeline Component
1. Create `components/candidate/activity-timeline.tsx`
   - Custom dot-based horizontal timeline
   - Group activities by day
   - Calculate dot sizes based on activity count
   - Colour by actor type

2. Create `lib/db/queries.ts` additions
   - `getProfileActivities({ profileId, days })` - fetch activities for timeline
   - Group and aggregate for timeline display

3. Integrate into candidate details page
   - Add between header card and two-column layout
   - Pass profileId and fetch activities server-side

### Phase 2: Expanded Details
4. Add hover tooltip component
   - Show day, count, breakdown by actor

5. Add click-to-expand behaviour
   - Show list of activities for selected day
   - Activity card with: summary, actor badge, timestamp, details

### Phase 3: Full Timeline Page
6. Create `/candidates/[id]/timeline` page
   - Vertical scrollable timeline
   - All activities (not just 7 days)
   - Filter by actor type
   - Search by summary text

## Component Structure

```
components/candidate/
├── activity-timeline.tsx      # Main horizontal timeline
├── timeline-dot.tsx           # Individual day dot
├── timeline-tooltip.tsx       # Hover tooltip
└── timeline-day-details.tsx   # Expanded day view
```

## API

```typescript
// Fetches activities grouped by day
interface TimelineDay {
  date: Date;
  activities: Activity[];
  counts: {
    total: number;
    byActor: Record<Actor, number>;
  };
}

async function getProfileTimeline(
  profileId: string,
  days: number = 7
): Promise<TimelineDay[]>
```

## Files to Create/Modify

### Create
- `components/candidate/activity-timeline.tsx`
- `components/candidate/timeline-dot.tsx`
- `components/candidate/timeline-tooltip.tsx`
- `components/candidate/timeline-day-details.tsx`
- `app/(app)/candidates/[id]/timeline/page.tsx` (Phase 3)

### Modify
- `lib/db/queries.ts` - add getProfileTimeline query
- `app/(app)/candidates/[id]/page.tsx` - integrate timeline

## Colour Constants

```typescript
const ACTOR_COLORS = {
  ai: { bg: "bg-purple-500", text: "text-purple-500" },
  admin: { bg: "bg-blue-500", text: "text-blue-500" },
  candidate: { bg: "bg-green-500", text: "text-green-500" },
  system: { bg: "bg-gray-400", text: "text-gray-400" },
  integration: { bg: "bg-gray-400", text: "text-gray-400" },
};
```

## Dot Size Logic

```typescript
function getDotSize(count: number): "sm" | "md" | "lg" {
  if (count <= 2) return "sm";   // 8px
  if (count <= 5) return "md";   // 12px
  return "lg";                    // 16px
}
```
