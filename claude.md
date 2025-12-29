# Cred AI

Playground for testing AI capabilities leveraging the Credentially API. Used for experimenting with new features before production implementation.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **AI**: Anthropic Claude 4.5 via AI SDK 6
- **Database**: Supabase Postgres + Drizzle ORM + Supabase CLI migrations
- **Auth**: Supabase Auth (email/password)
- **Analytics**: PostHog
- **UI**: Tailwind CSS, shadcn/ui

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm db:diff      # Generate migration from schema changes (requires Docker)
pnpm db:push      # Apply migrations to remote DB
pnpm db:seed      # Seed demo data (UK + US orgs)
pnpm db:studio    # Open Drizzle Studio
```

## Database Workflow

Schema changes require updating TWO places:
1. **Drizzle schema** (`lib/db/schema/`) - for types, ERD, queries
2. **Database** - via `pnpm db:diff` then `pnpm db:push`

See `lib/db/CLAUDE.md` for detailed workflow.

## Key Rules

- Always read `docs/ARCHITECTURE.md` before major changes
- Use async/await for params, searchParams, cookies, headers (Next.js 16)
- Server Components by default, only add "use client" when needed
- Tools render results directly in UI - keep AI responses brief after tool calls
- Never modify `components/ui/` directly - extend via composition

## Git Rules

- Do NOT commit until user explicitly says to
- Do NOT add Co-Authored-By or Claude attribution
- Keep commit messages short (1 line, ~50 chars)
- Stage all changes with `git add .` - don't cherry-pick files
