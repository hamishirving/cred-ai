# PRD: Credentially 2.0 Playground

**Status:** Draft
**Owner:** Product
**Last Updated:** 2025-12-28

---

## Purpose

A demonstration environment that showcases the vision for Credentially 2.0 — specifically the autonomous AI Compliance Companion and the composable primitive architecture. Used for:

1. **Sales demos** — Show prospects what Credentially 2.0 will deliver
2. **Customer previews** — Get existing customers excited about the roadmap
3. **Internal alignment** — Help stakeholders visualise the product direction
4. **API shaping** — Identify what data/endpoints the real platform needs

---

## The Customer Problem

### The Market Reality

Healthcare staffing organisations face unprecedented pressure:

| Challenge             | Impact                                                                      |
| --------------------- | --------------------------------------------------------------------------- |
| **Margin pressure**   | Agencies and providers squeezed on every placement; efficiency is survival  |
| **Staff shortages**   | Candidate-driven market; slow onboarding = lost hires to faster competitors |
| **Regulatory burden** | CQC, NHS frameworks, constantly changing requirements                       |
| **High turnover**     | Healthcare churn is relentless; onboarding is constant, not occasional      |
| **Time to revenue**   | Every day a candidate isn't working is lost revenue                         |

### The Compliance Bottleneck

Compliance is the critical path. Nothing happens until a candidate is compliant:

- **Document complexity** — DBS, professional registration (NMC, GMC, HCPC), right to work, immunisations, mandatory training — each with different rules, expiry dates, and verification requirements
- **Variable submission quality** — Blurry photos, wrong document types, expired versions create endless back-and-forth
- **Communication fatigue** — Candidates are bombarded by multiple employers; emails get ignored
- **Manual verification burden** — Staff spend hours chasing, checking, re-checking
- **Audit anxiety** — Must be CQC-ready at any moment, not scrambling when inspectors arrive
- **International complexity** — Growing reliance on overseas workers adds visa and right-to-work layers

### The Human Cost

- **Compliance teams burn out** — Repetitive admin, endless chasing, thankless work
- **Good candidates lost** — Slow, frustrating onboarding drives them to competitors
- **Risk of errors** — Manual processes lead to gaps; gaps lead to compliance failures
- **Candidate experience suffers** — First impression of employer is bureaucratic pain

### The Disconnect

Our customers are **service businesses, not technology companies**. They focus on care, not code. Yet:

- Their boards are asking: _"How are we leveraging AI?"_
- Their competitors are claiming AI capabilities
- They don't have the expertise to evaluate or implement AI solutions
- They need a trusted partner to lead, not follow

**Credentially must be the answer when the board asks about AI.**

### What They Need

| Need                        | Current Reality            | With Credentially 2.0                       |
| --------------------------- | -------------------------- | ------------------------------------------- |
| Do more with less           | Add headcount to scale     | AI handles volume; humans handle exceptions |
| Faster onboarding           | Days or weeks              | Hours or days                               |
| Reduce risk                 | Manual checks, human error | AI consistency, full audit trail            |
| Better candidate experience | Bureaucratic emails        | Personalised, intelligent communication     |
| Audit confidence            | Scramble to prepare        | Always ready, everything logged             |
| AI strategy                 | Don't know where to start  | Credentially is the answer                  |

---

## The Core Concept

### From Reactive to Autonomous

Traditional compliance software: **Human does work, software helps**

- Manager asks "who's blocked?"
- Manager drafts chase email
- Manager tracks responses
- Manager makes decisions

Credentially 2.0: **AI does work, human supervises**

- AI identifies who's blocked
- AI sends personalised chase
- AI tracks responses
- AI escalates decisions it can't make

**The shift:** Compliance managers become supervisors of an AI workforce, not administrators doing repetitive tasks.

### The Demo Moment

The prospect opens the playground. They don't ask the AI anything. They see:

