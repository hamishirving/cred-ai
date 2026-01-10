# Homepage Dashboard Plan

## Vision

The homepage serves as an admin's command centre - showing what AI agents are doing in the background while surfacing items that need human attention. The goal is **transparency without overwhelm**.

---

## Core Concept: "Your AI Team at Work"

The dashboard communicates: "Here's what your agents are handling, here's what they've accomplished, and here's where they need your help."

---

## Proposed Sections

### 1. Agent Activity Feed (Recent Activity)

A live-ish feed of what agents have been doing, grouped by time (last hour, today, this week).

**Example items:**
- "Onboarding Companion sent 12 document reminders"
- "Reference Agent completed 3 employment verifications"
- "Compliance Agent flagged Sarah Thompson - DBS expiring in 7 days"

**Interaction:**
- Click to expand and see details
- Filter by agent type
- Toggle between summary view and detailed view

### 2. Needs Your Attention (Action Queue)

Items requiring human decision/approval. This is the priority section.

**Categories:**
- **Approvals** - Agent wants to take action but needs sign-off
- **Reviews** - Documents or decisions needing human judgement
- **Escalations** - Situations automation couldn't resolve

**Each item shows:**
- What the agent is asking
- Context/reasoning
- Quick actions (Approve / Reject / View Details)

### 3. Quick Stats Bar

At-a-glance metrics:
- Active candidates in onboarding
- Compliance rate (% fully compliant)
- Items pending review
- Agent actions today

### 4. Urgent Alerts (Optional Banner)

Only shows when there's something genuinely urgent:
- Candidate about to become non-compliant
- Document expiring with no renewal in progress
- Escalation unresolved for X days

---

## Design Principles

1. **Default to collapsed** - Show summaries, expand on demand
2. **Progressive disclosure** - Quick stats → Summary cards → Full details
3. **Action-oriented** - Every card should have a clear next step
4. **Time-aware** - Group by recency, fade older items

---

## Data Sources

### Existing (can use now)
- `activities` table - AI/human action log
- `tasks` table - Items requiring attention
- `profiles` + compliance data - For stats

### May Need to Add
- Agent-specific activity tracking (which agent did what)
- Approval/review queue table (or extend tasks)
- Real-time subscriptions for live updates

---

## Decisions

| Question | Decision |
|----------|----------|
| Scope | **Demo-quality** - mock data, focus on UX |
| Agent representation | **Cred AI** - unified branding, single identity |
| Activity feed | **Summaries with expand** - clean by default, drill-down available |
| Tasks relationship | **Preview top tasks** - show 5-10 urgent, "View All" to Tasks page |
| Updates | Manual refresh (simplest for demo) |
| Mobile | Desktop-first (demo context) |

---

## Implementation Plan

### Phase 1: Layout & Structure
1. Create homepage layout with sections
2. Build reusable card components
3. Set up mock data structure

### Phase 2: Components
1. **Quick Stats Bar** - 4 key metrics
2. **Urgent Alerts Banner** - conditional, only shows when needed
3. **Activity Feed** - grouped by time, expandable summaries
4. **Tasks Preview** - top 5-10 urgent tasks

### Phase 3: Interactivity
1. Expand/collapse on activity items
2. Quick actions on task cards
3. Filters/toggles where useful

### Phase 4: Live Activity Animation
Simulate real-time agent activity for demo effect:

1. **Activity ticker** - New items slide in at the top of the feed
2. **Rotation loop** - Cycle through ~10-15 demo activities
3. **Realistic timing** - Random intervals (3-8 seconds) between items
4. **Subtle entrance** - Fade + slide animation for new items
5. **Counter updates** - Stats bar numbers tick up as activities appear

**Example activity rotation:**
```
"Sent document reminder to Sarah Thompson"
"Verified DBS certificate for Marcus Johnson"
"Chased reference from St Mary's Hospital"
"Flagged expiring training for Priya Sharma"
"Completed Right to Work check for James Chen"
...
```

**Implementation approach:**
- `useEffect` with `setInterval` to add items
- Keep last N items visible (e.g., 8-10)
- Framer Motion or CSS transitions for smooth animations
- Optional: Pause on hover so user can read

### Phase 5: Polish
1. Loading states
2. Empty states
3. Sound effect toggle? (subtle ping for new activity - optional)

---

## Mock Data Shape

