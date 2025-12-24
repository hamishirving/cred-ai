# Migration Plan: Vercel Dependencies → Simplified Stack

## Overview

Migrate from Vercel-specific dependencies (AI Gateway, Postgres, Redis, OIDC) to a simpler, more portable stack using Supabase Postgres and direct Anthropic API access.

**Current Pain Points**:
- Constant credential refresh required (OIDC tokens expire)
- AI Gateway authentication complexity
- Vercel-specific tooling (`vc env pull`, OIDC tokens)
- Multiple environment variables to manage

**Target State**:
- Direct Anthropic API key (simple, stable)
- Supabase Postgres (portable, easy connection string)
- Remove Redis dependency (optional feature)
- Simplified environment configuration

---

## Current Architecture Dependencies

### Database
- **Current**: Vercel Postgres with connection pooling
- **Variables**: `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, etc.
- **Usage**: User accounts, chat history, messages

### AI Provider
- **Current**: Vercel AI Gateway (`myProvider`)
- **Variables**: `AI_GATEWAY_API_KEY`, `VERCEL_OIDC_TOKEN`
- **Usage**: All LLM calls via gateway proxy

### Caching/State
- **Current**: Redis (optional)
- **Variables**: `REDIS_URL`
- **Usage**: Resumable streams (commented out in code)

### Storage
- **Current**: Vercel Blob Storage
- **Variables**: `BLOB_READ_WRITE_TOKEN`
- **Usage**: File attachments, document storage

---

## Migration Strategy

### Phase 1: Database Migration (Vercel Postgres → Supabase)

#### 1.1 Create Supabase Project
1. Create new Supabase project at https://supabase.com
2. Get connection string from Project Settings → Database
3. Note: Connection string format:
   ```
   postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
   ```

#### 1.2 Migrate Database Schema
The schema is defined in `lib/db/schema.ts` using Drizzle ORM.

**Option A: Fresh Start (No Existing Data)**
```bash
# Update .env.local with Supabase connection string
# Run Drizzle migrations
pnpm db:migrate
```

**Option B: Migrate Existing Data**
```bash
# 1. Export from Vercel Postgres
pg_dump $VERCEL_POSTGRES_URL > backup.sql

# 2. Import to Supabase
psql $SUPABASE_POSTGRES_URL < backup.sql
```

#### 1.3 Update Environment Variables
Remove all Vercel Postgres variables, add single Supabase variable:

```env
# Remove:
# DATABASE_URL
# POSTGRES_URL
# POSTGRES_PRISMA_URL
# POSTGRES_URL_NON_POOLING
# POSTGRES_URL_NO_SSL
# PGHOST, PGUSER, PGPASSWORD, etc.

# Add:
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"
```

#### 1.4 Update Database Client
File: `lib/db/drizzle.ts`

Current code likely uses Vercel's connection pooling. Update to use standard node-postgres or Supabase's pooler if needed.

---

### Phase 2: AI Provider Migration (AI Gateway → Direct Anthropic)

#### 2.1 Install Anthropic SDK
```bash
pnpm add @ai-sdk/anthropic
```

#### 2.2 Update Provider Configuration
File: `lib/ai/providers.ts`

**Current** (Vercel AI Gateway):
```typescript
import { createOpenAI } from "@ai-sdk/openai";

export const myProvider = createOpenAI({
  baseURL: "https://gateway.vercel.ai/v1",
  apiKey: process.env.AI_GATEWAY_API_KEY,
  // Uses OIDC tokens
});
```

**New** (Direct Anthropic):
```typescript
import { createAnthropic } from "@ai-sdk/anthropic";

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

#### 2.3 Update Model References
File: `lib/ai/models.ts`

Update model IDs to use Anthropic's naming:
- `chat-model` → `claude-3-5-sonnet-20241022` (or latest)
- `chat-model-reasoning` → `claude-3-5-sonnet-20241022` (no separate reasoning model)
- `title-model` → `claude-3-5-haiku-20241022` (faster/cheaper for titles)

**Example**:
```typescript
export const chatModels: ChatModel[] = [
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    description: "Most capable model",
    maxTokens: 200000,
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    description: "Fast and efficient",
    maxTokens: 200000,
  },
];
```

#### 2.4 Update languageModel Function
File: `lib/ai/providers.ts`

