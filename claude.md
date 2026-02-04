# Cred AI

Playground for testing AI capabilities before production implementation. Uses a hybrid data approach: some tools connect to the Credentially API for live candidate data, others use local Supabase seed data for experimentation.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **AI**: Anthropic Claude 4.5 via AI SDK 6
- **Database**: Supabase Postgres + Drizzle ORM (hybrid migrations)
- **Auth**: Supabase Auth (email/password)
- **Analytics**: PostHog
- **UI**: Tailwind CSS, shadcn/ui

### Additional Dependencies

- **Vapi AI** (@vapi-ai/server-sdk) - Voice calling integration
- **Browserbase + Stagehand** (@browserbasehq/sdk, @browserbasehq/stagehand) - Web automation and browsing
- **Ragie** - RAG/document search
- **CodeMirror 6** - Code editor for artifacts
- **ProseMirror** - Rich text editor
- **react-data-grid** - Data tables
- **React Flow** (@xyflow/react) - Diagram visualisation
- **Postmark** - Transactional email

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm db:generate  # Generate SQL migration from Drizzle schema
pnpm db:push      # Apply migrations to remote DB
pnpm db:seed      # Seed demo data (UK + US orgs)
pnpm db:clear     # Clear all data
pnpm db:studio    # Open Drizzle Studio
```

## Database Workflow

1. Edit Drizzle schema (`lib/db/schema/`)
2. Run `pnpm db:generate` to create SQL migration
3. Run `pnpm db:push` to apply to database

See `lib/db/CLAUDE.md` for detailed workflow.

## Agents Framework

Located in `lib/ai/agents/`. Four specialised agents:

| Agent | Purpose |
|-------|---------|
| **BLS Verification** | Verify professional licences via state boards |
| **Reference Check** | Conduct reference checks via voice/email |
| **Onboarding Companion** | Guide candidates through onboarding |
| **Inbound Email Responder** | Handle incoming candidate emails |

Key components:
- `definitions/` - Agent prompts, tools, and configuration
- `runner.ts` - Executes agents with step tracking
- `registry.ts` - Agent registration and lookup
- `types.ts` - TypeScript interfaces for agent system
- `tool-resolver.ts` - Resolves which tools each agent can access

Agents have memory persistence via `save-agent-memory` and `get-agent-memory` tools.

## Voice Integration

Located in `lib/voice/`. Uses Vapi AI for voice calling.

- `vapi-client.ts` - Vapi SDK wrapper
- `templates.ts` - Call templates (reference check, reminder, etc.)
- `types.ts` - Voice-related types

Voice tools: `initiate-voice-call`, `get-call-status`

## AI Tools Ecosystem

Located in `lib/ai/tools/`. 25+ tools organised by function:

**Profile & Compliance**
- `get-profile.ts` - Fetch candidate profile
- `get-local-profile.ts` - Fetch from local DB
- `manage-profile.ts` - Create/update profiles
- `get-local-compliance.ts` - Compliance status
- `get-compliance-packages.ts` - Available packages

**Documents**
- `create-document.ts` - Create new documents
- `update-document.ts` - Update existing
- `update-document-status.ts` - Change document status
- `get-profile-documents.ts` - List documents
- `classify-document.ts` - AI document classification
- `extract-document-data.ts` - Extract data from documents

**Communication**
- `draft-email.ts` - Draft emails with Postmark
- `initiate-voice-call.ts` - Start Vapi calls
- `get-call-status.ts` - Check call status
- `get-reference-contacts.ts` - Get reference contacts
- `update-reference-status.ts` - Update reference status

**Search & Knowledge**
- `search-knowledge.ts` - Ragie RAG search
- `search-local-candidates.ts` - Search local DB
- `query-data-agent.ts` - Query structured data

**Automation**
- `browse-and-verify.ts` - Web browsing (Browserbase/Stagehand)

**Tasks & Memory**
- `create-task.ts` - Create tasks
- `get-agent-memory.ts` - Retrieve agent memory
- `save-agent-memory.ts` - Persist agent memory

**Forms & Suggestions**
- `create-form.ts` - Dynamic form generation
- `request-suggestions.ts` - Get AI suggestions

## Key Rules

- Always read `docs/ARCHITECTURE.md` before major changes
- Use async/await for params, searchParams, cookies, headers (Next.js 16)
- Server Components by default, only add "use client" when needed
- Tools render results directly in UI, keep AI responses brief after tool calls
- Never modify `components/ui/` directly, extend via composition

## Design Principles

See `docs/DESIGN-PRINCIPLES.md` for full guidelines. Key points:

- **Compact & dense** - Users come from spreadsheets, comfortable with information density
- **Snappy & fast** - Optimistic updates, skeleton states, short animations (150-300ms)
- **Tight spacing** - Use `gap-2`, `p-3`, avoid `gap-6`, `p-8`
- **Small buttons** - Prefer `size="sm"` unless primary CTA

## Git Rules

- Do NOT commit until user explicitly says to
- Do NOT add Co-Authored-By or Claude attribution
- Keep commit messages short (1 line, ~50 chars)
- Stage all changes with `git add .`, don't cherry-pick files
- **NEVER amend commits** - always create new commits, even to fix mistakes
- **Skip `git diff`** when committing, just `git status` to confirm changes, then commit. Write the message based on what you just worked on, not by reading the diff.
