# Stream Browser Screenshots with Each Action

## Context

Browser automation tools (DVLA, BLS) stream real-time action events to the frontend during execution. Currently these are text-only ("Click: dismiss cookie banner"). We want to capture a screenshot after each action, upload it, and stream the URL alongside the action — so each fade-in shows what the browser looks like at that moment.

BrowserBase's recording API no longer returns rrweb data (they moved to video), so this also replaces the broken session replay feature.

## Approach

Take a JPEG screenshot via Playwright after each action, upload to Supabase Storage ("screenshots" bucket, public), include the URL in the existing `BrowserAction` SSE payload. Frontend shows the image below the action text in the existing fade animation.

## Files to Change

### 1. New: `lib/supabase/admin.ts`
Supabase client using service role key (no cookies needed). Singleton pattern.

### 2. New: `lib/ai/tools/screenshot-uploader.ts`
Helper: `captureAndUploadScreenshot(page, agentId, executionId, actionIndex) → string | undefined`
- `page.screenshot({ type: "jpeg", quality: 50 })`
- Upload to `screenshots/{agentId}/{executionId}/{index}.jpg`
- Return public URL, or `undefined` on failure (never throws)

### 3. `lib/ai/agents/types.ts`
Add `screenshotUrl?: string` to `BrowserAction` interface.

### 4. `lib/ai/agents/tool-resolver.ts`
- Add `agentId` and `executionId` to `ToolResolverCallbacks`
- Pass as context object to `createBrowseAndVerify` / `createDvlaBrowseVerify`

### 5. `lib/ai/agents/runner.ts`
Pass `agentId` and `executionId` to `resolveTools` callbacks (both are already in scope at line 162).

### 6. `lib/ai/tools/dvla-browse-verify.ts`
- Change factory: `createDvlaBrowseVerify(ctx?: BrowserToolContext)` with `{ onAction, agentId, executionId }`
- Make `emit` async — capture screenshot before emitting each action
- `await emit(...)` at each call site
- Skip screenshot for `browser-ready` (page not loaded yet)

### 7. `lib/ai/tools/browse-and-verify.ts`
Same pattern as DVLA tool.

### 8. `components/agents/step-cards/browser-step-card.tsx`
- Change container from `h-5` to auto height
- Show `<img>` below action text when `screenshotUrl` exists
- Image: `rounded border border-border/50 w-full`

### 9. `components/agents/execution-timeline.tsx`
Same screenshot display in the "Browser working..." preview section.

### 10. Delete `app/(app)/api/sessions/[sessionId]/recording/route.ts`
Dead code — BrowserBase recording API no longer returns data.

## Infra

- Create `screenshots` bucket in Supabase (public, JPEG only, 5MB limit)
- `SUPABASE_SERVICE_ROLE_KEY` already in `.env.local`

## Verification

1. Run `pnpm dev`, trigger DVLA or BLS agent
2. Confirm screenshots appear in Supabase Storage dashboard under `screenshots/`
3. Confirm each action fades in with a screenshot below the text
4. Confirm historical executions show screenshots (URLs persist in DB)
5. `npx tsc --noEmit` passes

## Open Question

Check with BrowserBase team if there's an API/embed option for video-based recordings that we're missing. If they offer an embeddable player or video URL endpoint, that could be simpler than capturing our own screenshots.
