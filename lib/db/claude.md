# Database (Drizzle ORM + Supabase CLI)

## Architecture

| Layer | Tool | Purpose |
|-------|------|---------|
| **Schema definitions** | Drizzle `pgTable()` | Types, ERD, query builder |
| **Migrations** | Supabase CLI | Generate & apply SQL changes |
| **Queries** | Drizzle ORM | Type-safe database access |

**Why this hybrid approach:**
- Drizzle schema files provide rich metadata needed for ERD visualization (`/data-model`)
- Drizzle ORM gives type-safe queries with inference
- Supabase CLI handles migrations reliably (drizzle-kit has bugs with Supabase)

## Schema Changes

**IMPORTANT:** Always update BOTH the Drizzle schema AND the database.

### Step 1: Update Drizzle Schema
Edit files in `lib/db/schema/` - this updates:
- TypeScript types (used throughout app)
- ERD visualization (reads from schema)
- Query builder definitions

### Step 2: Generate Migration
```bash
pnpm db:diff    # Generates SQL in supabase/migrations/ (requires Docker)
```

### Step 3: Apply Migration
```bash
pnpm db:push    # Applies pending migrations to remote DB
```

### Step 4: Verify
```bash
pnpm db:studio  # Browse data to confirm changes
pnpm db:seed    # Re-seed if needed
```

### Alternative (no Docker)
Write SQL migration manually in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`

## Commands

```bash
pnpm db:diff    # Generate migration from schema diff (needs Docker)
pnpm db:push    # Apply migrations to remote Supabase
pnpm db:pull    # Pull remote schema to local migrations
pnpm db:reset   # Reset remote DB to migrations (DESTRUCTIVE)
pnpm db:studio  # Open Drizzle Studio (browse data)
pnpm db:seed    # Seed demo data (UK + US orgs)
pnpm db:clear   # Clear all seeded data
```

## File Structure

```
lib/db/
├── schema/           # Drizzle table definitions (source of truth for types)
├── queries.ts        # All database queries
├── index.ts          # DB connection export
└── seed/             # Seed data scripts

supabase/
├── migrations/       # SQL migrations (managed by Supabase CLI)
└── config.toml       # Supabase project config
```

## Seed Data

Multi-market demo data for UK and US healthcare compliance.

```bash
pnpm db:seed    # Wipe and reseed all data (~60s)
pnpm db:clear   # Clear only (no reseed)
```

**Organisations seeded:**
- **Meridian Healthcare** (UK agency) - NHS Trusts, care homes
- **Oakwood Care** (UK direct employer) - England + Scotland branches
- **TravelNurse Pro** (US agency) - Multi-state travel nursing
- **Lakeside Health System** (US direct employer) - Texas hospital system

**Per organisation:**
- 8-10 candidates with varied compliance states
- Realistic compliance packages (UK: DBS/NMC/RTW, US: state licenses/BLS/ACLS)
- Activity history, escalations, pipeline positions

**Seed structure:**
```
seed/
├── index.ts          # Main orchestrator
├── db.ts             # Database connection
├── clear.ts          # Wipe all tables
├── utils.ts          # Date/random helpers
├── markets/          # Compliance element definitions
│   ├── uk.ts         # 18 UK elements, 6 packages
│   └── us.ts         # 22 US elements, 7 packages
└── candidates/       # Named candidate profiles
    ├── uk-candidates.ts
    └── us-candidates.ts
```

See `docs/PRD-SEED-DATA.md` for full specification.

## Query Patterns

All queries go in `queries.ts`. Follow existing patterns:

```ts
export async function getThingById({ id }: { id: string }) {
  const [result] = await db
    .select()
    .from(thing)
    .where(eq(thing.id, id));
  return result;
}

export async function saveThings({ items }: { items: NewThing[] }) {
  return db.insert(thing).values(items);
}
```

## Conventions

- Use uuid for all IDs: `uuid('id').primaryKey().notNull().defaultRandom()`
- Always add `createdAt`: `timestamp('createdAt').notNull().defaultNow()`
- Use `jsonb` for flexible data, typed with `.$type<MyType>()`
- Queries return single item or array, never undefined - check length
