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
