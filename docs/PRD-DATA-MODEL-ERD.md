# PRD: Data Model ERD Visualisation

**Status:** Draft
**Created:** 2025-12-28
**Priority:** Medium

---

## Overview

Create an interactive ERD (Entity Relationship Diagram) page to visualise the Credentially 2.0 data model. This helps socialise the data model design with stakeholders and serves as living documentation.

---

## Goals

1. **Visualise** the data model from DATA_MODEL.md as an interactive diagram
2. **Group** entities by domain using visual outlines
3. **Show relationships** between entities via connecting edges
4. **Create** actual database tables via Drizzle ORM (playground can iterate freely)

---

## Scope

### In Scope (V1)
- Static ERD visualisation using React Flow
- Entity nodes showing table name and columns
- Relationship edges from foreign key references
- Domain grouping via React Flow group nodes
- Matches cred-ai theme (light/dark mode support)
- Pan and zoom navigation
- Hover tooltips with entity/relationship descriptions

### Out of Scope (V1)
- Editing/drag-to-rearrange nodes
- Filter by domain
- Export to image/PDF
- Auto-layout algorithm

---

## Technical Approach

### 1. Drizzle Schema as Source of Truth

Create actual database tables using Drizzle ORM in `lib/db/schema/`. This provides:
- **Single source of truth** - tables ARE the model
- **Automatic TypeScript types** - Drizzle infers select/insert types
- **Real foreign keys** - relationships are explicit, not inferred
- **Database-ready** - can seed demo data immediately
- **Iteration-friendly** - playground can reset DB freely

```typescript
// lib/db/schema/work-nodes.ts
import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { organisations } from './organisations';
import { workNodeTypes } from './work-node-types';

export const workNodes = pgTable('work_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull().references(() => organisations.id),
  typeId: uuid('type_id').notNull().references(() => workNodeTypes.id),
  name: text('name').notNull(),
  parentId: uuid('parent_id').references(() => workNodes.id),
  jurisdiction: text('jurisdiction'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Types are inferred automatically
export type WorkNode = typeof workNodes.$inferSelect;
export type NewWorkNode = typeof workNodes.$inferInsert;
```

### 2. ERD Reads from Drizzle Schema

The ERD introspects the Drizzle schema directly:
- **Tables** → nodes
- **Columns** → fields with types
- **Foreign keys** → edges with cardinality
- **References** → relationship targets

No separate config needed for relationships - they're defined in the schema via `.references()`.

### 3. Documentation Strategy

**Three layers of documentation:**

| Layer | Location | Purpose |
|-------|----------|---------|
| **Authoritative** | DATA_MODEL.md | Full context, design decisions, examples |
| **Code-level** | JSDoc in schema files | IDE intellisense, developer context |
| **Visualisation** | erd-metadata.ts | ERD tooltips, stakeholder presentations |

**JSDoc in Schema:**
```typescript
/**
 * Where work happens. Unified entity replacing Client/Facility/OrgUnit.
 *
 * @purpose Flexible org hierarchies - different customers have different
 * structures (Trust → Hospital → Ward vs State → Health System → Unit).
 * @see DATA_MODEL.md#worknode
 */
export const workNodes = pgTable('work_nodes', {
  // ...
});
```

**ERD Metadata:**
```typescript
// components/erd/erd-metadata.ts
export const entityMetadata: Record<string, EntityMeta> = {
  work_nodes: {
    displayName: "WorkNode",
    description: "Where work happens - the unified location entity",
    purpose: "Replaces separate Client/Facility/OrgUnit with flexible hierarchy",
    enables: [
      "Customer-defined hierarchy levels",
      "Jurisdiction-based compliance",
      "Multi-org visibility for MSPs"
    ]
  }
};
```

### 4. ERD Interactions

| Interaction | Shows |
|-------------|-------|
| Hover node header | Entity description + purpose |
| Hover column | Column description (from metadata) |
| Hover edge | Relationship description + purpose |
| Click node | Side panel with full details + "enables" list |

### 5. React Flow Implementation

Use React Flow to render:
- **Table nodes**: Custom node component showing columns
- **Group nodes**: Domain containers with coloured borders
- **Edges**: Foreign key relationships with cardinality markers