```typescript
// Activity summary
interface ActivitySummary {
  id: string;
  type: 'messages' | 'documents' | 'compliance' | 'references';
  summary: string;       // "Sent 12 document reminders"
  count: number;
  timeGroup: 'hour' | 'today' | 'week';
  items?: ActivityDetail[]; // For expand view
}

// Individual activity (for expanded view)
interface ActivityDetail {
  id: string;
  description: string;  // "Reminder sent to Sarah Thompson"
  timestamp: Date;
  subject?: {
    name: string;
    id: string;
  };
}

// Quick stats
interface DashboardStats {
  activeOnboarding: number;
  complianceRate: number;  // percentage
  pendingReviews: number;
  actionsToday: number;
}

// Urgent alert
interface UrgentAlert {
  id: string;
  severity: 'critical' | 'warning';
  title: string;
  description: string;
  action: {
    label: string;
    href: string;
  };
}
```

---

## Visual Inspiration

### Observability Tools (Datadog, Grafana, Linear, Vercel)

**From Datadog/Grafana:**
- Real-time metrics with **sparklines** (mini inline charts)
- **Time-range selector** (Last hour, Today, 7 days)
- Status dots that pulse when active
- Log streams with syntax highlighting by type

**From Linear:**
- Clean, minimal cards with subtle shadows
- Progress bars that feel satisfying
- Smooth transitions between states
- Keyboard shortcuts for power users

**From Vercel Dashboard:**
- Activity feed with avatars/icons per action type
- Deployment-style status badges (Building → Ready)
- Real-time logs that scroll smoothly

### Visualisations & Charts

**1. Activity Sparkline**
Mini chart in stats card showing activity volume over time (last 24h)
```
Actions Today: 47  ▁▂▄▃▅▇▆▄▃▂
```

**2. Compliance Gauge/Ring**
Circular progress showing overall compliance rate
- Green ring for compliant %
- Amber for expiring soon
- Red for non-compliant
- Number in centre: "87%"

**3. Pipeline Funnel**
Simple horizontal funnel showing onboarding stages:
```
Applied (23) → Documents (15) → Verification (8) → Ready (4)
```
With conversion rates between stages

**4. Agent Activity Heatmap**
Grid showing activity intensity by hour/day (like GitHub contributions)
- Helps spot patterns (e.g., most activity Mon-Wed mornings)

**5. Status Timeline**
Horizontal timeline for "what's happening now":
```
[●] 2 DBS checks in progress (est. 3 days)
[●] 5 references awaiting response
[●] 12 reminders scheduled for today
```

**6. Animated Counters**
Numbers that tick up smoothly when activities happen:
- Use `react-countup` or similar
- Satisfying animation reinforces "work being done"

### Component Patterns

**Activity Feed Item:**
```
┌─────────────────────────────────────────────────────┐
│ ⚡ Cred AI                              2 mins ago  │
│                                                     │
│ Sent document reminder to Sarah Thompson            │
│ DBS certificate expires in 7 days                   │
│                                                     │
│ [View Candidate]                        ▼ Details   │
└─────────────────────────────────────────────────────┘
```

**Stats Card with Sparkline:**
```
┌──────────────────────┐
│ Actions Today        │
│                      │
│ 47        ▁▂▄▃▅▇▆▄  │
│ ↑ 12% from yesterday │
└──────────────────────┘
```

**Compliance Ring:**
```
┌──────────────────────┐
│    Compliance        │
│                      │
│      ╭───╮          │
│     │ 87% │          │
│      ╰───╯          │
│   ■ 87% Compliant    │
│   ■ 8% Expiring      │
│   ■ 5% Gaps          │
└──────────────────────┘
```

### Existing Patterns to Reuse

From the Tasks page:
- Priority badges (urgent/high/medium/low)
- Status indicators with icons
- Card grid layout
- Filter controls

---

## Tech Considerations

**Charts/Visualisations:**
- `recharts` - Already commonly used with shadcn
- Lightweight, composable, good for sparklines
- Alternative: `@tremor/react` for dashboard components

**Animations:**
- `framer-motion` - For activity feed slide-in
- `react-countup` - For animated numbers
- CSS transitions for simple hover states

**Layout:**
- CSS Grid for dashboard sections
- Responsive: Stack on mobile, grid on desktop

---

## Next Steps

1. Answer clarifying questions above
2. Create wireframe/mockup of layout
3. Build component structure
4. Implement with mock data
5. Wire up to real data (if desired)
