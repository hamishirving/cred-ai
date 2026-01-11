# Plan: Ragie RAG Tool for Chat

## Overview

Add a knowledge retrieval tool to the chat interface using [Ragie AI](https://ragie.ai) as the RAG provider. This enables the AI to search through uploaded documents (policies, procedures, compliance guides) and ground its responses in organisational knowledge.

## Use Case

When users ask questions about:
- Compliance policies and procedures
- Organisational guidelines
- Reference documentation
- "What does our policy say about X?"

The AI will retrieve relevant document chunks from Ragie and use them to provide accurate, grounded answers.

## Ragie API

**Endpoint:** `POST https://api.ragie.ai/retrievals`

**Authentication:** Bearer token (`RAGIE_API_KEY`)

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Search query |
| `top_k` | integer | 8 | Max chunks to return |
| `rerank` | boolean | false | Filter for semantic relevance (slower, more accurate) |
| `filter` | object | - | Metadata filter on documents |
| `max_chunks_per_document` | integer | - | Limit chunks per source document |
| `partition` | string | - | Scope to a partition |
| `recency_bias` | boolean | false | Favour recent documents |

**Response:**
```typescript
{
  scored_chunks: Array<{
    text: string;           // The chunk content
    score: number;          // Relevance score
    id: string;             // Chunk ID
    index: number;          // Position in document
    document_id: string;    // Parent document ID
    document_name: string;  // Source document name
    document_metadata: {    // Document-level metadata (custom + default)
      source_url?: string;  // Original URL if stored during upload
      document_type: string;
      document_source: string;
      // ...other custom metadata
    };
    metadata: {};           // Chunk-level metadata (timestamps for audio, page numbers for PDFs)
    links: {                // Ragie API links (not original source URLs)
      self: { href: string; type: string };
      document: { href: string; type: string };
      document_text: { href: string; type: string };
      // ...
    };
  }>
}
```

**Note on Source Links:** The `links` object contains Ragie API endpoints, not original source URLs. To show source links to users, store `source_url` in document metadata when uploading documents to Ragie. This will be returned in `document_metadata.source_url` during retrieval.

## Implementation

### 1. Create Ragie Client

**File:** `lib/ragie/client.ts`

```typescript
const RAGIE_API_URL = "https://api.ragie.ai";

export interface RetrieveParams {
  query: string;
  top_k?: number;
  rerank?: boolean;
  filter?: Record<string, unknown>;
  max_chunks_per_document?: number;
}

export interface DocumentMetadata {
  source_url?: string;        // Original URL (if stored during upload)
  document_type?: string;     // pdf, doc, docx, etc.
  document_source?: string;   // api, google_drive, etc.
  [key: string]: unknown;     // Other custom metadata
}

export interface ScoredChunk {
  text: string;
  score: number;
  id: string;
  index: number;
  document_id: string;
  document_name: string;
  document_metadata: DocumentMetadata;
  metadata: Record<string, unknown>;
  links: Record<string, { href: string; type: string }>;
}

export interface RetrievalResponse {
  scored_chunks: ScoredChunk[];
}

export async function retrieve(params: RetrieveParams): Promise<RetrievalResponse> {
  const response = await fetch(`${RAGIE_API_URL}/retrievals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.RAGIE_API_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Ragie API error: ${response.status}`);
  }

  return response.json();
}
```

### 2. Create Tool Definition

**File:** `lib/ai/tools/search-knowledge.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";
import { retrieve } from "@/lib/ragie/client";

export const searchKnowledge = tool({
  description: `Search the organisation's knowledge base for relevant information.
Use this tool when the user asks about:
- Compliance policies, procedures, or guidelines
- Organisational documentation
- "What does our policy say about..."
- Reference material or standards
- Training requirements or processes

The tool searches uploaded documents and returns relevant excerpts with source links.`,

  inputSchema: z.object({
    query: z.string().describe("The search query - be specific and detailed"),
    top_k: z.number().optional().default(5).describe("Number of results (default 5)"),
    rerank: z.boolean().optional().default(true).describe("Use reranking for better accuracy"),
  }),

  execute: async ({ query, top_k, rerank }) => {
    console.log("[searchKnowledge] Query:", query);

    try {
      const result = await retrieve({
        query,
        top_k: top_k ?? 5,
        rerank: rerank ?? true,
      });

      if (!result.scored_chunks.length) {
        return {
          data: null,
          message: "No relevant documents found for this query."
        };
      }

      // Format chunks for the AI, including source URL if available
      const chunks = result.scored_chunks.map(chunk => ({
        text: chunk.text,
        source: chunk.document_name,
        sourceUrl: chunk.document_metadata.source_url || null,
        documentType: chunk.document_metadata.document_type || null,
        score: chunk.score,
      }));

      return {
        data: chunks,
        message: `Found ${chunks.length} relevant excerpts.`
      };
    } catch (error) {
      console.error("[searchKnowledge] Error:", error);
      return { error: "Failed to search knowledge base" };
    }
  },
});
```

### 3. Register Tool

**File:** `app/(chat)/api/chat/route.ts`

Add import and register in tools object:

```typescript
import { searchKnowledge } from "@/lib/ai/tools/search-knowledge";

// In tools object:
tools: {
  searchKnowledge,
  // ...existing tools
},

// In experimental_activeTools:
experimental_activeTools: [
  "searchKnowledge",
  // ...existing tools
],
```

### 4. Create Tool Handler

**File:** `components/tool-handlers/handlers/knowledge-tool.tsx`

```tsx
import { ToolLoading } from "../tool-renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ExternalLink } from "lucide-react";
import type { ToolHandlerProps } from "../types";

interface KnowledgeChunk {
  text: string;
  source: string;
  sourceUrl: string | null;
  documentType: string | null;
  score: number;
}

interface KnowledgeOutput {
  data?: KnowledgeChunk[] | null;
  message?: string;
  error?: string;
}

export function KnowledgeTool({
  toolCallId,
  state,
  input,
  output,
}: ToolHandlerProps<{ query: string }, KnowledgeOutput>) {
  if (!output) {
    return (
      <ToolLoading
        toolCallId={toolCallId}
        toolName="Search Knowledge"
        state={state}
        input={input}
      />
    );
  }

  if (output.error) {
    return <div className="text-destructive text-sm">{output.error}</div>;
  }

  if (!output.data || output.data.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        No relevant documents found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{output.message}</p>
      {output.data.map((chunk, i) => (
        <Card key={i} className="bg-muted/50">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-3 w-3" />
              {chunk.sourceUrl ? (
                <a
                  href={chunk.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-1"
                >
                  {chunk.source}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : (
                chunk.source
              )}
              {chunk.documentType && (
                <span className="text-[10px] uppercase opacity-60">
                  {chunk.documentType}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <p className="text-sm whitespace-pre-wrap">{chunk.text}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 5. Register Handler

**File:** `components/tool-handlers/index.tsx`

```typescript
import { KnowledgeTool } from "./handlers/knowledge-tool";

const toolRegistry: Record<string, ToolHandler> = {
  "tool-searchKnowledge": KnowledgeTool as ToolHandler,
  // ...existing handlers
};
```

### 6. Update System Prompt (Optional)

If needed, update `lib/ai/prompts.ts` to guide when to use the knowledge search tool.

## Files to Create/Modify

| File | Action |
|------|--------|
| `lib/ragie/client.ts` | Create |
| `lib/ai/tools/search-knowledge.ts` | Create |
| `app/(chat)/api/chat/route.ts` | Modify |
| `components/tool-handlers/handlers/knowledge-tool.tsx` | Create |
| `components/tool-handlers/index.tsx` | Modify |

## Testing

1. Ensure `RAGIE_API_KEY` is set in `.env.local`
2. Upload test documents to Ragie with `source_url` in metadata:
   ```bash
   curl -X POST https://api.ragie.ai/documents \
     -H "Authorization: Bearer $RAGIE_API_KEY" \
     -F "file=@policy.pdf" \
     -F 'metadata={"source_url": "https://example.com/policy.pdf"}'
   ```
3. Ask the chat: "What does our policy say about [topic]?"
4. Verify chunks are retrieved and displayed with clickable source links
5. Verify AI uses the context in its response

## Future Enhancements

- Add metadata filtering (by document type, date, etc.)
- Add partition support for multi-tenant scenarios
- Caching for repeated queries
- Chunk expansion (fetch adjacent chunks for more context)
- Page number display for PDF documents