```
AI Companion Activity - Today

✅ 09:00  Identified 5 candidates with Monday start dates
✅ 09:05  Sent 3 personalised chase emails (missing documents)
✅ 09:10  Initiated 2 reference verification calls
✅ 10:30  Received 2 document uploads → queued for review
✅ 11:15  Reference call completed → positive outcome logged
⚠️ 14:00  Sarah responded ambiguously → NEEDS YOUR DECISION
⚠️ 14:30  Passport OCR confidence 62% → NEEDS VERIFICATION

🔔 2 items need your attention
```

**The reaction we want:** "Wait, it's already doing all this? I just need to handle the exceptions?"

---

## Key Capabilities

### 1. Autonomous Activity Dashboard

**What it shows:** What the AI has been doing without being asked.

**Experience:**

- Timeline of AI actions (emails sent, calls made, documents received)
- Each action shows what was done and why
- Filter by profile, action type, date
- Drill into any action for full context

**Outcome metrics:**

- Documents collected this week
- Average response time
- Candidates cleared to start
- Items escalated vs auto-resolved
- Estimated time saved

**Why it matters:** Proves AI is working autonomously, not just answering questions.

---

### 2. Escalation Queue

**What it shows:** Decisions the AI needs human help with.

**Experience:**

- Cards showing situations requiring judgment
- Each card includes full context (who, what, why stuck)
- AI's recommendation highlighted
- Clear action buttons (approve recommendation, choose alternative, custom response)
- Resolution flows back to AI for continued processing

**Escalation types:**

- **Ambiguous responses** — Candidate said something AI can't interpret
- **Low confidence** — Document extraction uncertain
- **Policy exceptions** — Situation not covered by standard rules
- **Human preference** — Configured to always require human approval

**Example escalation:**

```
Sarah Thompson responded:
"My DBS is delayed by the issuing authority,
should arrive in 2 weeks."

Her start date is Monday.

AI recommendation: Delay start date (safest option)

[Delay to Feb 10th]  [Allow provisional start]  [Escalate to hiring manager]
```

**Why it matters:** Shows human-in-the-loop model. AI handles routine, humans handle exceptions.

---

### 3. Knowledge-Assisted Q&A

**What it shows:** AI that understands organisational policies and can answer questions intelligently.

**Experience:**

- Chat interface for natural language questions
- AI retrieves from knowledge base + live data
- Answers combine policy information with specific profile context
- Suggests follow-up actions

**Example interactions:**

```
User: "What documents does a Band 5 Nurse need?"

AI: Based on your organisation's requirements, Band 5 Nurses need:

    ✓ Enhanced DBS (within 3 years)
    ✓ NMC Registration (current)
    ✓ Right to Work documentation
    ✓ Occupational Health clearance
    ✓ Mandatory Training (6 modules)

    View our DBS guide | View full requirements

    Sarah Thompson is a Band 5 Nurse missing DBS and
    Mandatory Training. Want me to chase her on those?
```

```
User: "What's our policy on expired documents?"

AI: Your organisation's expired document policy:

    • Documents expire on their expiry date (no grace period)
    • Candidates cannot work with expired critical documents
    • 90-60-30 day reminder sequence before expiry
    • Renewal requests auto-sent at 90 days

    Currently 12 candidates have documents expiring
    in the next 30 days. View list?
```

**Why it matters:** Shows AI that truly understands the organisation, not just templates.

---

### 4. Document Intelligence Preview

**What it shows:** AI pre-screening documents before human verification.

**Experience:**

- Document upload triggers AI extraction
- AI shows extracted fields with confidence levels
- Low-confidence fields highlighted for human attention
- One-click confirm or correct-and-confirm
- Quality issues flagged (blurry, wrong document type)

**Example:**

```
📄 Document Review Required

Document: Passport (Sarah Thompson)
AI Confidence: 62%

Extracted:
├── Name: Sarah Thompson ✓ High confidence
├── DOB: 15/03/1992 ⚠️ Uncertain (image quality)
├── Expiry: 2028-04-22 ✓ High confidence
└── Nationality: British ✓ High confidence

[View Document]  [Confirm All]  [Correct & Confirm]
```