**Current**:
```typescript
languageModel(id: string) {
  return myProvider(id);
}
```

**New**:
```typescript
languageModel(id: string) {
  return anthropic(id);
}
```

#### 2.5 Update All Usage Sites
Files to update:
- `app/(chat)/api/chat/route.ts` - Main chat endpoint
- `app/(chat)/actions.ts` - Title generation
- Any other files using `myProvider`

Replace:
```typescript
model: myProvider.languageModel(selectedChatModel)
```

With:
```typescript
model: anthropic(selectedChatModel)
```

#### 2.6 Update Environment Variables
```env
# Remove:
# AI_GATEWAY_API_KEY
# VERCEL_OIDC_TOKEN

# Add:
ANTHROPIC_API_KEY=sk-ant-xxx
```

---

### Phase 3: Remove Redis Dependency

#### 3.1 Assess Redis Usage
Check `app/(chat)/api/chat/route.ts`:

```typescript
// Lines 296-304 - Already commented out!
// const streamContext = getStreamContext();
// if (streamContext) {
//   return new Response(
//     await streamContext.resumableStream(streamId, () =>
//       stream.pipeThrough(new JsonToSseTransformStream())
//     )
//   );
// }
```

**Good news**: Resumable streams are already disabled.

#### 3.2 Remove Redis Code
1. Delete `getStreamContext()` function
2. Remove `createResumableStreamContext` import
3. Remove `globalStreamContext` variable
4. Clean up related code

#### 3.3 Update Environment
```env
# Remove:
# REDIS_URL
```

#### 3.4 Update Dependencies (Optional)
Remove Redis-related packages if no longer needed:
```bash
pnpm remove resumable-stream ioredis @upstash/redis
```

---

### Phase 4: Remove Vercel Blob (Disable File Uploads)

#### Current Usage
Vercel Blob is used for **chat message attachments** (image uploads):
- File: `app/(chat)/api/files/upload/route.ts`
- Accepts: JPEG/PNG images (5MB limit)
- Used in: Multimodal chat input

**Decision**: Temporarily disable file uploads until Supabase Storage is implemented later.

#### 4.1 Stub Out Upload Route
File: `app/(chat)/api/files/upload/route.ts`

Replace entire file with:
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { error: "File uploads are temporarily disabled" },
    { status: 501 } // 501 Not Implemented
  );
}
```

#### 4.2 Disable Upload Button in UI
File: `components/multimodal-input.tsx`

Update the attachment button to show disabled state with tooltip:
```typescript
// Disable attachment button and show message
disabled={true}
title="File uploads temporarily disabled"
```

#### 4.3 Remove Package Dependencies
```bash
pnpm remove @vercel/blob
```

#### 4.4 Update Environment
Remove from `.env.local`:
```env
# BLOB_READ_WRITE_TOKEN (delete this)
```

#### Note
File upload functionality can be re-enabled later by implementing Supabase Storage (see appendix). For now, chat works perfectly without attachments.

---

### Phase 5: Simplify Environment Configuration

#### 5.1 Final .env.local Structure
```env
# Auth
AUTH_SECRET="xxx"

# Supabase (Database only - Storage coming later)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"

# AI Provider
ANTHROPIC_API_KEY="sk-ant-xxx"

# Credentially API
CREDENTIALLY_API_URL="https://dev-eu-london.drfocused.com/gateway"
CREDENTIALLY_API_KEY="lqy97fIVHaJS-brJ9lvVH28dEKo"
CREDENTIALLY_ORG_ID="2372"

