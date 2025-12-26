# Tool Template

Copy-paste starter for adding new AI tools.

## 1. Create Tool Definition

```typescript
// lib/ai/tools/get-{entity}.ts
import { tool } from "ai";
import { z } from "zod";
import { getEntityById, isApiError } from "@/lib/api/credentially-client";
import type { EntityDto } from "@/lib/api/types";

export const getEntity = tool({
  description: `Get entity information.
Use this when the user asks about:
- Entity details or info
- Looking up an entity by ID
- Searching for entities`,

  inputSchema: z.object({
    entityId: z.string().describe("The entity ID to look up").optional(),
    searchTerm: z.string().describe("Search term to find entities").optional(),
  }),

  execute: async ({ entityId, searchTerm }): Promise<{ data: EntityDto } | { error: string }> => {
    if (!entityId && !searchTerm) {
      return { error: "Please provide an entity ID or search term" };
    }

    const result = await getEntityById(entityId);

    if (isApiError(result)) {
      return { error: result.error };
    }

    return { data: result };
  },
});
```

## 2. Register Tool in Chat Route

In `app/(chat)/api/chat/route.ts`:

```typescript
// Add import
import { getEntity } from "@/lib/ai/tools/get-entity";

// Add to tools object
tools: {
  getEntity,
  // ...existing tools
},

// Add to experimental_activeTools array
experimental_activeTools: [
  "getEntity",
  // ...existing tools
],
```

## 3. Create Tool Handler

```tsx
// components/tool-handlers/handlers/entity-tool.tsx
import { ToolLoading } from "../tool-renderer";
import { EntityCard } from "@/components/entity-card";
import type { ToolHandlerProps } from "../types";
import type { EntityDto } from "@/lib/api/types";

interface EntityOutput {
  data?: EntityDto;
  error?: string;
}

export function EntityTool({
  toolCallId,
  state,
  input,
  output,
}: ToolHandlerProps<unknown, EntityOutput>) {
  // Show loading while running
  if (!output) {
    return (
      <ToolLoading
        toolCallId={toolCallId}
        toolName="Get Entity"
        state={state}
        input={input}
      />
    );
  }

  // Handle error
  if (output.error) {
    return <div className="text-destructive">Error: {output.error}</div>;
  }

  // Render result directly (no wrapper)
  if (output.data) {
    return <EntityCard entity={output.data} />;
  }

  return null;
}
```

## 4. Register Handler

In `components/tool-handlers/index.tsx`:

```typescript
import { EntityTool } from "./handlers/entity-tool";

const toolRegistry: Record<string, ToolHandler> = {
  "tool-getEntity": EntityTool as ToolHandler,
  // ...existing handlers
};
```

## 5. Create UI Component

```tsx
// components/entity-card.tsx
import type { EntityDto } from "@/lib/api/types";

export function EntityCard({ entity }: { entity: EntityDto }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="font-semibold text-lg">{entity.name}</h3>
      <p className="text-muted-foreground text-sm">{entity.description}</p>
    </div>
  );
}
```

## Checklist

- [ ] Tool definition in `lib/ai/tools/`
- [ ] Registered in `chat/route.ts` (tools + activeTools)
- [ ] Handler in `components/tool-handlers/handlers/`
- [ ] Handler registered in `components/tool-handlers/index.tsx`
- [ ] UI component for rendering data
- [ ] Update system prompt in `lib/ai/prompts.ts` if needed