**Why it matters:** Shows AI + human working together. AI does heavy lifting, human verifies.

---

### 5. AI Transparency / Audit View

**What it shows:** Full visibility into AI decision-making.

**Experience:**

- Click any AI action to see reasoning
- Shows context AI had when making decision
- Shows rules/policies that influenced decision
- Override or adjust AI behaviour for future

**Example:**

```
Why did you send that email to Sarah?

Context when decision was made:
├── Start date: Monday 3rd Feb (4 days away)
├── Missing: DBS certificate
├── Last contact: 5 days ago (no response)
├── Compliance: 71% complete
├── Previous attempts: 2 emails (days 1 and 3)

Decision reasoning:
├── Trigger: No response after 5 days
├── Rule: Chase every 2 days if no response
├── Action: Send encouragement + specific ask
├── Channel: Email (candidate preference)
├── Tone: Warm, helpful (organisation setting)

Message sent:
"Hi Sarah, hope you're well! You're so close to being
ready to start — just your DBS certificate left.
Need any help with that? Here's a quick guide: [link]"

[View full message]  [Override: don't chase Sarah]
```

**Why it matters:** Builds trust. AI isn't a black box. Full auditability.

---

### 6. Voice AI Integration

**What it shows:** AI making phone calls for verification.

**Experience:**

- Reference check calls initiated by AI
- Live or recorded call playback
- Transcript and extracted information
- Outcome logged and actioned

**Already built:** Employment reference verification template.

**Future templates:**

- Right to work verification
- DBS status confirmation
- Qualification verification
- Employment dates confirmation

**Why it matters:** Shows multi-channel AI capability beyond just email/chat.

---

### 7. Ongoing Compliance Monitoring

**What it shows:** AI proactively managing renewals and expiry, not just initial onboarding.

**Experience:**

- Dashboard showing items expiring in 30/60/90 days
- AI-triggered renewal reminders before expiry
- Status transitions: compliant → expiring soon → expired
- Re-verification workflows for professional registrations

**Example:**

```
⚠️ Expiring Soon - Next 30 Days

Lisa Anderson
├── DBS Certificate expires 15 Feb (12 days)
│   └── AI sent renewal reminder 3 days ago
├── Mandatory Training expires 28 Feb (25 days)
│   └── Scheduled: reminder at 14 days

James Wilson
├── NMC Registration expires 10 Feb (7 days)
│   └── ⚠️ No response to 2 reminders → ESCALATED

[View all expiring] [Configure alert thresholds]
```

**Why it matters:** Compliance isn't one-and-done. Shows AI maintaining compliance continuously.

---

### 8. Pipeline / Journey View

**What it shows:** CRM-style pipeline showing where candidates are in their journey.

**Experience:**

