# Message Component Refactoring Plan

## Executive Summary

The `components/message.tsx` file has grown to 480+ lines with significant code duplication and inconsistent UX patterns. This document outlines a refactoring plan to improve maintainability, consistency, and developer experience.

## Current State Analysis

### File Statistics
- **Lines of code**: 430+ (after cleanup)
- **Number of tool handlers**: 8 (reduced from 10)
- **Duplicate code patterns**: ~160 lines of repetitive tool rendering logic
- **Complexity**: High - all tool rendering logic in a single component

### Tool Handlers Inventory

| Tool Type | Pattern | Shows Loading? | Lines of Code |
|-----------|---------|----------------|---------------|
| `tool-queryDataAgent` | Tool wrapper | ✅ Yes | ~20 |
| `tool-getProfile` | Direct render | ❌ No | ~20 |
| `tool-getDocuments` | Direct render | ❌ No | ~20 |
| `tool-createForm` | Tool wrapper | ✅ Yes | ~20 |
| `tool-draftEmail` | Tool wrapper | ✅ Yes | ~15 |
| `tool-createDocument` | Direct render | ❌ No | ~20 |
| `tool-updateDocument` | Direct render | ❌ No | ~20 |
| `tool-requestSuggestions` | Tool wrapper | ✅ Yes | ~25 |

**Note**: `getWeather` and `getCustomer` tools removed as unused. `lookupProfile` renamed to `getProfile` for naming consistency.

### Identified Patterns

#### Pattern 1: Tool Wrapper with State
```tsx
if (type === "tool-xyz") {
  const { toolCallId, state } = part;

  return (
    <Tool defaultOpen={true} key={toolCallId}>
      <ToolHeader state={state} type="tool-xyz" />
      <ToolContent>
        {state === "input-available" && <ToolInput input={part.input} />}
        {state === "output-available" && (
          <ToolOutput
            errorText={undefined}
            output={<CustomComponent data={part.output} />}
          />
        )}
      </ToolContent>
    </Tool>
  );
}
```

**Used by**: queryDataAgent, createForm, draftEmail, requestSuggestions

**Benefits**:
- Shows loading indicators
- Displays input parameters
- Collapsible UI
- Consistent state feedback

**Issues**:
- `state` property may be undefined causing TypeErrors
- Lots of boilerplate code

#### Pattern 2: Direct Output Rendering
```tsx
if (type === "tool-xyz") {
  const { toolCallId } = part;

  if (part.output && "error" in part.output) {
    return <ErrorDiv>Error message</ErrorDiv>;
  }

  if (part.output && "data" in part.output) {
    return <CustomComponent data={part.output.data} key={toolCallId} />;
  }

  return null;
}
```

**Used by**: getProfile, getDocuments, createDocument, updateDocument

**Benefits**:
- Simpler code
- No state management
- Direct rendering

**Issues**:
- ❌ **No loading feedback** - tool execution is invisible to user
- ❌ **Inconsistent UX** - different tools behave differently
- No input parameter visibility
- No collapsible UI

## Problems to Solve

### 1. Code Duplication
- Each tool handler repeats 90% of the same code
- Adding a new tool requires copying ~20 lines of boilerplate
- Changes to tool rendering require updating multiple handlers

### 2. Inconsistent User Experience
- Some tools show "Running..." state, others don't
- Some tools are collapsible, others aren't
- Some tools show input parameters, others don't
- **User feedback**: "I don't see proper feedback when tool being called"

### 3. Maintainability Issues
- 480-line file is difficult to navigate
- Tool handlers are tightly coupled to the message component
- No easy way to test individual tool handlers
- Hard to find specific tool rendering logic

### 4. Type Safety Issues
- `state` property causing runtime errors when undefined
- No centralized type definitions for tool outputs
- Inconsistent error handling patterns

### 5. Missing Loading States
- 4 out of 8 tools show NO loading feedback
- Users can't tell when tools are executing
- Poor UX for data-fetching operations (getProfile, getDocuments especially)

## Proposed Architecture

### Directory Structure
```
components/
├── message.tsx (simplified)
├── tool-handlers/
│   ├── index.tsx (registry + exports)
│   ├── tool-renderer.tsx (generic wrapper)
│   ├── use-tool-state.ts (state management hook)
│   ├── handlers/
│   │   ├── data-agent-tool.tsx
│   │   ├── profile-tool.tsx
│   │   ├── documents-tool.tsx
│   │   ├── form-tool.tsx
│   │   ├── email-tool.tsx
│   │   ├── document-create-tool.tsx
│   │   ├── document-update-tool.tsx
│   │   └── suggestions-tool.tsx
│   └── types.ts
```

