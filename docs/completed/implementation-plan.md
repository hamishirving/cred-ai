# Implementation Plan

## Phase 1: Foundation (Day 1)

### 1.1 API Client Setup

Create a reusable API client for the backend:

```typescript
// lib/api/client.ts
const API_BASE = process.env.BACKEND_API_URL!;
const API_KEY = process.env.BACKEND_API_KEY;

export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY && { Authorization: `Bearer ${API_KEY}` }),
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  
  return res.json();
}
```

### 1.2 First Tool Implementation

Pick the simplest endpoint and wire it up end-to-end as a proof point.

---

## Phase 2: Core Tools (Day 2-3)

For each backend endpoint, create:

| Tool Name | Backend Endpoint | UI Component |
|-----------|------------------|--------------|
| `getCustomer` | `/customers/:id` | `<CustomerCard />` |
| `getTransactions` | `/transactions?account=X` | `<TransactionTable />` |
| `getAccountBalance` | `/accounts/:id/balance` | `<BalanceCard />` |
| `searchEntities` | `/search?q=X` | `<SearchResults />` |

---

## Phase 3: Polish (Day 4)

- Loading states in tool components
- Error handling UI
- Mobile responsiveness
- Demo script rehearsal

---

## Key Files to Modify

### Must Touch
- `lib/ai/tools/` - New tool files
- `app/(chat)/api/chat/route.ts` - Register tools
- `components/message.tsx` - Wire up tool → component mapping

### Probably Touch  
- `lib/ai/prompts.ts` - Tune system prompt for your domain
- `components/` - New UI components for data types

### Don't Touch (Template handles it)
- Auth flow
- Message streaming
- Chat persistence
- Session management

---

## Checklist Per Tool

- [ ] Define Zod input schema
- [ ] Write `execute` function that calls API
- [ ] Register in `route.ts` tools object
- [ ] Add to `experimental_activeTools` array
- [ ] Create display component
- [ ] Add case in `message.tsx` for `tool-{name}`
- [ ] Test with natural language query

---

## Questions for Backend Developer

1. **Base URL**: What's the API base URL for dev/staging?
2. **Auth**: API key? OAuth? How do we authenticate?
3. **Endpoints**: Can you share the OpenAPI spec or endpoint list?
4. **Response format**: Are responses wrapped? (`{ data: T }` vs raw `T`)
5. **Error format**: How are errors returned?
6. **Rate limits**: Any throttling we should know about?

---

## Potential Enhancements (Post-POC)

1. **Streaming tool results** - Show data as it comes in
2. **Multi-tool chains** - AI calls multiple tools to answer complex questions
3. **Caching** - Cache repeated queries
4. **Context preservation** - Remember customer context across messages
5. **Export** - Let users export results to CSV/PDF