---

## Data Model Domains

| Domain | Colour | Tables |
|--------|--------|--------|
| **Tenant & Structure** | Blue | organisations, work_node_types, work_nodes, roles |
| **Compliance** | Green | compliance_elements, compliance_packages, package_elements, assignment_rules |
| **Skills** | Purple | skill_frameworks, skill_categories, skills, candidate_skills, candidate_experiences, skill_requirements |
| **People** | Cyan | profiles |
| **Work** | Orange | jobs, applications, placements |
| **Evidence** | Yellow | evidence, compliance_gaps |
| **Journey** | Pink | pipelines, pipeline_stages, entity_stage_positions, stage_transitions |
| **Operations** | Red | activities, escalations, escalation_options |

---

## Entity Node Design

Each entity node displays:

```
┌─────────────────────────────────┐
│ 🗃️  work_nodes                  │  ← Header with table name
├─────────────────────────────────┤
│ id                    uuid [PK] │  ← Primary key (highlighted)
│ organisation_id       uuid [FK] │  ← Foreign key (with link icon)
│ type_id               uuid [FK] │
│ name                  text      │
│ parent_id             uuid [FK] │  ← Self-reference
│ jurisdiction          text?     │  ← Nullable fields show ?
│ is_active             boolean   │
│ created_at            timestamp │
└─────────────────────────────────┘
```

**Styling (matching cred-ai theme):**
- Card background: `var(--card)` / dark: `#22242c`
- Border: `var(--border)` / dark: `#3a3d4a`
- Header background: Domain colour (muted)
- Primary key: Bold, key icon
- Foreign keys: Link icon, clickable to navigate
- Nullable fields: Show `?` suffix

---

## Relationship Edges

Relationships are read directly from Drizzle `.references()`:

```typescript
organisationId: uuid('organisation_id').references(() => organisations.id)
```

**Edge styling:**
- Stroke: `var(--border)` or domain colour
- Markers: Show cardinality (1, N) at endpoints
- Type: Smoothstep curves
- Hover: Highlight edge and show tooltip

**Cardinality:**
- Foreign key column → "many" side (N)
- Referenced table → "one" side (1)

---

## File Structure

```
lib/
├── db/
│   ├── index.ts                    # Drizzle client
│   ├── schema/
│   │   ├── index.ts                # Re-exports all tables
│   │   ├── organisations.ts        # Tenant & Structure
│   │   ├── work-node-types.ts
│   │   ├── work-nodes.ts
│   │   ├── roles.ts
│   │   ├── compliance-elements.ts  # Compliance
│   │   ├── compliance-packages.ts
│   │   ├── package-elements.ts
│   │   ├── assignment-rules.ts
│   │   ├── skill-frameworks.ts     # Skills
│   │   ├── skill-categories.ts
│   │   ├── skills.ts
│   │   ├── candidate-skills.ts
│   │   ├── candidate-experiences.ts
│   │   ├── skill-requirements.ts
│   │   ├── profiles.ts             # People
│   │   ├── jobs.ts                 # Work
│   │   ├── applications.ts
│   │   ├── placements.ts
│   │   ├── evidence.ts             # Evidence
│   │   ├── compliance-gaps.ts
│   │   ├── pipelines.ts            # Journey
│   │   ├── pipeline-stages.ts
│   │   ├── entity-stage-positions.ts
│   │   ├── stage-transitions.ts
│   │   ├── activities.ts           # Operations
│   │   ├── escalations.ts
│   │   └── escalation-options.ts
│   └── seed/
│       └── index.ts                # Demo data seeding
│
app/
├── data-model/
│   └── page.tsx                    # ERD page route
│
components/
├── erd/
│   ├── erd-canvas.tsx              # Main React Flow canvas
│   ├── table-node.tsx              # Custom node for tables
│   ├── domain-group.tsx            # Custom node for domain grouping
│   ├── entity-tooltip.tsx          # Tooltip for entity hover
│   ├── relationship-tooltip.tsx    # Tooltip for edge hover
│   ├── entity-detail-panel.tsx     # Side panel for full details
│   ├── erd-config.ts               # Node positions and domain mapping
│   ├── erd-metadata.ts             # Entity and relationship descriptions
│   └── use-schema-to-erd.ts        # Hook to transform Drizzle schema to nodes/edges
```

