# Components

## Directory Structure

- `ui/` - shadcn/ui primitives. **Do not modify directly.**
- `elements/` - Reusable composed elements (code-block, tool wrapper, etc.)
- `tool-handlers/` - AI tool result renderers (see tool-handlers/claude.md)
- Root level - Feature components

## Adding shadcn Components

```bash
npx shadcn@latest add button
```

## Extending UI Components

Never edit `ui/` files. Create wrappers:

```tsx
// components/submit-button.tsx
import { Button } from '@/components/ui/button';

export function SubmitButton({ loading, children, ...props }) {
  return (
    <Button disabled={loading} {...props}>
      {loading ? <Spinner /> : children}
    </Button>
  );
}
```

## Client vs Server

- Default to Server Components (no directive needed)
- Add `"use client"` only for: useState, useEffect, event handlers, browser APIs
- Keep client components small - extract data fetching to server parents

## Design Principles

See **[docs/DESIGN-PRINCIPLES.md](/docs/DESIGN-PRINCIPLES.md)** for full guidelines.

**TL;DR:**
- **Compact by default** - Users come from spreadsheets, they're comfortable with density
- **Tight spacing** - Use `gap-2`, `gap-3`, `p-3` not `gap-6`, `p-8`
- **Small text** - `text-sm` for body, `text-xs` for metadata
- **Snappy interactions** - Optimistic updates, no loading spinners on primary actions
- **Prefer `size="sm"`** for buttons unless it's a primary CTA