# Google Gemini Data Analytics (optional - if keeping)
GEMINI_BILLING_PROJECT="xxx"
GEMINI_LOCATION="europe-west2"
GEMINI_AGENT_ID="xxx"
GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"
```

**Total: 4-9 variables** (down from 15+)

#### 5.2 Update .env.example
Mirror the simplified structure in `.env.example`.

---

## Implementation Checklist

### Database Migration
- [ ] Create Supabase project
- [ ] Get connection string
- [ ] Export data from Vercel Postgres (if needed)
- [ ] Update `DATABASE_URL` in `.env.local`
- [ ] Run database migrations
- [ ] Import data to Supabase (if needed)
- [ ] Test database connection
- [ ] Remove Vercel Postgres variables

### AI Provider Migration
- [ ] Install `@ai-sdk/anthropic`
- [ ] Get Anthropic API key from https://console.anthropic.com
- [ ] Update `lib/ai/providers.ts`
- [ ] Update `lib/ai/models.ts`
- [ ] Update `app/(chat)/api/chat/route.ts`
- [ ] Update `app/(chat)/actions.ts`
- [ ] Remove AI Gateway variables
- [ ] Test chat functionality
- [ ] Test title generation

### Redis Removal
- [ ] Remove `getStreamContext()` function
- [ ] Remove resumable stream imports
- [ ] Remove `globalStreamContext` variable
- [ ] Remove `REDIS_URL` from environment
- [ ] Remove unused dependencies (optional)

### Storage Removal (Temporary Disable)
- [ ] Stub out `app/(chat)/api/files/upload/route.ts` with 501 response
- [ ] Disable attachment button in `components/multimodal-input.tsx`
- [ ] Remove `@vercel/blob` package
- [ ] Remove `BLOB_READ_WRITE_TOKEN` from environment

### Environment Cleanup
- [ ] Update `.env.local` with new structure
- [ ] Update `.env.example`
- [ ] Remove all Vercel-specific variables
- [ ] Document required environment variables

### Testing
- [ ] Test user authentication
- [ ] Test chat creation and messaging
- [ ] Test tool usage (all AI tools)
- [ ] Test document uploads (if using Blob)
- [ ] Test chat history persistence
- [ ] Verify no OIDC/Gateway errors

---

## File Changes Summary

### Files to Modify

| File | Changes |
|------|---------|
| `lib/ai/providers.ts` | Replace AI Gateway with Anthropic SDK |
| `lib/ai/models.ts` | Update model IDs to Anthropic format |
| `app/(chat)/api/chat/route.ts` | Update provider usage, remove Redis code |
| `app/(chat)/actions.ts` | Update provider for title generation |
| `app/(chat)/api/files/upload/route.ts` | Stub out with "feature disabled" message |
| `components/multimodal-input.tsx` | Disable attachment button |
| `.env.local` | Simplify to 4-9 variables |
| `.env.example` | Update documentation |
| `package.json` | Add `@ai-sdk/anthropic` + `@supabase/supabase-js`, remove Vercel deps |
| `lib/db/drizzle.ts` | May need updates for Supabase connection |

### Files to Check
- `lib/ai/prompts.ts` - May reference model-specific features
- `components/*` - UI may reference model names
- Any file importing `myProvider`

---

## Migration Timeline

**Estimated time**: 1.5-2 hours for full migration

1. **Database (15-30 min)**: Supabase Postgres setup and migration
2. **AI Provider (30-45 min)**: Install Anthropic SDK, update code, test
3. **Storage Removal (5-10 min)**: Stub out file uploads, remove Vercel Blob
4. **Redis Removal (10-15 min)**: Remove code and dependencies
5. **Testing (15-20 min)**: Verify everything works

---

## Rollback Plan

If issues arise:

1. **Database**: Keep old `DATABASE_URL` in `.env.local.backup`
2. **AI Provider**: Keep `AI_GATEWAY_API_KEY` temporarily
3. **Test incrementally**: Migrate one piece at a time

---

## Benefits After Migration

1. **Simpler Credentials**: 2-3 environment variables vs 10+
2. **No Token Refresh**: Anthropic API key doesn't expire like OIDC
3. **Portable**: Can run anywhere (not Vercel-dependent)
4. **Easier Onboarding**: New developers need fewer credentials
5. **Direct API Access**: No gateway intermediary
6. **Better Errors**: Direct Anthropic errors vs gateway abstractions
7. **Cost Visibility**: Direct billing, no gateway markup

---

## Post-Migration Considerations

### Deployment
- Works on any Node.js hosting (Vercel, Netlify, Railway, etc.)
- Supabase Postgres is globally accessible
- No special Vercel CLI commands needed

### Monitoring
- Use Anthropic Console for API usage/costs
- Use Supabase Dashboard for database metrics
- Simpler stack = easier debugging

### Team Onboarding
Just need to share:
1. Supabase project connection string
2. Anthropic API key
3. Auth secret

---

**Document Version**: 1.0
**Last Updated**: 2025-12-23
**Status**: Ready for Implementation
