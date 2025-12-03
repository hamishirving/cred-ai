# Tool Template

Copy-paste starter for adding new tools.

## 1. Tool File

```typescript
// lib/ai/tools/get-{entity}.ts
import { tool } from "ai";
import { z } from "zod";

const API_BASE = process.env.BACKEND_API_URL;

// Define your response type
interface EntityData {
  id: string;
  name: string;
  // ... other fields
}

export const getEntity = tool({
  // This description is what the AI uses to decide when to call this tool
  // Be specific and include example use cases
  description: `
    Get entity information. Use this when the user asks about:
    - Entity details or info
    - Looking up an entity by ID
    - Searching for entities
  `,
  
  // Zod schema for inputs - AI will extract these from the user's message
  inputSchema: z.object({
    entityId: z.string().describe("The entity ID to look up").optional(),
    searchTerm: z.string().describe("Search term to find entities").optional(),
  }),
  
  // The actual API call
  execute: async ({ entityId, searchTerm }): Promise<EntityData | EntityData[] | { error: string }> => {
    try {
      const endpoint = entityId
        ? `${API_BASE}/entities/${entityId}`
        : `${API_BASE}/entities/search?q=${encodeURIComponent(searchTerm ?? "")}`;

      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${process.env.BACKEND_API_KEY}`,
        },
      });

      if (!res.ok) {
        return { error: `API returned ${res.status}` };
      }

      return res.json();
    } catch (error) {
      return { error: String(error) };
    }
  },
});
```

## 2. Register Tool

In `app/(chat)/api/chat/route.ts`:

```typescript
// Add import
import { getEntity } from "@/lib/ai/tools/get-entity";

// Add to tools object (~line 197)
tools: {
  getWeather,
  getEntity,  // ← add
  // ...
},

// Add to experimental_activeTools (~line 191)
experimental_activeTools: [
  "getWeather",
  "getEntity",  // ← add
],
```

## 3. UI Component

```tsx
// components/entity-card.tsx
interface EntityData {
  id: string;
  name: string;
}

export function EntityCard({ entity }: { entity: EntityData }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{entity.name}</h3>
        <span className="text-muted-foreground text-sm">#{entity.id}</span>
      </div>
      {/* Add more fields as needed */}
    </div>
  );
}

// For arrays
export function EntityList({ entities }: { entities: EntityData[] }) {
  return (
    <div className="space-y-2">
      {entities.map((entity) => (
        <EntityCard key={entity.id} entity={entity} />
      ))}
    </div>
  );
}
```

## 4. Wire Up in Message Component

In `components/message.tsx`, add inside the `message.parts?.map()` block:

```tsx
if (type === "tool-getEntity") {
  const { toolCallId, state } = part;

  return (
    <Tool defaultOpen={true} key={toolCallId}>
      <ToolHeader state={state} type="tool-getEntity" />
      <ToolContent>
        {state === "input-available" && (
          <ToolInput input={part.input} />
        )}
        {state === "output-available" && (
          <ToolOutput
            errorText={undefined}
            output={
              "error" in part.output ? (
                <div className="text-red-500">
                  Error: {String(part.output.error)}
                </div>
              ) : Array.isArray(part.output) ? (
                <EntityList entities={part.output} />
              ) : (
                <EntityCard entity={part.output} />
              )
            }
          />
        )}
      </ToolContent>
    </Tool>
  );
}
```

## 5. Test Prompts

After implementation, test with:

- "Show me entity ABC123"
- "Find entities named X"
- "What's the info on [entity]?"

The AI should automatically route to your tool.
