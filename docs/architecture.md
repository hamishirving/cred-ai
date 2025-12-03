# Architecture Overview

## Why This Approach is Fast

The Vercel AI SDK template already has the hard parts solved:
- Streaming responses
- Tool calling (function calling)
- Message persistence
- Auth + sessions

**We just need to:**
1. Create tools that wrap your backend API endpoints
2. Create UI components for each data type
3. Let the AI route user questions to the right tool

---

## The Flow

```
User Question
     │
     ▼
┌─────────────────────────────────────┐
│           AI (LLM)                  │
│  "What tool should I call?"         │
│                                     │
│  Tools available:                   │
│  - getCustomerInfo                  │
│  - getAccountBalance                │
│  - getTransactions                  │
│  - searchProducts                   │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│         Tool Execution              │
│  (calls your backend API)           │
│                                     │
│  fetch(`${API_BASE}/customers/123`) │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│         Typed Response              │
│  { type: "customer", data: {...} }  │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│      UI Component Selection         │
│                                     │
│  tool-getCustomerInfo → <Customer/> │
│  tool-getTransactions → <TxTable/>  │
└─────────────────────────────────────┘
```

---

## File Structure for New Tools

```
lib/ai/tools/
├── get-customer.ts      # Tool definition + API call
├── get-transactions.ts
└── search-products.ts

components/
├── customer-card.tsx    # UI for customer data
├── transaction-table.tsx
└── product-grid.tsx
```

---

## Adding a New Tool (5 min each)

### 1. Create the Tool (`lib/ai/tools/get-customer.ts`)

```typescript
import { tool } from "ai";
import { z } from "zod";

const API_BASE = process.env.BACKEND_API_URL;

export const getCustomer = tool({
  description: "Get customer information by ID or search by name/email",
  inputSchema: z.object({
    customerId: z.string().optional(),
    searchTerm: z.string().optional(),
  }),
  execute: async ({ customerId, searchTerm }) => {
    const endpoint = customerId 
      ? `${API_BASE}/customers/${customerId}`
      : `${API_BASE}/customers/search?q=${searchTerm}`;
    
    const res = await fetch(endpoint);
    return res.json();
  },
});
```

### 2. Register the Tool (`app/(chat)/api/chat/route.ts`)

```typescript
import { getCustomer } from "@/lib/ai/tools/get-customer";

// In streamText config:
tools: {
  getWeather,
  getCustomer,  // Add here
  // ...
},
experimental_activeTools: [
  "getWeather",
  "getCustomer",  // And here
],
```

### 3. Create UI Component (`components/customer-card.tsx`)

```tsx
export function CustomerCard({ customer }: { customer: CustomerData }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">{customer.name}</h3>
      <p className="text-muted-foreground">{customer.email}</p>
      {/* etc */}
    </div>
  );
}
```

### 4. Wire Up in Message Component (`components/message.tsx`)

```tsx
if (type === "tool-getCustomer") {
  const { toolCallId, state } = part;
  return (
    <Tool key={toolCallId}>
      <ToolHeader state={state} type="tool-getCustomer" />
      <ToolContent>
        {state === "output-available" && (
          <CustomerCard customer={part.output} />
        )}
      </ToolContent>
    </Tool>
  );
}
```

---

## Why NOT Server Components / Direct API Calls

| Approach | Pros | Cons |
|----------|------|------|
| **AI Tools (recommended)** | AI routes questions automatically, natural UX, structured output | Need to define tool schemas |
| Server Components | Next.js native, good for static pages | Not suitable for chat UX, manual routing |
| Direct frontend fetch | Simple | User must manually pick what to query, no AI assistance |

**For a chat-based POC, tools are the clear winner.**

---

## Backend API Contract

What we need from your backend developer:

```typescript
// Each endpoint should return typed JSON
interface Endpoint {
  method: "GET" | "POST";
  path: string;
  params: Record<string, string>;
  response: {
    type: string;  // We use this to pick the UI component
    data: unknown;
  };
}

// Example endpoints:
// GET  /api/customers/:id        → { type: "customer", data: Customer }
// GET  /api/transactions?acct=X  → { type: "transactions", data: Transaction[] }
// POST /api/search               → { type: "search_results", data: SearchResult[] }
```

---

## Environment Setup

```env
# .env.local
BACKEND_API_URL=http://localhost:8000/api
BACKEND_API_KEY=your-key-here
```

---

## Demo Script

1. "Show me customer John Smith's details" 
   → AI calls `getCustomer` → CustomerCard renders

2. "What transactions did he have last month?"
   → AI calls `getTransactions` (uses context from prev answer) → TransactionTable

3. "Are there any alerts on his account?"
   → AI calls `getAlerts` → AlertList component

**The AI handles routing and context. We just build the tools and components.**