---

## Schema Files to Create

### Tenant & Structure
- `organisations.ts` - Multi-tenant with hierarchy
- `work-node-types.ts` - User-defined hierarchy levels
- `work-nodes.ts` - Where work happens
- `roles.ts` - Job roles

### Compliance
- `compliance-elements.ts` - Requirement definitions
- `compliance-packages.ts` - Bundled requirements
- `package-elements.ts` - Package composition
- `assignment-rules.ts` - When packages apply

### Skills
- `skill-frameworks.ts` - Taxonomy templates
- `skill-categories.ts` - Hierarchical groupings
- `skills.ts` - Individual skills
- `candidate-skills.ts` - Candidate attributions
- `candidate-experiences.ts` - Environment experience
- `skill-requirements.ts` - Job/shift requirements

### People
- `profiles.ts` - Candidates/workers

### Work
- `jobs.ts` - Positions/openings
- `applications.ts` - Job applications
- `placements.ts` - Active assignments

### Evidence
- `evidence.ts` - Proof of compliance
- `compliance-gaps.ts` - Missing requirements (may be computed view)

### Journey
- `pipelines.ts` - Configurable journeys
- `pipeline-stages.ts` - Journey steps
- `entity-stage-positions.ts` - Current positions
- `stage-transitions.ts` - Transition history

### Operations
- `activities.ts` - Action log
- `escalations.ts` - Human decisions needed
- `escalation-options.ts` - Available actions

---

## Implementation Steps

### Phase 1: Database Schema
1. [x] Add entity descriptions section to DATA_MODEL.md
2. [x] Add relationship descriptions section to DATA_MODEL.md
3. [ ] Create Drizzle schema files for all domains
4. [ ] Run migrations to create tables
5. [ ] Verify schema with `pnpm db:studio`

### Phase 2: Basic ERD
6. [ ] Install React Flow: `pnpm add @xyflow/react`
7. [ ] Create `use-schema-to-erd.ts` hook to introspect Drizzle schema
8. [ ] Create basic ERD page at `/data-model`
9. [ ] Create table node component
10. [ ] Create ERD config with node positions
11. [ ] Render nodes without edges

### Phase 3: Relationships & Groups
12. [ ] Add edge generation from foreign key references
13. [ ] Create domain group nodes
14. [ ] Position groups around table nodes
15. [ ] Style edges with cardinality markers

### Phase 4: Documentation & Tooltips
16. [ ] Create `erd-metadata.ts` with entity/relationship descriptions
17. [ ] Create entity tooltip component
18. [ ] Create relationship tooltip component
19. [ ] Create entity detail side panel
20. [ ] Wire up hover/click interactions

### Phase 5: Polish
21. [ ] Add pan/zoom controls
22. [ ] Add minimap
23. [ ] Theme support (light/dark)
24. [ ] Mobile-friendly viewport

---

## Success Criteria

- [ ] All 25+ tables from DATA_MODEL.md created in Drizzle schema
- [ ] All tables rendered as nodes in ERD
- [ ] Entities grouped by domain with coloured outlines
- [ ] Foreign key relationships shown as edges
- [ ] Hover tooltips show entity/relationship descriptions
- [ ] Matches cred-ai theme in both light and dark mode
- [ ] Can be used to present data model to stakeholders

---

## Dependencies

- `@xyflow/react` - React Flow library
- `drizzle-orm` - Already installed
- Existing Supabase database connection
- Existing cred-ai theme variables
- DATA_MODEL.md as authoritative documentation

---

## Future Enhancements

- Filter by domain
- Search for table/column
- Auto-layout algorithm (dagre, elk)
- Export to PNG/SVG
- Show indexes and constraints
- Highlight related tables on hover
- Generate schema documentation from ERD
- Seed data visualisation

---

## References

- [DATA_MODEL.md](./DATA_MODEL.md) - Authoritative data model documentation
- [React Flow Documentation](https://reactflow.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- Example ERD screenshot (attached to original request)
