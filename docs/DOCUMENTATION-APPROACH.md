# Documentation Approach for Cred 2.0

Exploring how we document platform capabilities as they evolve from exploration to delivered product.

## The Problem

We're building Cred 2.0 through multiple channels:
- **Playground (cred-ai)** - Product exploration, proving concepts, selling the vision
- **cred-product** - Strategy, primitives, PRDs
- **Engineering** - Technical implementation, architecture decisions

Documentation created during exploration needs to eventually become the source of truth for delivered capabilities. But the journey from "we're experimenting with this" to "this is how it works" involves different audiences and different levels of detail.

## The Playground's Role

The playground serves multiple purposes beyond internal exploration:

- **Validate product approach** - Test data models, AI capabilities, user experiences
- **Sell the vision** - Show prospects and existing customers where we're heading (retention, not just acquisition)
- **Gather feedback** - Get real reactions to concepts before engineering investment
- **Show don't tell** - A working demo beats a slide deck

This means playground artifacts need to support external conversations, not just internal decision-making. The line between "exploration doc" and "sales enablement" blurs.

## Audiences

| Audience | What they need | Level of detail |
|----------|---------------|-----------------|
| **Engineering** | Technical specs, API contracts, data models | Deep - implementation detail |
| **Customer Success** | How features work, configuration options, troubleshooting | Operational - how to use/support |
| **Sales** | Capabilities, differentiators, customer outcomes | Benefits - what it enables |
| **Prospects & Customers** | Vision, roadmap, what's coming | Aspirational - where we're heading |
| **Customers (operational)** | How to use features, self-service guidance | User-facing - task-oriented |

## Current State

**cred-ai (Playground)**
- `DATA_MODEL.md` - Evolving data model with design decisions
- `ARCHITECTURE.md` - System patterns
- `PRD-PLAYGROUND.md` - Product requirements

**cred-product (Strategy)**
- `PRIMITIVES.md` - 22 building blocks
- `PLATFORM-OVERVIEW.md` - Vision and principles
- PRDs for specific features

## The Tension

### Product vs Engineering Ownership

Product explores and informs. Engineering decides and owns technical implementation.

The playground helps product:
- Validate data model approaches
- Test AI capabilities
- Prove out user experiences
- Inform what's possible and desirable

But product documentation shouldn't dictate:
- Technical architecture choices
- Implementation patterns
- Database schemas
- API designs

**The right level for product:** What the system does and why, not how it's built.

### Exploration vs Source of Truth

| Phase | Nature | Documentation style |
|-------|--------|---------------------|
| **Exploration** | Experimental, may change | Working notes, decision logs, "we're trying X" |
| **Validated** | Proven approach, ready for build | PRDs, requirements, "this is what we want" |
| **Delivered** | Shipped, in production | Source of truth, "this is how it works" |

Problem: How does a decision in `DATA_MODEL.md` become the canonical reference once built?

## Options to Consider

### 1. Handoff Model
Product creates requirements → Engineering creates technical docs → Product creates user-facing docs

**Pros:** Clear ownership, separation of concerns
**Cons:** Duplication, drift between docs, slow feedback loops

### 2. Living Document Model
Single source evolves through phases, ownership transfers at milestones

**Pros:** No duplication, clear lineage
**Cons:** Messy history, unclear what's current vs exploratory

### 3. Layered Documentation
Different docs for different audiences, linked/generated where possible

```
PRIMITIVES.md (What capabilities exist)
    ↓
PRD-*.md (What we're building, why)
    ↓
[Engineering owns technical implementation docs]
    ↓
FEATURES.md (What's delivered, how it works - user-facing)
```

**Pros:** Right level for each audience, clear ownership
**Cons:** Requires discipline to keep in sync

### 4. AI-Queryable Knowledge Base
All documentation feeds into a queryable system. Different views for different audiences generated/filtered on demand.

**Pros:** Single source, multiple views, always current
**Cons:** Requires tooling, may obscure structure

## Open Questions

1. **Where should engineering technical decisions live?** Separate repo? Wiki? Same structure?

2. **How do we mark exploration vs validated vs delivered?** Frontmatter? Separate folders? Status field?

3. **Who maintains customer-facing documentation?** Product? CS? Generated from source?

4. **What's the minimum viable approach?** Can we start simple and evolve?

## Principles to Guide Us

- **Product owns "what and why"** - Requirements, outcomes, user experience
- **Engineering owns "how"** - Architecture, implementation, technical trade-offs
- **Documentation follows the work** - Don't over-engineer docs ahead of capability
- **One source of truth per topic** - Avoid duplication that drifts
- **Audience-appropriate detail** - CS doesn't need database schemas, engineering doesn't need sales pitches

## Next Steps

- [ ] Discuss with engineering - where do they want technical docs?
- [ ] Define handoff point - when does product doc become engineering's input?
- [ ] Pilot approach with one capability end-to-end
- [ ] Decide on tooling - markdown in repos? Confluence? Something else?

---

*This document is exploratory. It captures thinking about the documentation problem, not a decision.*
