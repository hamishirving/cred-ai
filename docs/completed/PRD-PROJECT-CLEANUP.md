# PRD: Project Cleanup

**Status:** Complete
**Owner:** Engineering
**Last Updated:** 2025-12-29

---

## Overview

This project was cloned from the [Vercel AI Chatbot template](https://github.com/vercel/ai-chatbot). While this provided an excellent starting point, the project has evolved to focus on Credentially-specific capabilities (AI Compliance Companion, voice features, data model experimentation) rather than being a general-purpose chatbot.

This cleanup plan aims to:
1. Remove unused test infrastructure and template artefacts
2. Eliminate unnecessary dependencies
3. Streamline the codebase for its actual purpose
4. Maintain the core tech stack: **Next.js, AI SDK, Supabase, Drizzle**

### What to KEEP

The chatbot functionality remains important as the primary interface for the AI Compliance Companion. The following must be preserved:

- **Chat interface** - Core user interaction pattern
- **Voice features** - `/lib/voice/` - Vapi integration for AI phone calls
- **AI tools** - `/lib/ai/tools/` - Credentially API integrations
- **Database layer** - Drizzle ORM with Supabase
- **Authentication** - Supabase Auth
- **Core UI components** - shadcn/ui components in `/components/ui/`
- **Artifacts system** - Document generation and preview
- **Editor functionality** - ProseMirror-based text editor (used for artifacts)

---

## Cleanup Tasks

### Phase 1: Remove Test Infrastructure

The Playwright test suite was inherited from the template and is not being used for this playground project. The tests reference template-specific features and test users.

#### Files/Directories to Remove

- [ ] `/tests/` - Entire test directory
  - [ ] `/tests/e2e/` - E2E tests (artifacts, chat, reasoning, session)
  - [ ] `/tests/routes/` - API route tests
  - [ ] `/tests/pages/` - Page object models
  - [ ] `/tests/prompts/` - Prompt testing utilities
  - [ ] `/tests/fixtures.ts` - Test fixtures (Ada, Babbage, Curie test users)
  - [ ] `/tests/helpers.ts` - Test utilities
  - [ ] `/tests/claude.md` - Test documentation
- [ ] `/playwright.config.ts` - Playwright configuration
- [ ] `/lib/ai/models.test.ts` - Mock models for testing

#### Dependencies to Remove

- [ ] `@playwright/test` - Playwright testing framework (devDependency)

#### Package.json Changes

- [ ] Remove `"test"` script: `"test": "export PLAYWRIGHT=True && pnpm exec playwright test"`

---

### Phase 2: Remove Template-Specific Files

Files that are specific to the Vercel template and not needed for this project.

#### Files to Remove

- [ ] `/vercel-template.json` - Vercel template marketplace configuration (references Neon, Upstash KV, Vercel Blob - none used)
- [ ] `/LICENSE` - Apache 2.0 license from Vercel (replace with proprietary or update)
- [ ] `/public/images/demo-thumbnail.png` - Template demo image
- [ ] `/public/images/mouth of the seine, monet.jpg` - Sample image for template demos
- [ ] `/app/(chat)/opengraph-image.png` - Template OpenGraph image (replace with Credentially branding)
- [ ] `/app/(chat)/twitter-image.png` - Template Twitter card image (replace with Credentially branding)

#### Files to Review/Update

- [ ] `/README.md` - Update to be Credentially-specific (currently a mix of template and custom content)
- [ ] `/package.json` - Change name from `"ai-chatbot"` to `"cred-ai"` or `"credentially-playground"`

---

### Phase 3: Remove Unused Dependencies

Dependencies that appear in `package.json` but are not imported in the codebase.

#### Confirmed Unused Dependencies

- [ ] `@ai-sdk/xai` - xAI/Grok provider (only in package.json, never imported)
- [ ] `redis` - Redis client (README mentions "removed for simplicity", no imports found)

#### Dependencies to Investigate

These dependencies may be partially used or only used by shadcn/ui components:

- [ ] `embla-carousel-react` - Only used in `/components/ui/carousel.tsx` - Keep if carousel is used
- [ ] `orderedmap` - Check if used by ProseMirror dependencies
- [ ] `mermaid` - Check if diagrams are actually rendered anywhere

---

### Phase 4: Clean Up Documentation

Remove or consolidate documentation that's no longer relevant.

#### Directories to Review

- [ ] `/docs/completed/` - Archive of completed migration plans
  - [ ] `api-migration-plan.md` - Completed
  - [ ] `architecture-old.md` - Superseded by ARCHITECTURE.md
  - [ ] `implementation-plan.md` - Completed
  - [ ] `vercel-migration-plan.md` - Completed (migrated to Supabase)
- [ ] `/docs/existing-features/` - Review if still relevant

#### Decision Required

Keep `/docs/completed/` as historical reference, or archive/remove?

---

### Phase 5: Miscellaneous Cleanup

#### Scripts to Verify

- [ ] `db:delete-guests` script references `scripts/delete-guest-users.ts` but `/scripts/` directory doesn't exist
  - Either create the script or remove the npm script

#### Files to Review

- [ ] `/proxy.ts` - PostHog proxy, verify if still needed
- [ ] `/instrumentation-client.ts` - Check if PostHog instrumentation is configured correctly
- [ ] `.posthog-events.json` - Review if this should be in .gitignore

---

## Migration Steps

Follow this order to minimise disruption:

### Step 1: Create Backup Branch
```bash
git checkout -b cleanup/template-removal
```

### Step 2: Remove Test Infrastructure
```bash
# Remove test files
rm -rf tests/
rm playwright.config.ts
rm lib/ai/models.test.ts

# Remove Playwright dependency
pnpm remove @playwright/test
```

### Step 3: Update package.json
- Remove `"test"` script
- Change package name from `"ai-chatbot"` to `"cred-ai"`

### Step 4: Remove Template Files
```bash
rm vercel-template.json
rm LICENSE  # Or replace with appropriate license
rm public/images/demo-thumbnail.png
rm "public/images/mouth of the seine, monet.jpg"
```

### Step 5: Remove Unused Dependencies
```bash
pnpm remove @ai-sdk/xai redis
```

### Step 6: Update Branding
- Replace `/app/(chat)/opengraph-image.png` with Credentially branding
- Replace `/app/(chat)/twitter-image.png` with Credentially branding
- Update `/README.md` with accurate project description

### Step 7: Clean Up Documentation
- Move `/docs/completed/` to an archive or delete
- Update any outdated documentation

### Step 8: Verify and Test
```bash
pnpm install
pnpm build
pnpm dev
# Test core features manually
```

### Step 9: Commit and Merge
```bash
git add .
git commit -m "Remove Vercel template cruft and unused dependencies"
git checkout main
git merge cleanup/template-removal
```

---

## Impact Assessment

### Build Impact
- **Reduced build time** - Fewer dependencies to install
- **Smaller bundle** - Removing unused packages

### Development Impact
- **No testing framework** - Manual testing only until we set up our own test strategy
- **Clearer codebase** - Less confusion about what's template vs custom code

### Risk Assessment
- **Low risk** - All items identified are genuinely unused
- **Reversible** - Git history preserves everything

---

## Future Considerations

### Testing Strategy
After cleanup, consider implementing a minimal test strategy:
- Unit tests for critical business logic (Vitest)
- E2E tests for key user flows (Playwright, but our own tests)

### Dependency Audit
Periodically run `pnpm why <package>` to identify unused dependencies.

### Template Updates
The Vercel AI Chatbot template is actively maintained. Consider:
- Cherry-picking valuable updates (new AI SDK features)
- Ignoring template-specific updates (auth changes, UI redesigns)

---

## Checklist Summary

### Must Do
- [x] Remove `/tests/` directory
- [x] Remove `/playwright.config.ts`
- [x] Remove `/lib/ai/models.test.ts`
- [x] Remove `@playwright/test` dependency
- [x] Remove `"test"` script from package.json
- [x] Remove `/vercel-template.json`
- [x] Remove `@ai-sdk/xai` dependency
- [x] Remove `redis` dependency
- [x] Update package name in package.json

### Should Do
- [x] Remove template images from `/public/images/`
- [ ] Update OpenGraph/Twitter images with Credentially branding
- [ ] Update `/README.md`
- [x] Fix or remove `db:delete-guests` script

### Nice to Have
- [x] Archive or remove `/docs/completed/` (removed obsolete template docs, kept project docs)
- [ ] Review `/docs/existing-features/`
- [ ] Audit remaining dependencies

---

_This cleanup focuses on removing cruft while preserving the core chatbot functionality that will underpin the AI Compliance Companion demo._
