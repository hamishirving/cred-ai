# Architecture Guide

This document outlines the architecture patterns and best practices for this Next.js 16 + AI SDK 6 application. Reference this when implementing new features to maintain consistency.

## Table of Contents

- [Project Structure](#project-structure)
- [Next.js 16 Patterns](#nextjs-16-patterns)
- [AI SDK 6 Patterns](#ai-sdk-6-patterns)
- [Database Layer](#database-layer)
- [Authentication](#authentication)
- [Analytics](#analytics)
- [Component Architecture](#component-architecture)
- [Testing](#testing)

---

## Project Structure

```
app/                    # Next.js App Router - routes and API endpoints
├── (auth)/             # Auth route group (login, register, actions)
├── (chat)/             # Main app route group with API routes
│   └── api/            # API endpoints (chat, document, history, etc.)
└── layout.tsx          # Root layout with providers

components/
├── ui/                 # shadcn/ui primitives (do not modify directly)
├── elements/           # Reusable composed elements
└── tool-handlers/      # AI tool result renderers with registry

lib/
├── ai/                 # AI SDK config: providers, prompts, tools/
├── api/                # External API clients and types
├── db/                 # Drizzle schema, queries, migrations
└── supabase/           # Supabase client utilities

artifacts/              # Artifact type implementations (code, text, etc.)
hooks/                  # Custom React hooks
tests/                  # E2E, route, and unit tests
proxy.ts                # Network proxy (replaces middleware in Next.js 16)
instrumentation-client.ts  # Client-side instrumentation (PostHog)
```

### Key Conventions

1. **Route Groups**: Use `(name)` folders for logical grouping without affecting URLs
2. **Colocation**: Keep related files together (actions.ts next to pages)
3. **Barrel Exports**: Use index.tsx for public APIs, keep internals private
4. **Feature Folders**: Group by feature in components/, not by type

---

## Next.js 16 Patterns

### Async Request APIs

All request APIs are now async. Always await params, searchParams, cookies, and headers:

```tsx
// Page with params
export default async function Page(
  props: PageProps<'/chat/[id]'>
) {
  const { id } = await props.params;
  // ...
}

// Accessing cookies/headers
import { cookies, headers } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const headersList = await headers();
  // ...
}
```

### Proxy (Replaces Middleware)

Network-level logic lives in `proxy.ts`, not middleware:

```ts
// proxy.ts
import { type NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  // Auth checks, redirects, rewrites
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Important**: Proxy runs on Node.js runtime only (not Edge).

### Server Components (Default)

Components are Server Components by default. Only add `"use client"` when needed:

```tsx
// Server Component (default) - can fetch data directly
export default async function ProfilePage() {
  const profile = await getProfile(); // Direct DB/API call
  return <ProfileCard profile={profile} />;
}

// Client Component - only when needed
"use client";
export function InteractiveForm() {
  const [state, setState] = useState();
  // Event handlers, hooks, browser APIs
}
```

### Server Actions

Use Server Actions for mutations. Define in separate `actions.ts` files:

```ts
// app/(chat)/actions.ts
"use server";

import { revalidatePath } from 'next/cache';

export async function deleteChat(chatId: string) {
  await db.delete(chat).where(eq(chat.id, chatId));
  revalidatePath('/');
}
```

Call from Client Components:

```tsx
"use client";
import { deleteChat } from './actions';

export function DeleteButton({ chatId }: { chatId: string }) {
  return (
    <button onClick={() => deleteChat(chatId)}>
      Delete
    </button>
  );
}
```

### Streaming with Suspense

Use Suspense boundaries for streaming:

```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatHistory />
    </Suspense>
  );
}
```

### Client-Side Instrumentation

Use `instrumentation-client.ts` for client-side initialization (analytics, error tracking):

```ts
// instrumentation-client.ts
import posthog from 'posthog-js';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: '/ingest',
  capture_exceptions: true,
});
```

---

## AI SDK 6 Patterns

### Provider Configuration

Configure AI providers in `lib/ai/providers.ts`:

```ts
import { createAnthropic } from '@ai-sdk/anthropic';
import { customProvider, wrapLanguageModel, extractReasoningMiddleware } from 'ai';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const myProvider = customProvider({
  languageModels: {
    'chat-model': anthropic('claude-sonnet-4-5'),
    'chat-model-reasoning': wrapLanguageModel({
      model: anthropic('claude-sonnet-4-5'),
      middleware: extractReasoningMiddleware({ tagName: 'thinking' }),
    }),
    'title-model': anthropic('claude-haiku-4-5'),
  },
});
```

### Streaming Chat API Route

Use `streamText` with `createUIMessageStream` for chat:

```ts
// app/(chat)/api/chat/route.ts
import { streamText, createUIMessageStream, convertToModelMessages } from 'ai';

export async function POST(request: Request) {
  const { messages, selectedChatModel } = await request.json();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt,
        messages: await convertToModelMessages(messages),
        tools: { /* tool definitions */ },
        onFinish: async ({ usage }) => {
          // Save to database, track analytics
        },
      });

      result.consumeStream();
      writer.merge(result.toUIMessageStream({ sendReasoning: true }));
    },
    onFinish: async ({ messages }) => {
      await saveMessages({ messages });
    },
  });

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
```

### Tool Definitions

Define tools in `lib/ai/tools/` using the `tool` helper:

```ts
// lib/ai/tools/get-profile.ts
import { tool } from 'ai';
import { z } from 'zod';

