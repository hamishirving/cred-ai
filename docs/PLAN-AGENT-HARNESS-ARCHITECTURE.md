# Agent Harness Architecture Review & Plan

**Status:** Approved direction
**Created:** 2026-01-31
**Context:** Architectural review of the agent/skills framework for extensibility, assessed against future use cases and external frameworks (Mastra, Vercel AI SDK, LangGraph).

---

## Executive Summary

The current agent harness is well-structured for rapid skill authoring and has unique strengths (4-layer prompts, channel dispatch, compliance audit trail, voice integration). After reviewing the ecosystem, the decision is to **stay on AI SDK directly** without adopting Mastra or other frameworks. The architecture needs three incremental additions — agent memory, agent-to-skill composition, and lightweight human-in-the-loop — rather than a framework migration.

---

## Taxonomy: Workflows vs Agents vs Skills

### Skills

**A single, bounded, tool-equipped task with a clear input and output.**

- Defined `inputSchema`, produces a structured `SkillExecutionResult`
- Runs once to completion — stateless between invocations
- Composes a subset of tools from the tool registry
- Has constraints (`maxSteps`, `maxExecutionTime`)
- Has an oversight mode (`auto`, `review-before`, `notify-after`)
- Triggered manually, by schedule, or by event — each run is independent

**Litmus test:** "Given X input, do Y, return Z result."

**Current:** BLS certificate verification
**Planned:** Training portal verification, voice reference check, document classification

### Agents

**A persistent, context-aware entity that monitors state over time and produces insights or takes actions.**

- Has a defined purpose/persona and target audiences
- Runs repeatedly against evolving state (scheduled or event-triggered)
- Maintains awareness of previous actions via memory
- Produces **insights** categorised by priority and type
- Routes insights to audiences via channels (email, task, notification, SMS, voice)
- Can invoke skills as sub-steps to gather information or take action
- Makes judgment calls — decides *whether* to act, not just *how*

**Litmus test:** "Does this observe state over time, decide what matters, and communicate to people?"

**Current:** Compliance companion
**Planned:** Daily status checker, expiry monitor, recruiter assistant

### Workflows

**A multi-step, stateful process that orchestrates skills and agent actions across time.**

- Explicit state that persists across days/weeks
- Defines a sequence or graph of steps with transitions and conditions
- Can pause, wait for external events, resume
- Tracks what's been done, what's pending, what's blocked
- Handles escalation paths ("if no response after 3 days, do X")
- Has a lifecycle: started > in_progress > completed / failed / cancelled

**Litmus test:** "Does this span multiple steps over time with branching, waiting, and state transitions?"

**Planned (future):** Full candidate onboarding, reference verification pipeline, credential renewal

### Composition Model

```
Workflow (the plan)
  ├── Step 1: Agent decides what needs attention
  ├── Step 2: Skill verifies a document
  ├── Step 3: Wait for external event (candidate uploads new doc)
  ├── Step 4: Skill initiates voice call for reference
  ├── Step 5: Agent evaluates results, decides next action
  └── Step 6: Agent sends summary via email channel

Skills = the hands (do specific work)
Agents = the brain (observe, decide, communicate)
Workflows = the plan (sequence, state, time)
```

---

## Current Architecture Assessment

### What Works Well

| Strength | Detail |
|----------|--------|
| **Skill definition is lightweight** | Single `SkillDefinition` object — prompt, tool list, Zod schema, constraints. No subclassing. Registry is just an import. |
| **4-layer prompt architecture** | System base > org voice > skill instructions > dynamic context. No framework does this. Core differentiator for multi-tenant AI. |
| **Tool reuse** | Tool registry + resolver pattern decouples tools from skills. `browseAndVerify` is reusable across verification skills. |
| **Streaming + audit infrastructure** | SSE streaming, step capture, DB persistence, token tracking — wired end-to-end from runner > API > hook > UI. |
| **Multi-tenancy** | Org context, org-specific prompts, org-scoped queries threaded through every layer. |
| **Voice integration** | Fully built: Vapi SDK wrapper, template system with schema-driven context/capture, call lifecycle, polling, transcript extraction, structured output capture, comparison UI, database layer. |
| **Channel/audience dispatch** | Insight > audience > channel model. Domain-specific, no framework provides this. |
| **Compliance audit trail** | Full step-by-step persistence with token tracking, duration, input/output. Purpose-built for regulated industries. |

### What's Missing