### Core Components

#### 1. `ToolRenderer` (Generic Wrapper)
A single component that handles all common tool rendering logic:

```tsx
interface ToolRendererProps {
  toolCallId: string;
  type: string;
  state?: ToolUIPart["state"];
  input?: any;
  output?: any;
  errorText?: string;
  renderOutput: (output: any) => ReactNode;
  defaultOpen?: boolean;
  showInput?: boolean;
  showLoadingState?: boolean;
}

export function ToolRenderer({
  toolCallId,
  type,
  state,
  input,
  output,
  errorText,
  renderOutput,
  defaultOpen = true,
  showInput = true,
  showLoadingState = true,
}: ToolRendererProps) {
  // Handles all the common Tool/ToolHeader/ToolContent logic
  // Provides consistent loading states
  // Handles errors uniformly
  // Makes state optional with safe defaults
}
```

#### 2. Individual Tool Handlers
Each tool gets its own file with a simple interface:

```tsx
// components/tool-handlers/handlers/documents-tool.tsx
import type { ToolHandlerProps } from "../types";

export function DocumentsTool({ part }: ToolHandlerProps) {
  return (
    <ToolRenderer
      toolCallId={part.toolCallId}
      type="tool-getDocuments"
      state={part.state}
      input={part.input}
      output={part.output}
      renderOutput={(output) => {
        if ("error" in output) {
          return <ErrorMessage message={output.error} />;
        }
        if ("data" in output) {
          return <DocumentsTable documents={output.data} />;
        }
        return null;
      }}
    />
  );
}
```

#### 3. Tool Registry
Maps tool types to their handler components:

```tsx
// components/tool-handlers/index.tsx
import { DataAgentTool } from "./handlers/data-agent-tool";
import { DocumentsTool } from "./handlers/documents-tool";
// ... other imports

export const TOOL_HANDLERS = {
  "tool-queryDataAgent": DataAgentTool,
  "tool-getProfile": ProfileTool,
  "tool-getDocuments": DocumentsTool,
  "tool-createForm": FormTool,
  "tool-draftEmail": EmailTool,
  "tool-createDocument": DocumentCreateTool,
  "tool-updateDocument": DocumentUpdateTool,
  "tool-requestSuggestions": SuggestionsTool,
} as const;

export function renderToolHandler(part: ToolPart) {
  const Handler = TOOL_HANDLERS[part.type];
  if (!Handler) return null;
  return <Handler part={part} />;
}
```

#### 4. Simplified Message Component
The main message component becomes much simpler:

```tsx
// In message.tsx, replace the giant switch statement with:

{message.parts?.map((part, index) => {
  const { type } = part;
  const key = `message-${message.id}-part-${index}`;

  if (type === "reasoning" && part.text?.trim().length > 0) {
    return <MessageReasoning key={key} reasoning={part.text} isLoading={isLoading} />;
  }

  if (type === "text") {
    return <TextMessageContent key={key} part={part} mode={mode} message={message} />;
  }

  // Handle all tool types with a single call
  if (type.startsWith("tool-")) {
    return <Fragment key={key}>{renderToolHandler(part)}</Fragment>;
  }

  return null;
})}
```

### State Management Strategy

#### Option A: Use existing `state` property (if available)
- Check if `state` exists on part
- Fall back to "completed" state if missing
- Show loading UI only when state is explicitly set

#### Option B: Derive state from output presence
```tsx
function deriveToolState(part: ToolPart): ToolState {
  if (part.state) return part.state;
  if (!part.output) return "input-streaming";
  if (part.output && "error" in part.output) return "output-error";
  return "output-available";
}
```

#### Option C: Always show loading wrapper
- Assume tools are async operations
- Show loading state until output is available
- Most consistent UX

**Recommendation**: Option C for consistency

## Implementation Plan

### Phase 1: Foundation (Est. 30 min)
1. Create `components/tool-handlers/` directory structure
2. Create `types.ts` with shared type definitions
3. Create `ToolRenderer` generic component
4. Create `useToolState` hook for state derivation
5. Add tests for ToolRenderer

