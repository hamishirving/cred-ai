# Tool Handlers

Render AI tool results in the chat UI.

## Adding a New Handler

1. Create `handlers/my-tool.tsx`:

```tsx
import { ToolLoading } from '../tool-renderer';
import type { ToolHandlerProps } from '../types';

interface MyOutput {
  data?: MyData;
  error?: string;
}

export function MyTool({ toolCallId, state, input, output }: ToolHandlerProps<unknown, MyOutput>) {
  // Show loading while running
  if (!output) {
    return <ToolLoading toolCallId={toolCallId} toolName="My Tool" state={state} input={input} />;
  }

  // Handle error
  if (output.error) {
    return <div className="text-destructive">Error: {output.error}</div>;
  }

  // Render result directly (no wrapper)
  return <MyResultComponent data={output.data} />;
}
```

2. Register in `index.tsx`:

```tsx
import { MyTool } from './handlers/my-tool';

const toolRegistry: Record<string, ToolHandler> = {
  'tool-myTool': MyTool as ToolHandler,
  // ...
};
```

## Pattern

- Loading state: Show `ToolLoading` wrapper with spinner
- Complete state: Render result directly, no wrapper
- Error state: Show error message with `text-destructive`
- Tool name in registry must match: `tool-{toolName}` from AI SDK
