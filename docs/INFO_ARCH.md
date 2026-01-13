# Information Architecture

**Status:** Implemented
**Last Updated:** 2025-12-29

This document defines the sitemap, navigation structure, and route organisation for cred-ai.

---

## Navigation Structure

### Sidebar

Using shadcn sidebar component with collapsible sections.

```
┌─────────────────────────────┐
│  [Org Switcher]             │  ← Pinned top
├─────────────────────────────┤
│  🏠 Home                    │
│  🔍 Search                  │
│  💬 Chat                    │
│  📞 Voice                   │
│  🔔 Notifications           │
├─────────────────────────────┤
│  Workspace                  │  ← Section label
│  👥 Candidates              │
│  📊 Reports                 │
├─────────────────────────────┤
│  ⚙️ Settings (admin only)   │  ← Conditional
├─────────────────────────────┤
│  [User Profile]             │  ← Pinned bottom
│    → Light/Dark mode toggle │
│    → Sign out               │
└─────────────────────────────┘
```

**Chat Secondary Sidebar:** The `/chat` route has a nested sidebar showing chat history, allowing users to switch between conversations while keeping the main navigation visible.

---

## Route Map

### Public Routes

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Email/password authentication |
| `/register` | Register | New user registration |

### Protected Routes (Authenticated)

#### Core Navigation

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Dashboard landing page. Highlights AI activity since last login, quick stats, pending actions |
| `/search` | Search | Global search across candidates, evidence, activities. May integrate with AI for natural language queries |
| `/chat` | Chat | AI Compliance Companion. Existing chat interface for AI interactions |
| `/chat/[id]` | Chat Thread | Individual chat conversation |
| `/notifications` | Notifications | Activity feed, alerts, escalations requiring attention |

#### Candidates Workspace

| Route | Page | Description |
|-------|------|-------------|
| `/candidates` | Candidate List | Pipeline view showing candidates at various stages. Filterable by stage, compliance status, role |
| `/candidates/[id]` | Candidate Profile | Full candidate view with compliance status, evidence, activity timeline |
| `/candidates/[id]/evidence` | Evidence Tab | Document uploads, verification status |
| `/candidates/[id]/timeline` | Timeline Tab | Activity history, stage transitions |
| `/candidates/[id]/placements` | Placements Tab | Current and past placements |

#### Reports

| Route | Page | Description |
|-------|------|-------------|
| `/reports` | Reports Dashboard | Pipeline Overview and Cohort Analysis charts |
| `/reports/[slug]` | Report View | PowerBI iframe embed (existing pattern) |

**Implemented Charts:**
- **Pipeline Overview** - Funnel-style stacked bar chart showing candidates at each compliance stage (Applied → Documents → References → DBS Check → Training → Ready)
- **Cohort Analysis** - Heatmap table showing % compliance achieved by day since starting, grouped by weekly cohorts. Demonstrates speed of compliance process.

#### Settings (Admin/Manager)

| Route | Page | Description |
|-------|------|-------------|
| `/settings` | Settings Hub | Organisation settings overview |
| `/settings/organisation` | Org Settings | Name, branding, preferences |
| `/settings/users` | User Management | Invite users, assign roles |
| `/settings/roles` | Role Management | Define user_roles and permissions |
| `/settings/compliance` | Compliance Config | Compliance elements, packages, assignment rules |
| `/settings/pipelines` | Pipeline Config | Onboarding stages, automation rules |
| `/settings/integrations` | Integrations | API keys, external connections |

#### Voice

| Route | Page | Description |
|-------|------|-------------|
| `/voice` | Voice Dashboard | Stats and recent calls |
| `/voice/calls` | Call History | All voice calls with transcripts |
| `/voice/candidates` | Candidate Selection | Select candidate for verification |
| `/voice/candidates/[candidateId]` | Candidate Detail | Work history and references |
| `/voice/candidates/[candidateId]/[workHistoryId]` | Verify Employment | Initiate verification call |

#### Tools (Development/Debug)

| Route | Page | Description |
|-------|------|-------------|
| `/data-model` | ERD Viewer | Interactive schema visualisation |

---

## Org Switcher

Users may belong to multiple organisations (via profiles). The org switcher allows changing context.

**Behaviour:**
- Shows current organisation name/logo
- Dropdown lists all orgs user has profiles in
- Switching updates `users.currentProfileId`
- All data queries filter by current org context

**Implementation:**
- Store `currentProfileId` on user record
- Middleware/context reads active profile → org
- All queries include `organisationId` filter

---

## Role-Based Visibility

Navigation items shown based on `user_roles.permissions`:

| Section | Required Permission |
|---------|-------------------|
| Home, Search, Chat | `*` (all users) |
| Candidates | `profiles:read` |
| Reports | `reports:read` |
| Settings | `settings:*` or `admin` |
| Settings > Users | `users:*` |
| Settings > Compliance | `compliance:*` |