### Phase 2: Extract Tool Handlers (Est. 45 min)
For each tool type:
1. Create handler file in `handlers/` directory
2. Extract rendering logic from message.tsx
3. Wrap in ToolRenderer component
4. Ensure loading state works
5. Test individually

Order of extraction:
1. Start with simple ones: `tool-getDocuments`, `tool-getProfile`
2. Move to wrapper-based ones: `tool-queryDataAgent`, `tool-createForm`
3. Special cases last: `tool-createDocument`, `tool-updateDocument`

### Phase 3: Create Registry (Est. 15 min)
1. Create `index.tsx` with TOOL_HANDLERS map
2. Create `renderToolHandler()` function
3. Export all handlers

### Phase 4: Update Message Component (Est. 15 min)
1. Import `renderToolHandler` from tool-handlers
2. Replace all individual tool handlers with single `renderToolHandler` call
3. Remove unused imports
4. Test all tool types still render correctly

### Phase 5: Testing & Validation (Est. 30 min)
1. Test each tool type in the app
2. Verify loading states appear correctly
3. Verify error handling works
4. Check for TypeScript errors
5. Run existing tests

### Phase 6: Cleanup (Est. 15 min)
1. Remove commented-out code
2. Update documentation
3. Add JSDoc comments to public interfaces
4. Format code

**Total estimated time**: ~2.5 hours

## Benefits

### Immediate Benefits
1. ✅ **Consistent loading feedback** - all tools show "Running" state
2. ✅ **Smaller files** - main message.tsx reduced from 480 to ~200 lines
3. ✅ **Easier to maintain** - each tool handler is isolated
4. ✅ **Better UX** - uniform experience across all tools
5. ✅ **Fix TypeError** - proper state handling with fallbacks

### Long-term Benefits
1. **Easy to add new tools** - just create a new handler file
2. **Testable** - each handler can be tested independently
3. **Reusable** - ToolRenderer can be used for future tools
4. **Type-safe** - centralized type definitions
5. **Debuggable** - easier to find and fix tool-specific issues

## Risks & Mitigation

### Risk 1: Breaking existing functionality
**Mitigation**:
- Comprehensive testing before and after
- Keep original message.tsx as backup
- Incremental migration (one tool at a time)

### Risk 2: TypeScript errors with part types
**Mitigation**:
- Define proper types upfront
- Use discriminated unions for tool parts
- Add type guards where needed

### Risk 3: Performance regression
**Mitigation**:
- Profile before/after
- Use React.memo on tool handlers
- Keep ToolRenderer lightweight

### Risk 4: Missing edge cases
**Mitigation**:
- Review all 10 tool handlers carefully
- Document special cases
- Add tests for edge cases

## Success Criteria

1. ✅ All 8 tool types render correctly
2. ✅ All tools show loading states consistently
3. ✅ No TypeScript errors
4. ✅ No runtime errors in console
5. ✅ Message.tsx reduced to <250 lines
6. ✅ Each tool handler is <50 lines
7. ✅ All existing tests pass
8. ✅ User can see loading feedback for all tools
9. ✅ Naming conventions are consistent (get*, create*, update*, etc.)

## Alternative Approaches Considered

### Alternative 1: Keep everything in message.tsx, just deduplicate
**Pros**: Less file churn, simpler refactor
**Cons**: File still huge, doesn't solve UX issues

### Alternative 2: Create one giant ToolHandler component with switch statement
**Pros**: Single file for all tools
**Cons**: Still repetitive, harder to test individual tools

### Alternative 3: Use factory pattern for tool handlers
**Pros**: Very DRY
**Cons**: More complex, harder to understand

**Decision**: Proposed approach (separate files + registry) offers best balance of simplicity and maintainability.

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Get approval** to proceed
3. **Create feature branch** for refactoring
4. **Implement Phase 1** (foundation)
5. **Incremental implementation** of remaining phases
6. **Testing & validation**
7. **Merge to main**

## Questions for Review

1. Should we tackle all 10 tools at once, or do a subset first?
2. Should ToolRenderer always show loading states, or respect existing patterns?
3. Should we add unit tests for each tool handler?
4. Should we update the AI SDK types to properly type the `state` property?
5. Any concerns about the proposed directory structure?

---

**Document Version**: 1.0
**Created**: 2025-12-26
**Author**: Claude Code
**Status**: Draft - Awaiting Approval