| Gap | Impact | Effort |
|-----|--------|--------|
| **Agent memory** | Agents can't remember what they did last run. Daily check agent would repeat itself. | Small — JSON scratchpad table |
| **Agent > skill composition** | Agents can't invoke skills as sub-steps. Must be separate manual triggers. | Small — `runSkill` tool in registry |
| **Human-in-the-loop execution** | `oversight.mode` is declared but not implemented. No pause/approve/reject flow. | Medium — two-phase execution pattern |
| **Scheduling** | Triggers declared (cron, event) but no scheduler exists. | Small — external cron (Vercel Cron) |
| **Email channel** | Stub only. Agent generates email content but can't send. | Small — Resend/SendGrid integration |
| **Workflow engine** | No multi-day stateful processes. | Large — deferred until needed |

---

## Framework Comparison

### Decision: Stay on AI SDK, Don't Adopt Mastra

| Factor | Assessment |
|--------|------------|
| **AI SDK** | Already using it (`streamText`, `tool()`, Zod schemas, `stopWhen`/`maxSteps`, Anthropic provider). This is the foundation — no change needed. |
| **Mastra** | Built on AI SDK. Strong workflow engine (durable suspend/resume), three-layer memory, PostHog integration, OpenTelemetry. But: v1.0 from small team, agent networks are experimental, would require migrating skill runner and registry patterns. |
| **LangGraph.js** | Best-in-class persistence/checkpointing. But: heavy dependency, different mental model (graphs), Python-first ecosystem. |

### Why Not Mastra Now

1. **Demo playground context** — durable workflows surviving deployments isn't needed. Demo resets are fine.
2. **Migration cost** — skill runner, 4-layer prompts, tool resolver, audit trail would all need refactoring to fit Mastra's abstractions.
3. **Framework risk** — v1.0, small team. If they pivot or stall, we own the maintenance.
4. **Our custom layers are the value** — 4-layer prompts, channel dispatch, compliance audit, voice integration. Mastra doesn't help with any of these.

### What Mastra Offers for Later

Keep on radar for production graduation:
- **Workflow engine** with durable suspend/resume across deployments
- **Semantic memory** with vector search for cross-candidate pattern matching
- **`@mastra/posthog`** for deeper automatic instrumentation (per-tool-call granularity, token costs per step)
- **Agent networks** if LLM-routed multi-agent becomes needed (currently experimental)

---

## Planned Changes

### 1. Agent Memory — Simple Scratchpad

**Purpose:** Let agents remember what they've done across runs so they don't repeat themselves and can track trends.

**Approach:**
- New `agent_memory` table keyed on `(agentId, subjectId, orgId)`
- JSON scratchpad column — agent reads at start of run, writes at end
- Content is agent-defined (last contact date, pending items, tone of last interaction, escalation count)
- No vector search, no semantic recall — just structured JSON persistence

**Schema:**
```
agent_memory
  id: UUID
  agentId: text              -- "compliance-companion"
  subjectId: UUID            -- candidate profile ID
  orgId: UUID
  memory: JSONB              -- agent-defined scratchpad
  lastRunAt: timestamp
  runCount: integer
  createdAt: timestamp
  updatedAt: timestamp
```

**Integration:** Agent context (`AgentContext`) gains a `memory` field populated from this table before each run. Agent returns updated memory in its result.

### 2. Agent-to-Skill Composition — `runSkill` Tool

**Purpose:** Let agents invoke skills as sub-steps during their execution (e.g., compliance companion triggers a BLS verification or a voice reference check).

**Approach:**
- New `runSkill` tool in the tool registry
- Takes `skillId` and `input` as parameters
- Calls `executeSkill()` from the skill runner (non-streaming, returns result)
- Agent receives the `SkillExecutionResult` and incorporates it into its reasoning

**Constraints:**
- Skills invoked by agents run with `oversight.mode: 'auto'` (no human pause mid-agent-run)
- Execution is logged as a child of the agent's run for audit trail linkage
- Agent context provides `orgId` and `userId` passthrough

### 3. Human-in-the-Loop — Two-Phase Execution

**Purpose:** Implement the `review-before` oversight mode so skills can propose actions and wait for human approval.

**Approach:**
- Phase 1: Skill runs all analysis/verification steps, produces proposed actions (e.g., "set status to verified", "create follow-up task"), stores them with status `pending_approval`
- Phase 2: UI shows proposed actions with approve/reject controls. On approval, final actions execute.

