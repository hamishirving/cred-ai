# Tests

## Structure

```
tests/
├── e2e/        # Playwright end-to-end tests
├── routes/     # API route unit tests
├── pages/      # Page object models for e2e
├── prompts/    # AI prompt testing
├── fixtures.ts # Shared test data
└── helpers.ts  # Test utilities
```

## Running Tests

```bash
pnpm test           # Run all tests
pnpm test:e2e       # E2E tests only
pnpm test:unit      # Unit tests only
```

## E2E Test Pattern

```ts
import { test, expect } from '@playwright/test';

test('user can send message', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="chat-input"]', 'Hello');
  await page.click('[data-testid="send-button"]');
  await expect(page.locator('[data-testid="message"]')).toBeVisible();
});
```

## API Route Test Pattern

```ts
import { POST } from '@/app/(chat)/api/chat/route';

describe('Chat API', () => {
  it('returns 401 for unauthenticated', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

## Fixtures

Use `fixtures.ts` for shared test data. Import helpers from `helpers.ts`.