- Kanban board view of candidates by stage
- Stage ownership (who's responsible)
- Time-in-stage tracking
- Auto-advance when compliance complete
- Drag-and-drop manual transitions

**Example:**

```
Pipeline: Onboarding

┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Invited   │  │  Onboarding │  │  Compliance │  │   Active    │
│  (2 days)   │  │  (3 days)   │  │  (5 days)   │  │             │
├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤
│             │  │ Sarah T.    │  │ James W.    │  │ Emily C.    │
│             │  │ Michael B.  │  │ ⚠️ 7 days   │  │ +12 more    │
│             │  │             │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
   Recruitment      Recruitment    Compliance Team    Operations
```

**Why it matters:** Shows clear accountability and CRM-like workflow management.

---

## Demo Scenarios

### Scenario A: "The Morning Check-In"

Manager opens playground at 9am. Without asking anything, they see:

1. **Dashboard** — AI has already handled overnight items
2. **Metrics** — 12 documents collected, 3 candidates ready
3. **Escalations** — 2 items need attention
4. Resolve both escalations in under 2 minutes
5. **Result:** Day's compliance work mostly done before coffee

**Time to demo:** 3-5 minutes

---

### Scenario B: "The Candidate Journey"

Follow a single candidate (Sarah) through:

1. AI identifies Sarah is stuck (missing DBS)
2. AI sends personalised chase email
3. Sarah responds with a question
4. AI answers using knowledge base
5. Sarah uploads document
6. AI extracts and flags for verification
7. Human confirms extraction
8. Sarah becomes compliant
9. AI notifies hiring manager

**Time to demo:** 5-7 minutes

---

### Scenario C: "The Policy Question"

Show knowledge-powered intelligence:

1. Ask "What documents does a Band 5 Nurse need?"
2. AI shows requirements from knowledge base
3. Ask "Who's missing DBS certificates?"
4. AI shows filtered list with context
5. Ask "Send a reminder to all of them"
6. AI drafts personalised messages for each
7. Approve and send

**Time to demo:** 3-4 minutes

---

### Scenario D: "The Exception Handler"

Show human-in-the-loop for edge cases:

1. View escalation queue
2. Pick an ambiguous response case
3. See full context and AI recommendation
4. Choose an action
5. Watch AI continue processing with that decision
6. View audit trail of the decision

**Time to demo:** 2-3 minutes

---

## Data Requirements

> **Note:** See `DATA_MODEL.md` for full entity definitions. Key concepts:
> - **WorkNode** = unified "where work happens" entity (replaces Client/Facility)
> - **Pipeline** = configurable journey stages with team ownership

### Profiles

5-10 candidate profiles with varied states:

- **Sarah Thompson** — Nearly complete, missing DBS, start date Monday
- **James Wilson** — Stuck for 2 weeks, unresponsive
- **Emily Chen** — Complete, recently cleared
- **Michael Brown** — Just started, 30% complete
- **Lisa Anderson** — Expired document, renewal needed

### WorkNode Hierarchy (Example)

```
NHS Trust A (type: Trust, jurisdiction: england)
├── St Mary's Hospital (type: Hospital)
│   ├── Ward A (type: Ward)
│   └── Ward B (type: Ward)
└── City General (type: Hospital)
    └── ICU (type: Unit)
```

### Placements

- Mix of single and multiple placements per candidate
- Different WorkNodes with varying requirements
- Various start dates for urgency scenarios

### Pipeline Configuration (Example)

```
Default Onboarding Pipeline:
├── Invited (Owner: Recruitment)
├── Onboarding (Owner: Recruitment)
├── Compliance (Owner: Compliance Team) ← auto-advance at 100%
├── QA Review (Owner: QA Team)
└── Active (Owner: Operations)
```

### AI Activity History

7 days of activity showing:

- Emails sent (chase sequences, confirmations)
- Documents received and processed
- Escalations created and resolved
- Reference calls initiated and completed
- **Expiry warnings sent** (ongoing compliance)
- **Renewal reminders triggered**

### Escalations

2-3 pending escalations:

- Ambiguous candidate response (Sarah's DBS delay)
- Low confidence document extraction
- Policy exception request

### Knowledge Content

- Role requirements (Band 5 Nurse, Healthcare Assistant, etc.)
- Document guides (DBS, Right to Work, NMC Registration)
- Policy documents (expired documents, grace periods)
- FAQs (common candidate questions)

### Outcome Metrics

Week of data showing:

- 47 documents collected
- 18 hours estimated time saved
- 94% auto-resolved (6% escalated)
- 4.2 hour average response time
- **3 renewals triggered** (ongoing compliance)
- **12 items expiring next 30 days**

---

## Success Criteria

### Demo Effectiveness

- [ ] Prospect understands "AI does work, human supervises" within 2 minutes
- [ ] "How do I get this?" reaction from prospects
- [ ] Existing customers ask about timeline for these capabilities
- [ ] Internal stakeholders aligned on product direction

### Capability Coverage

- [ ] Autonomous activity clearly visible
- [ ] Escalation handling smooth and intuitive
- [ ] Knowledge Q&A feels intelligent, not templated
- [ ] Document preview shows AI + human collaboration
- [ ] Audit trail builds trust in AI decisions
- [ ] Voice AI demonstrates multi-channel capability

### Technical Validation

- [ ] Identifies API endpoints needed for real implementation
- [ ] Validates data model for primitives
- [ ] Tests composition patterns (P021 + P009 + P010 + P004)
- [ ] Informs engineering priorities

---

## What This Is NOT

- **Not production software** — Demo environment with seed data
- **Not feature-complete** — Shows vision, not every edge case
- **Not the final UX** — Demonstrates capability, design will evolve
- **Not integrated with real Credentially** — Standalone playground

---

## Primitive Mapping

How playground capabilities map to platform primitives:

| Playground Feature  | Primitives Used                         |
| ------------------- | --------------------------------------- |
| Activity Dashboard  | P021 (AI Agent) + P004 (Audit)          |
| Escalation Queue    | P010 (HITL) + P021 (AI Agent)           |
| Knowledge Q&A       | P023 (Knowledge Base) + P021 (AI Agent) |
| Document Preview    | P019 (Document AI) + P010 (HITL)        |
| Audit View          | P004 (Temporal Data) + P021 reasoning   |
| Notifications shown | P009 (Notifications) + P021 (content)   |
| Voice AI            | P021 (AI Agent) + P011 (Connectors)     |
| **Ongoing Compliance** | P006 (Scheduled Jobs) + P021 (AI Agent) + P009 (Notifications) |
| **Pipeline View**   | P002 (Lifecycle States) + P005 (Events) + P007 (Rules)  |

This mapping helps validate that the primitive architecture supports real features.

### Data Model Alignment

| Data Model Entity   | Playground Usage                        |
| ------------------- | --------------------------------------- |
| WorkNode            | Hierarchy for placements, drives requirements |
| WorkNodeType        | User-defined levels (Trust → Hospital → Ward) |
| Pipeline            | Stage definitions for journey view      |
| EntityStagePosition | Tracks where candidates are in pipeline |
| Evidence            | Compliance items with expiry dates      |
| ComplianceElement   | Requirement definitions with scope      |

See `DATA_MODEL.md` for full entity definitions.

---

## Customer Scenarios

These real-world scenarios stress-test the data model and ensure the playground can demonstrate value to different customer types.

### UK Scenarios

#### UK-1: Neven Partnership (Vendor Management / MSP)

**Business Model:** Managed Service Provider that manages a network of recruitment agencies supplying to NHS Trusts. They don't employ candidates directly — they mandate compliance standards that agencies must meet to remain on their preferred supplier list.

**Hierarchy:**
```
Neven Partnership (MSP)
├── Agency A (supplier)
│   └── Candidates → placed at NHS Trusts
├── Agency B (supplier)
│   └── Candidates → placed at NHS Trusts
└── Agency C (supplier)
    └── Candidates → placed at NHS Trusts

NHS Framework Clients:
├── NHS Trust North
│   ├── Hospital A
│   └── Hospital B
├── NHS Trust South
│   └── Hospital C
└── NHS Trust Midlands
    └── ...
```

**Compliance Flow:**
- Neven sets **base requirements** all agencies must meet (framework standards)
- Each **NHS Trust** adds trust-specific requirements
- Each **Hospital** may add site-specific requirements
- **Agencies** may add their own internal requirements on top
- Candidates must be compliant with the union of all applicable requirements for their specific placement

**Key Challenges:**
- Multi-party: MSP → Agency → Candidate → End Client
- Agencies are both "customers" (of Neven) and "suppliers" (to NHS)
- Requirements cascade from multiple sources
- Visibility: Neven needs oversight across all agencies

---

#### UK-2: Cera Care (Direct Employer, Domiciliary Care)

**Business Model:** Largest domiciliary (home) care provider in the UK. Direct employer with ~70 branches across the country. Care workers visit patients in their homes.

**Hierarchy:**
```
Cera Care (HQ)
├── North Region
│   ├── Manchester Branch
│   ├── Leeds Branch
│   └── Newcastle Branch
├── Midlands Region
│   ├── Birmingham Branch
│   └── Nottingham Branch
├── South Region
│   ├── London (multiple sub-branches)
│   ├── Bristol Branch
│   └── Southampton Branch
└── Scotland Region
    ├── Edinburgh Branch
    └── Glasgow Branch
```

**Compliance Flow:**
- **HQ** sets core requirements (DBS, Right to Work, Care Certificate)
- **Regional** requirements vary (Scotland has different PVG checks vs England DBS)
- **Branch-level** requirements for local authority contracts
- **Role-based** requirements (Care Worker vs Senior Carer vs Nurse)
- Some care workers work across multiple branches

**Key Challenges:**
- No external "clients" — they ARE the employer
- Regional/devolved nation variations (England vs Scotland vs Wales)
- Local authority contract requirements vary by branch
- Workers may float between branches (candidate-scoped docs apply everywhere)

---

#### UK-3: Sanctuary Personnel (Multi-Brand Recruitment Agency Group)

**Business Model:** Recruitment agency group with multiple specialist brands underneath. Each brand operates semi-independently but shares infrastructure. Places candidates at hundreds of different employers.

**Hierarchy:**
```
Sanctuary Group (Parent)
├── Sanctuary Personnel (healthcare staffing)
│   └── Places at: NHS Trusts, Private Hospitals, Care Homes
├── Sanctuary Medical (locum doctors)
│   └── Places at: NHS Trusts, Private Clinics
├── Sanctuary Social Care
│   └── Places at: Local Authorities, Care Providers
└── Sanctuary Education
    └── Places at: Schools, Academies

Each brand's clients:
├── Client A (NHS Trust)
│   ├── Hospital 1
│   │   ├── Ward A
│   │   └── Ward B
│   └── Hospital 2
├── Client B (Private Hospital Group)
│   └── ...
└── Client C (Care Home Chain)
    └── ...
```

**Compliance Flow:**
- **Group-level** requirements (shared across all brands)
- **Brand-level** requirements (e.g., Sanctuary Medical has additional clinical requirements)
- **Client-level** requirements (each NHS Trust has different needs)
- **Facility-level** requirements (specific hospital/ward requirements)
- **Role-level** requirements (Band 5 Nurse vs HCA)

**Key Challenges:**
- Multiple agency brands under one parent
- Each brand has different client portfolios
- Candidates might work across brands
- Deep client hierarchies (Trust → Hospital → Ward)
- Need consolidated view at Group level

---

### US Scenarios

#### US-1: Health Carousel (Travel Nursing Agency)

**Business Model:** National travel nursing agency placing nurses on 8-26 week assignments at hospitals across all 50 states. Nurses "travel" to where demand is highest.

**Hierarchy:**
```
Health Carousel (Agency)
├── Candidate Pool (nationwide)
└── Client Hospitals:
    ├── California
    │   ├── UCLA Medical Center
    │   │   ├── ICU
    │   │   ├── ER
    │   │   └── Med-Surg
    │   └── Cedars-Sinai
    ├── Texas
    │   ├── Houston Methodist
    │   └── UT Southwestern
    ├── New York
    │   ├── NYU Langone
    │   └── Mount Sinai
    └── Florida
        └── ...
```

**Compliance Flow:**
- **Federal requirements** apply everywhere (I-9, background check)
- **State requirements** vary significantly:
  - Nursing license (each state requires separate license or Compact state agreement)
  - State-specific background checks
  - State health requirements
- **Hospital system requirements** (credentialing standards)
- **Facility requirements** (specific hospital policies)
- **Unit requirements** (ICU has additional competencies)
- **Joint Commission** accredited facilities have additional standards

**Key Challenges:**
- Same nurse, different state = different license requirements
- Compact vs non-compact nursing license states
- 50 different state regulatory frameworks
- Short-term assignments (8-26 weeks) = fast turnaround needed
- Nurse may have multiple sequential placements

---

#### US-2: Ascension Health (Large Hospital System)

**Business Model:** One of the largest non-profit health systems in the US. Direct employer with 140+ hospitals across 19 states. Employs nurses, doctors, and allied health professionals directly.

**Hierarchy:**
```
Ascension Health (System HQ)
├── Ascension Texas
│   ├── Ascension Seton (Austin)
│   │   ├── Seton Medical Center
│   │   │   ├── Emergency Department
│   │   │   ├── Surgical Services
│   │   │   └── Nursing Units
│   │   └── Seton Northwest
│   └── Ascension Providence (Waco)
├── Ascension Michigan
│   ├── Ascension St. John
│   └── Ascension Borgess
├── Ascension Florida
│   └── ...
└── (17 more states...)
```

**Compliance Flow:**
- **System-wide requirements** (Ascension policies, values training)
- **State requirements** (license, state background checks)
- **Market requirements** (Ascension Texas vs Ascension Michigan policies)
- **Hospital requirements** (facility-specific orientation)
- **Department requirements** (OR requires additional competencies)
- **Role requirements** (RN vs LPN vs CNA)

**Key Challenges:**
- Direct employer (no external clients)
- Multi-state with 19 different regulatory environments
- Internal transfers between hospitals/states
- Deep hierarchy: System → State/Market → Hospital → Department
- Some staff float between facilities within a market

---

#### US-3: Memorial Hermann (Regional Hospital, Direct Employer)

**Business Model:** Regional hospital system in Houston, Texas. Direct employer, single state, multiple facilities. Simpler structure than national systems.

**Hierarchy:**
```
Memorial Hermann Health System
├── Memorial Hermann - Texas Medical Center (flagship)
│   ├── Heart & Vascular Institute
│   ├── Neuroscience Institute
│   └── General Nursing
├── Memorial Hermann - Katy
├── Memorial Hermann - The Woodlands
├── Memorial Hermann - Sugar Land
└── Memorial Hermann - Convenient Care (clinics)
    ├── Clinic A
    ├── Clinic B
    └── ...
```

**Compliance Flow:**
- **System-wide requirements** (Texas state license, system orientation)
- **Facility requirements** (TMC flagship has research requirements)
- **Department requirements** (specialty institutes have additional needs)
- **Role requirements** (RN, LPN, Tech, etc.)

**Key Challenges:**
- Single state (simpler licensing)
- But multiple facility types (hospitals vs clinics)
- Flagship academic medical center has research/teaching requirements
- Staff may work across facilities
- Still need hierarchy for requirement inheritance

---

### Scenario Summary Matrix

| Scenario | Type | Org Levels | Work Hierarchy | Key Complexity |
|----------|------|------------|----------------|----------------|
| Neven | MSP | MSP → Agencies | NHS Trusts → Hospitals | Multi-party, framework compliance |
| Cera Care | Direct Employer | HQ → Region → Branch | Same as org | Regional variations (Scotland/England) |
| Sanctuary | Agency Group | Group → Brands | Clients → Facilities → Units | Multi-brand, shared candidates |
| Health Carousel | Travel Agency | Single org | States → Hospitals → Units | 50-state licensing, short assignments |
| Ascension | Health System | System → Market → Hospital | Same as org | 19 states, internal transfers |
| Memorial Hermann | Regional System | System → Facility | Same as org | Simplest case, single state |

---

## Open Questions

1. **Data realism** — How realistic should seed data be? Real-looking names/scenarios?
2. **API preview** — Should playground call mock APIs that mirror planned real APIs?
3. **Voice demo** — Live calls or recorded playback for demos?
4. **Multi-org** — Show single organisation or demonstrate multi-tenancy?
5. **Mobile** — Any need to show mobile responsiveness?

---

## Next Steps

1. Review and refine demo scenarios
2. Define seed data in detail
3. Build core UI components
4. Implement chat/knowledge integration
5. Add activity feed and escalation queue
6. Connect to existing voice AI capability
7. Test with internal stakeholders
8. Refine based on feedback
9. Use in first sales demos

---

_This playground demonstrates the future. The PRDs for AI Compliance Companion, CV Parsing, and Messaging Automation show how we get there._