export const getProfile = tool({
  description: `Look up an employee profile.
Use this when the user asks about:
- Finding an employee by email
- Getting employee details`,

  inputSchema: z.object({
    email: z.string().email().optional(),
    profileId: z.string().optional(),
  }),

  execute: async ({ email, profileId }) => {
    // Validate input
    if (!email && !profileId) {
      return { error: 'Please provide email or profile ID' };
    }

    // Perform lookup
    const result = await getProfileByEmail(email);

    if (isApiError(result)) {
      return { error: result.error };
    }

    return { data: result };
  },
});
```

**Tool Description Best Practices**:
- Explain what the tool does
- List when it should be used
- Describe expected input formats
- Be specific to improve model selection

### Tool Result Rendering

Create handlers in `components/tool-handlers/handlers/`:

```tsx
// components/tool-handlers/handlers/profile-tool.tsx
import { ToolLoading } from '../tool-renderer';
import { ProfileCard } from '@/components/profile-card';
import type { ToolHandlerProps } from '../types';

interface ProfileOutput {
  data?: ProfileDto;
  error?: string;
}

export function ProfileTool({
  toolCallId,
  state,
  input,
  output
}: ToolHandlerProps<unknown, ProfileOutput>) {
  // Show loading state while tool is running
  if (!output) {
    return (
      <ToolLoading
        toolCallId={toolCallId}
        toolName="Get Profile"
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
    return <ProfileCard profile={output.data} />;
  }

  return null;
}
```

Register in `components/tool-handlers/index.tsx`:

```tsx
const toolRegistry: Record<string, ToolHandler> = {
  'tool-getProfile': ProfileTool as ToolHandler,
  // ... other tools
};

export function renderTool(toolType: string, props: ToolHandlerProps) {
  const Handler = toolRegistry[toolType];
  return Handler ? <Handler {...props} /> : null;
}
```

### System Prompts

Define in `lib/ai/prompts.ts`:

```ts
export function systemPrompt({ selectedChatModel, requestHints }: {
  selectedChatModel: string;
  requestHints: RequestHints;
}) {
  return `You are an AI assistant for employee management.

Current date: ${new Date().toLocaleDateString()}
${requestHints.city ? `User location: ${requestHints.city}, ${requestHints.country}` : ''}

Available tools:
- getProfile: Look up employee profiles
- getDocuments: Retrieve employee documents
- manageProfile: Create or update profiles

IMPORTANT RULES:
- Always use tools when the user asks for data
- Keep responses brief after tool results (they display in rich UI)
- Never fabricate employee data`;
}
```

### Multi-Step Tool Execution

Use `stopWhen` to control agent loops:

```ts
const result = streamText({
  model: myProvider.languageModel(selectedChatModel),
  messages,
  tools,
  stopWhen: stepCountIs(5), // Max 5 tool calls per request
});
```

---

## Database Layer

### Drizzle Schema

Define schema in `lib/db/schema.ts`:

```ts
import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id),
  title: text('title').notNull(),
  visibility: text('visibility').$type<'private' | 'public'>().notNull().default('private'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});
```

### Query Functions

Define queries in `lib/db/queries.ts`:

```ts
import { db } from './drizzle';
import { chat, message } from './schema';
import { eq, desc, and } from 'drizzle-orm';

export async function getChatById({ id }: { id: string }) {
  const [result] = await db
    .select()
    .from(chat)
    .where(eq(chat.id, id));
  return result;
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: 'private' | 'public';
}) {
  return db.insert(chat).values({ id, userId, title, visibility });
}
```

### Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio
```

