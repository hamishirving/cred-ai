# PostHog LLM Analytics Integration

**Status: Implemented**

LLM observability to capture AI generations, costs, and performance metrics.

## Overview

PostHog's `@posthog/ai` package wraps AI SDK models with `withTracing` to automatically capture `$ai_generation` events for each LLM call.

## Installation

```bash
pnpm add @posthog/ai
```

Note: `posthog-node` is already installed.

## Integration Steps

### 1. Update providers.ts

Wrap the Anthropic models with `withTracing`:

```ts
// lib/ai/providers.ts
import { createAnthropic } from "@ai-sdk/anthropic";
import { customProvider, wrapLanguageModel, extractReasoningMiddleware } from "ai";
import { withTracing } from "@posthog/ai";
import { posthogServer } from "@/lib/posthog-server";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Wrap models with PostHog tracing
const tracedModel = (modelId: string) =>
  withTracing(anthropic(modelId), posthogServer);

export const myProvider = customProvider({
  languageModels: {
    "chat-model": tracedModel("claude-sonnet-4-5"),
    "chat-model-reasoning": wrapLanguageModel({
      model: tracedModel("claude-sonnet-4-5"),
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    }),
    "title-model": tracedModel("claude-haiku-4-5"),
    "artifact-model": tracedModel("claude-sonnet-4-5"),
  },
});
```

### 2. Add User Context to Generations

Pass `posthogDistinctId` to associate generations with users. Update the chat route:

```ts
// app/(chat)/api/chat/route.ts
const model = withTracing(
  myProvider.languageModel(selectedChatModel),
  posthogServer,
  {
    posthogDistinctId: session.user.id,
    posthogProperties: {
      chatId: id,
      model: selectedChatModel,
    },
  }
);

const result = streamText({
  model,
  // ... rest of config
});
```

### 3. Ensure Server Shutdown

The server-side PostHog client needs to flush events. For serverless, this happens automatically. For long-running processes, call `posthogServer.shutdown()` on process exit.

Current `lib/posthog-server.ts` should already handle this, but verify:

```ts
import { PostHog } from "posthog-node";

export const posthogServer = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  { host: "https://eu.i.posthog.com" }
);

// Flush on serverless function completion (automatic in Vercel)
```

## Events Captured

Each LLM call will capture an `$ai_generation` event with:

| Property | Description |
|----------|-------------|
| `$ai_model` | Model ID (e.g., "claude-sonnet-4-5") |
| `$ai_provider` | Provider name (e.g., "anthropic") |
| `$ai_input_tokens` | Input token count |
| `$ai_output_tokens` | Output token count |
| `$ai_latency` | Response time in ms |
| `$ai_prompt` | The prompt/messages sent |
| `$ai_response` | The model's response |

## Dashboard

After integration, view LLM analytics in PostHog:
- **Traces** tab: See full conversation traces
- **Generations** tab: Individual LLM calls with metrics
- Cost tracking (if pricing configured)

## Considerations

1. **Streaming**: `withTracing` works with both `generateText` and `streamText`
2. **Privacy**: Prompts and responses are captured - ensure compliance with data policies
3. **Costs**: Events count toward PostHog usage quota
4. **Test Environment**: May want to disable tracing in tests via environment check

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `@posthog/ai` dependency |
| `lib/ai/providers.ts` | Wrap models with `withTracing` |
| `app/(chat)/api/chat/route.ts` | Add user context to traced model |
| `lib/posthog-server.ts` | Verify export name matches |
