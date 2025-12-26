# AI SDK Configuration

## Adding a New Tool

1. Create `lib/ai/tools/my-tool.ts`:
```ts
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: `What this tool does.
When to use it:
- Scenario 1
- Scenario 2`,
  inputSchema: z.object({ /* params */ }),
  execute: async (input) => {
    // Return { data: ... } or { error: string }
  },
});
```

2. Register in `app/(chat)/api/chat/route.ts`:
   - Add to `tools` object
   - Add to `experimental_activeTools` array

3. Create handler in `components/tool-handlers/handlers/`

4. Update system prompt in `prompts.ts` if needed

## Tool Description Best Practices

- Explain what the tool does
- List specific scenarios when to use it
- Be explicit about input requirements
- Better descriptions = better model tool selection

## Models

Configured in `providers.ts`:
- `chat-model`: claude-sonnet-4-5 (main chat)
- `chat-model-reasoning`: claude-sonnet-4-5 with thinking extraction
- `title-model`: claude-haiku-4-5 (fast, for titles)
- `artifact-model`: claude-sonnet-4-5 (document generation)