---

## Authentication

### Supabase Auth

Server-side auth check:

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

Auth helper:

```ts
// app/(auth)/auth.ts
import { createClient } from '@/lib/supabase/server';

export async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    user: {
      id: user.id,
      email: user.email!,
      type: user.user_metadata.type ?? 'regular',
    },
  };
}
```

### Protected Routes

Check auth in API routes and pages:

```ts
// API route
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }
  // ...
}

// Page
export default async function ChatPage() {
  const session = await auth();
  if (!session) redirect('/login');
  // ...
}
```

---

## Analytics

### PostHog Integration

**Client-side** (via `instrumentation-client.ts`):

```ts
import posthog from 'posthog-js';

// Track events
posthog.capture('message_sent', { model: selectedModel });

// Identify users
posthog.identify(userId, { email: user.email });
```

**Server-side** (via `lib/posthog-server.ts`):

```ts
import { PostHog } from 'posthog-node';

const posthog = new PostHog(process.env.POSTHOG_API_KEY!);

export function trackServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  posthog.capture({ distinctId: userId, event, properties });
}
```

### Reverse Proxy

Configure in `next.config.ts` to bypass ad blockers:

```ts
async rewrites() {
  return [
    {
      source: '/ingest/static/:path*',
      destination: 'https://eu-assets.i.posthog.com/static/:path*',
    },
    {
      source: '/ingest/:path*',
      destination: 'https://eu.i.posthog.com/:path*',
    },
  ];
}
```

---

## Component Architecture

### UI Components (shadcn/ui)

Located in `components/ui/`. Do not modify directly - extend via composition:

```tsx
// Good: Compose shadcn components
import { Button } from '@/components/ui/button';

export function SubmitButton({ loading, ...props }) {
  return (
    <Button disabled={loading} {...props}>
      {loading ? <Spinner /> : props.children}
    </Button>
  );
}

// Bad: Modifying components/ui/button.tsx directly
```

### Feature Components

Colocate related components:

```
components/
├── chat/
│   ├── chat-header.tsx
│   ├── chat-input.tsx
│   └── chat-messages.tsx
├── profile/
│   ├── profile-card.tsx
│   └── profile-form.tsx
```

### Client/Server Split

Keep server data fetching separate from client interactivity:

```tsx
// Server Component (fetches data)
export default async function ProfilePage({ params }) {
  const { id } = await params;
  const profile = await getProfile(id);
  return <ProfileView profile={profile} />;
}

// Client Component (handles interaction)
"use client";
export function ProfileView({ profile }) {
  const [editing, setEditing] = useState(false);
  // ...
}
```

---

## Testing

### Structure

```
tests/
├── e2e/           # End-to-end tests (Playwright)
├── routes/        # API route tests
├── pages/         # Page object models
├── prompts/       # AI prompt testing
├── fixtures.ts    # Shared test fixtures
└── helpers.ts     # Test utilities
```

### API Route Testing

```ts
// tests/routes/chat.test.ts
import { POST } from '@/app/(chat)/api/chat/route';

describe('Chat API', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

### E2E Testing

```ts
// tests/e2e/chat.test.ts
import { test, expect } from '@playwright/test';

test('user can send a message', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="chat-input"]', 'Hello');
  await page.click('[data-testid="send-button"]');
  await expect(page.locator('[data-testid="message"]')).toBeVisible();
});
```

---

## Quick Reference

### Adding a New AI Tool

1. Create tool in `lib/ai/tools/my-tool.ts`
2. Add to tools object in `app/(chat)/api/chat/route.ts`
3. Add to `experimental_activeTools` array
4. Create handler in `components/tool-handlers/handlers/my-tool.tsx`
5. Register in `components/tool-handlers/index.tsx`
6. Update system prompt in `lib/ai/prompts.ts`

### Adding a New API Route

1. Create `route.ts` in `app/(chat)/api/[endpoint]/`
2. Export async functions: `GET`, `POST`, `PUT`, `DELETE`
3. Always check auth: `const session = await auth()`
4. Use Zod for request validation
5. Return proper error responses via `ChatSDKError`

### Adding a New Page

1. Create `page.tsx` in appropriate route group
2. Add `loading.tsx` for Suspense fallback
3. Create Server Component for data fetching
4. Extract Client Components for interactivity
5. Add to navigation if needed

---

## Resources

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [AI SDK Documentation](https://ai-sdk.dev/docs/introduction)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [PostHog Next.js Integration](https://posthog.com/docs/libraries/next-js)