---

## Sidebar Components (shadcn sidebar-07)

Installed from shadcn sidebar-07 example. Base primitives in `components/ui/sidebar.tsx`.

### Available Components

| Component | File | Purpose | Cred-AI Mapping |
|-----------|------|---------|-----------------|
| `TeamSwitcher` | `components/team-switcher.tsx` | Org/team dropdown at top | **OrgSwitcher** - switch between organisations |
| `NavMain` | `components/nav-main.tsx` | Collapsible nav groups | Core nav (Home, Search, Chat, Notifications) |
| `NavProjects` | `components/nav-projects.tsx` | Flat list with actions | Workspace items (Candidates, Reports) |
| `NavUser` | `components/nav-user.tsx` | User profile dropdown | User menu (settings, theme, sign out) |
| `Breadcrumb` | `components/ui/breadcrumb.tsx` | Page breadcrumbs | Header breadcrumb trail |

### Sidebar Primitives (`components/ui/sidebar.tsx`)

```tsx
// Core structure
<SidebarProvider>
  <Sidebar>
    <SidebarHeader />      // TeamSwitcher goes here
    <SidebarContent>       // NavMain, NavProjects
      <SidebarGroup>
        <SidebarGroupLabel />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter />      // NavUser goes here
  </Sidebar>
  <SidebarInset>           // Main content area
    <header />             // Breadcrumb, SidebarTrigger
    {children}
  </SidebarInset>
</SidebarProvider>
```

### Utility Hook

- `hooks/use-mobile.tsx` - `useIsMobile()` for responsive behaviour

---

## Migration Plan

### Current State

Existing routes use `(chat)` route group with chat-focused sidebar (`components/app-sidebar.tsx`).

### Target State

All protected routes under `(app)` route group with unified sidebar.

### Route Migration

| Current | Target | Notes |
|---------|--------|-------|
| `app/(chat)/page.tsx` | `app/(app)/page.tsx` | Home dashboard |
| `app/(chat)/chat/[id]/page.tsx` | `app/(app)/chat/[id]/page.tsx` | Chat threads |
| `app/(auth)/` | `app/(public)/` | Rename for clarity |

### Component Migration

| Current | Action |
|---------|--------|
| `components/app-sidebar.tsx` | Refactor to use new sidebar components |
| `components/sidebar-history.tsx` | Move to `components/sidebar/chat-history.tsx` |
| `components/sidebar-user-nav.tsx` | Replace with `NavUser` |

---

## Layout Structure

```
app/
├── (public)/                 # Unauthenticated
│   ├── login/
│   └── register/
├── (app)/                    # Protected, with sidebar
│   ├── layout.tsx            # SidebarProvider + AppSidebar
│   ├── page.tsx              # Home dashboard
│   ├── search/
│   ├── chat/
│   │   └── [id]/
│   ├── notifications/
│   ├── candidates/
│   │   └── [id]/
│   ├── reports/
│   │   └── [slug]/
│   ├── settings/
│   │   ├── organisation/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── compliance/
│   │   ├── pipelines/
│   │   └── integrations/
│   ├── voice/
│   │   ├── calls/
│   │   └── demo/[candidateId]/
│   └── data-model/           # Dev tools
└── dashboard/                # shadcn example (remove after reference)
```

---

## Sidebar Component Structure

Current file organisation:

```
components/
├── sidebar/
│   ├── index.ts              # Re-exports AppSidebar
│   ├── app-sidebar.tsx       # Main sidebar composition
│   ├── org-switcher.tsx      # Organisation dropdown (mock data)
│   ├── nav-core.tsx          # Home, Search, Chat, Voice, Notifications
│   ├── nav-workspace.tsx     # Candidates, Reports
│   └── nav-user.tsx          # User profile menu (theme, sign out)
├── sidebar-history.tsx       # Chat history list (used by chat secondary sidebar)
└── ui/
    ├── sidebar.tsx           # shadcn primitives
    ├── breadcrumb.tsx        # shadcn primitives
    └── chart.tsx             # shadcn chart wrapper for recharts

app/(app)/chat/
├── layout.tsx                # Chat layout with secondary sidebar
├── chat-sidebar.tsx          # Secondary sidebar for chat history
└── page.tsx                  # Chat interface
```

---

## URL Naming Conventions

- Use **lowercase** with **hyphens** for multi-word routes
- Use **plural** for list pages (`/candidates`, `/reports`)
- Use **[id]** for dynamic segments
- Use **tabs as query params** not nested routes (e.g., `/candidates/[id]?tab=evidence`)

---

## Future Considerations

### Phase 2 Routes (Not Yet)

| Route | Description |
|-------|-------------|
| `/jobs` | Job postings management (ATS expansion) |
| `/applications` | Application tracking |
| `/placements` | Placement management |
| `/calendar` | Scheduling, shifts |
| `/messages` | Internal messaging |

