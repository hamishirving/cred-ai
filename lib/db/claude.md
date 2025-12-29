# Database (Drizzle + Supabase)

## Schema Changes

1. Edit schema files in `schema/`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:migrate` to apply
4. Use `pnpm db:studio` to inspect data

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