**Schema:**
```
pending_actions
  id: UUID
  skillExecutionId: UUID     -- links to skill_executions
  actionType: text           -- "update_status", "create_task", "send_email"
  actionPayload: JSONB       -- tool name + input that would be executed
  status: enum               -- "pending" | "approved" | "rejected"
  reviewedBy: UUID
  reviewedAt: timestamp
  createdAt: timestamp
```

**No durable workflow engine needed.** The skill runner checks `oversight.mode` before executing action tools. If `review-before`, it captures the tool calls without executing them and writes to `pending_actions`. A separate API route handles approval and executes the stored actions.

### 4. Voice as a Skill Tool

**Purpose:** Make the existing Vapi voice integration callable from within skills and agents.

**Approach:**
- New `initiateVoiceCall` tool wrapping the existing `vapi-client.ts`
- Input: `templateSlug`, `phoneNumber`, `recipientName`, `context` (matching template's `contextSchema`)
- Output: `callId`, `status`, and — after polling — `outcome`, `capturedData`, `transcript`
- Tool handles the polling loop internally (with timeout) so the skill runner gets a complete result

**Existing infrastructure used directly:**
- `lib/voice/vapi-client.ts` — `initiateCall()`, `getCallStatus()`
- `lib/voice/templates.ts` — template registry, context validation
- `lib/db/queries.ts` — `createVoiceCall()`, `updateVoiceCall()`

### 5. Browser Automation Strategy

**Approach:** Dual-mode based on execution context.

| Context | Tool | Rationale |
|---------|------|-----------|
| **Foreground / known provider** | Playwright + XPaths (`browseAndVerify`) | Fast, deterministic, reliable. Current BLS verification approach. |
| **Background / unknown provider** | Stagehand (already in `package.json`) | AI-driven navigation for portals where we don't have XPaths. Slower but adaptable. |

**New skills for known providers** (e.g., training portal verification) follow the XPath pattern — create provider-specific verification logic within the tool, selected by a `provider` parameter.

**Unknown provider fallback:** A generic `browseAndVerifyGeneric` tool using Stagehand that takes a URL and natural language instructions ("navigate to the verification page, enter this code, extract the result").

### 6. Email Channel Implementation

**Purpose:** Complete the email channel stub so agents can actually send authored emails.

**Approach:**
- Integrate Resend or SendGrid (single provider, simple wrapper)
- Email channel's `deliver()` method calls the provider API
- Agent-authored content (already generated by compliance companion) passed through
- Track delivery status in a lightweight `email_sends` table for demo visibility

### 7. Scheduling

**Purpose:** Enable scheduled agent runs (e.g., daily candidate status check at 9am).

**Approach:**
- Vercel Cron or equivalent external trigger
- Cron endpoint calls agent orchestrator with `trigger: 'schedule'`
- Agent iterates over active candidates in the org, runs with memory context
- No internal scheduler — keep it external and simple

---

## Use Case Readiness After Changes

| Use Case | Required Changes | Readiness |
|----------|-----------------|-----------|
| **Daily candidate status + email** | Agent memory (#1) + email channel (#6) + scheduling (#7) | Ready after changes |
| **Voice call for reference check** | Voice as skill tool (#4) | Ready after changes |
| **Training portal verification** | New skill definition + browser strategy (#5) | Ready after changes — follows existing BLS pattern |
| **Multi-day onboarding workflow** | Full workflow engine | Deferred — not needed for demo |

---

## Sequencing

| Priority | Change | Dependencies |
|----------|--------|-------------|
| 1 | Agent memory (scratchpad table + context integration) | None |
| 2 | Agent > skill composition (`runSkill` tool) | None |
| 3 | Voice as skill tool (`initiateVoiceCall`) | None |
| 4 | Human-in-the-loop (two-phase execution) | None |
| 5 | Email channel implementation | None |
| 6 | Scheduling (external cron) | Agent memory (#1) |
| 7 | Browser automation dual-mode (Stagehand generic tool) | None |

Items 1-3 are independent and can be built in parallel. Items 4-7 are independent of each other but benefit from 1-3 being in place.

---

## Future Considerations (Post-Demo)

- **Mastra adoption** for production workflows if multi-day stateful processes are needed
- **Semantic memory** (pgvector or Mastra memory module) for cross-candidate pattern matching
- **Deeper PostHog instrumentation** — per-tool-call events, token cost tracking per skill step
- **Agent networks** if use cases emerge that need LLM-routed delegation between agents
- **Webhook-based voice status** instead of polling for production scale
