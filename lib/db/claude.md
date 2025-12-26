# Database (Drizzle + Supabase)

## Schema Changes

1. Edit `schema.ts`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:migrate` to apply
4. Use `pnpm db:studio` to inspect data

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