### Mobile Considerations

- Sidebar collapses to bottom nav on mobile
- Key actions: Home, Candidates, Chat, Profile
- Full sidebar accessible via hamburger menu

---

## Notes

- **Candidate naming**: Configurable per org (Candidate, Worker, Staff, etc.) - stored in org settings
- **Reports**: Continue using PowerBI embeds for now, consider native dashboards later
- **Search**: Evaluate whether search is standalone or integrated into AI chat
- **Notifications**: Could be real-time (WebSocket) or polling - TBD based on requirements

---

## Implementation Steps

### Phase 1: Setup Route Structure ✅

- [x] Create `app/(app)/` route group directory
- [x] Create `app/(app)/layout.tsx` with SidebarProvider wrapper
- [x] Create `app/(public)/` route group (rename from `(auth)`)
- [x] Move `app/(auth)/login/` → `app/(public)/login/`
- [x] Move `app/(auth)/register/` → `app/(public)/register/`
- [x] Move auth utilities to `lib/auth/`

### Phase 2: Build Sidebar Components ✅

- [x] Create `components/sidebar/` directory
- [x] Create `components/sidebar/app-sidebar.tsx` - main composition
- [x] Create `components/sidebar/org-switcher.tsx` - adapt from TeamSwitcher
  - [ ] Fetch user's profiles/organisations (using mock data currently)
  - [ ] Handle org switch (update currentProfileId)
- [x] Create `components/sidebar/nav-core.tsx` - Home, Search, Chat, Voice, Notifications
- [x] Create `components/sidebar/nav-workspace.tsx` - Candidates, Reports
- [ ] Create `components/sidebar/nav-settings.tsx` - Settings section (permission gated)
- [x] Create `components/sidebar/nav-user.tsx` - adapt from NavUser
  - [x] Theme toggle (light/dark)
  - [x] Sign out action
- [x] Create `app/(app)/chat/chat-sidebar.tsx` - secondary sidebar with chat history
- [x] Create `app/(app)/chat/layout.tsx` - wrapper for chat secondary sidebar

### Phase 3: Migrate Routes ✅

- [x] Create `app/(app)/page.tsx` - Home dashboard
- [x] Move chat routes: `app/(chat)/chat/` → `app/(app)/chat/`
- [x] Create placeholder pages:
  - [x] `app/(app)/search/page.tsx`
  - [x] `app/(app)/notifications/page.tsx`
  - [x] `app/(app)/candidates/page.tsx`
  - [x] `app/(app)/candidates/[id]/page.tsx`
  - [x] `app/(app)/reports/page.tsx`
  - [x] `app/(app)/reports/[slug]/page.tsx`
  - [x] `app/(app)/settings/page.tsx`
  - [x] `app/(app)/settings/organisation/page.tsx`
  - [x] `app/(app)/settings/users/page.tsx`
  - [x] `app/(app)/settings/roles/page.tsx`
  - [x] `app/(app)/settings/compliance/page.tsx`
  - [x] `app/(app)/settings/pipelines/page.tsx`
  - [x] `app/(app)/settings/integrations/page.tsx`
- [x] Move voice routes: `app/(chat)/voice/` → `app/(app)/voice/`
- [x] Move data-model: `app/data-model/` → `app/(app)/data-model/`

### Phase 4: Update Layout Integration (Partial)

- [x] Update `app/(app)/layout.tsx` to use new AppSidebar
- [ ] Add breadcrumb support to page headers
- [ ] Implement SidebarTrigger for mobile collapse
- [ ] Test responsive behaviour (mobile breakpoint)

### Phase 5: Permission Gating

- [ ] Create `lib/permissions.ts` - permission checking utilities
- [ ] Add permission checks to nav components
- [ ] Hide Settings section for non-admin users
- [ ] Gate Candidates/Reports based on role permissions

### Phase 6: Cleanup ✅

- [x] Delete `app/(chat)/` route group (after migration verified)
- [x] Delete `app/dashboard/` (shadcn example)
- [x] Delete `components/team-switcher.tsx` (shadcn reference)
- [x] Delete `components/nav-main.tsx` (shadcn reference)
- [x] Delete `components/nav-projects.tsx` (shadcn reference)
- [x] Delete `components/nav-user.tsx` (shadcn reference)
- [x] Verify build passes: `pnpm build`

**Note:** Some legacy sidebar components remain (`components/sidebar-history.tsx`, `components/sidebar-user-nav.tsx`) as they are still referenced by the chat secondary sidebar.

### Phase 7: Polish

- [ ] Add loading states for org switcher
- [x] Add active state styling to current route
- [ ] Implement keyboard navigation
- [x] Add tooltips for collapsed sidebar icons
- [ ] Test mobile navigation flow
