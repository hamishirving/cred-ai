---
name: ui-design
description: Cred-AI UI design system and aesthetic direction. Use when building, modifying, or reviewing any UI component, page, or layout in the cred-ai project. Ensures visual consistency, warmth, and intentionality across the interface.
---

# Cred-AI UI Design System

Design language for the Credentially playground. Every UI decision should feel **warm, layered, and confident** — a healthcare platform built for humans, not a generic SaaS dashboard.

## When to Use This Skill

- Building any new page, component, or layout
- Modifying existing UI elements
- Reviewing UI code for consistency
- Choosing colours, spacing, typography for new features
- Adding tables, cards, filters, or navigation elements

## Design Philosophy

### Three Principles

1. **Warm, not cold.** Healthcare is human. Warm neutrals, considered colour, nothing sterile.
2. **Layered, not flat.** Three visual surfaces create depth without shadows. White chrome, warm background, white content.
3. **Confident, not timid.** Large page headings, deliberate whitespace, bold scale contrast. Don't hedge.

### Anti-Patterns — What We Never Do

- Cool blue-grey everything (the shadcn default trap)
- Uniform type sizing where headings and body are barely different
- Heavy box shadows on cards
- Dropdowns hiding filter state the user needs to see
- Purple gradients on white backgrounds
- Cookie-cutter layouts with no spatial personality
- Generic font stacks (system-ui alone, Arial, Roboto)
- Timid, evenly-distributed colour palettes where nothing has emphasis
- `transition: all` — always list specific properties
- `outline: none` without a replacement focus indicator

---

## Colour System

### Brand

Our primary blue is non-negotiable. It's the identity.

```
--brand-blue: #4444cf        /* Primary actions, links, focus rings */
--brand-blue-hover: #3636b8  /* Hover state */
--brand-blue-active: #2e2ea3 /* Active/pressed state */
--brand-blue-subtle: #eeedf8 /* Light blue tint for selected states */
```

### Warm Complement — Amber/Sand

The secondary accent family. Used for categories, status indicators, highlights, and warmth.

```
--accent-warm: #c49332       /* Secondary accent — badges, category pills */
--accent-warm-hover: #a87c2a
--accent-warm-subtle: #faf5eb /* Very light amber tint for highlights */
--accent-warm-muted: #e8dcc8 /* Borders, dividers with warmth */
```

### Surfaces — The Three-Layer Model

This is the core visual trick. Depth through colour contrast, not shadows.

```
--surface-chrome: #ffffff    /* Sidebar, top bars, modals — pure white */
--surface-page: #f7f5f0      /* Main content background — warm cream */
--surface-content: #ffffff   /* Cards, table rows, panels — white on warm */
```

In dark mode:
```
--surface-chrome: #1a1916    /* Warm dark, not blue-black */
--surface-page: #131210      /* Deepest warm dark */
--surface-content: #1f1d19   /* Elevated surfaces */
```

### Warm Neutrals

Replace cool greys with warm stone tones throughout.

```
--neutral-950: #1c1a15       /* Headings, primary text */
--neutral-800: #3d3a32       /* Body text */
--neutral-600: #6b6760       /* Secondary text */
--neutral-500: #8a857d       /* Muted text, placeholders */
--neutral-400: #a8a49c       /* Disabled text */
--neutral-300: #ccc8c0       /* Borders */
--neutral-200: #e5e2db       /* Dividers */
--neutral-100: #f0ede7       /* Subtle backgrounds */
--neutral-50: #f7f5f0        /* Page background (same as surface-page) */
```

### Semantic Colours

Warmer versions — sage green, amber warning, warm red. Not neon.

```
--positive: #3a9960          /* Success, complete, verified */
--positive-subtle: #eef6f1
--warning: #c49332           /* Attention, pending, expiring */
--warning-subtle: #faf5eb
--negative: #c93d4e          /* Error, failed, overdue */
--negative-subtle: #fdf0f1
--info: #4444cf              /* Informational — uses brand blue */
--info-subtle: #eeedf8
```

### Contrast Requirements

Follow WCAG AA minimum. Check every pairing.

| Element | Minimum Ratio |
|---------|--------------|
| Body text on any background | 4.5:1 |
| Large text (18px+ or 14px bold) | 3:1 |
| UI components (borders, icons) | 3:1 |
| Aim for AAA where possible | 7:1 |

---

## Typography

### Font Stack

```
--font-sans: 'Geist', system-ui, sans-serif
--font-mono: 'Geist Mono', monospace
```

Geist is our primary face. It's distinctive enough without being decorative — clean, slightly geometric, good at small sizes. Use it everywhere. Don't introduce additional font families without strong justification.

### The Scale — Skip Steps Deliberately

The personality comes from contrast between page headings and body text. Don't use the scale evenly.

```
--text-xs: 0.75rem      /* 12px — metadata, tertiary labels */
--text-sm: 0.875rem     /* 14px — body text, table cells, UI labels */
--text-base: 1rem       /* 16px — prominent body, descriptions */
--text-lg: 1.125rem     /* 18px — rarely used, skip this */
--text-xl: 1.25rem      /* 20px — section headings */
--text-2xl: 1.5rem      /* 24px — card titles, sub-page headings */
--text-3xl: 1.875rem    /* 30px — skip this too */
--text-4xl: 2.25rem     /* 36px — page titles */
--text-5xl: 3rem        /* 48px — hero/display headings */
```

**The rule:** Page titles jump to `4xl` or `5xl`. Section headings sit at `xl` or `2xl`. Body stays at `sm` or `base`. The steps between are intentionally skipped to create dramatic hierarchy.

### Line Heights

| Text Type | Line Height |
|-----------|------------|
| Display/headings (4xl+) | 1.1 – 1.2 (tight, impactful) |
| Section headings (xl–2xl) | 1.2 – 1.3 |
| Body text | 1.5 – 1.6 (readable) |
| UI labels, metadata | 1.2 – 1.4 (compact) |

### Weight Usage

Limit to three weights maximum:

- **Regular (400)** — body text, descriptions, metadata
- **Medium (500)** — UI labels, table headers, secondary emphasis
- **Semibold (600)** — page titles, card titles, buttons, primary emphasis

Don't use bold (700) in UI. It's too heavy for a refined aesthetic.

### Typography Rules

- `text-wrap: balance` on all headings (prevents orphan words)
- `font-variant-numeric: tabular-nums` on any column of numbers
- `max-width: 65ch` on body text blocks for optimal reading width
- Use `…` (proper ellipsis) not `...`
- Curly quotes `"` `"` not straight quotes in display text
- Non-breaking spaces: `10 MB`, `Cmd K` — use `&nbsp;` between value and unit
- Placeholder text ends with `…` (e.g. "Search templates…")

---

## Spacing System

### 8-Point Grid

All spacing derives from multiples of 4px (0.25rem).

```
space-1:  0.25rem   /* 4px */
space-2:  0.5rem    /* 8px */
space-3:  0.75rem   /* 12px */
space-4:  1rem      /* 16px */
space-5:  1.25rem   /* 20px */
space-6:  1.5rem    /* 24px */
space-8:  2rem      /* 32px */
space-10: 2.5rem    /* 40px */
space-12: 3rem      /* 48px */
space-16: 4rem      /* 64px */
```

### Two Spacing Personalities

The same interface uses generous and tight spacing in different contexts. This is deliberate, not inconsistent.

**Page-level (generous):**
- Space between page title and content: `space-8` to `space-10`
- Space between major sections: `space-8` to `space-12`
- Page horizontal margins: `space-6` to `space-8`
- Gap between cards in a grid: `space-4` to `space-5` (16–20px)

**Component-level (tight):**
- Card internal padding: `space-3` to `space-4`
- Table cell padding: `space-2` to `space-3`
- Form field gap: `space-3` to `space-4`
- Icon-to-text gap: `space-2` (8px)
- Badge/pill padding: `space-1` horizontal, `space-0.5` vertical
- Button padding: `space-2` vertical, `space-4` horizontal

**The principle:** Breathe at the page level, compress at the component level. A page can feel spacious and information-dense at the same time.

---

## Surface & Layering

### The Three-Layer Model

Every layout uses three visual layers to create depth without shadows.

```
Layer 1: Chrome (sidebar, top bar)     → --surface-chrome (#ffffff)
Layer 2: Page background               → --surface-page (#f7f5f0)
Layer 3: Content surfaces              → --surface-content (#ffffff)
```

Cards, table rows, modals, and panels use `--surface-content` and sit visually "on top of" the warm page background. The contrast between the warm cream and pure white creates perceived elevation.

### Card Styling

```css
.card {
  background: var(--surface-content);
  border: 1px solid var(--neutral-200);
  border-radius: 0.5rem; /* 8px — slightly softer than our current 6px */
  /* NO box-shadow. Depth comes from background contrast. */
}
```

- Borders: 1px, `--neutral-200` (warm grey, not cool)
- No shadows in resting state. Subtle shadow only on hover if needed for interactive cards
- Generous gap between cards: `gap-4` or `gap-5`
- Consistent internal rhythm in every card: **label → title → metadata row**

### Sidebar

- Background: `--surface-chrome` (white)
- Separated from content by a 1px border, not a shadow
- Active nav item: subtle warm tinted background (`--neutral-100` or `--accent-warm-subtle`)
- Primary CTA button (e.g. "New chat"): brand blue — the single pop of colour
- Section labels: `text-xs`, `font-medium`, `uppercase`, `text-neutral-500`, `tracking-wide`
- Nav items: `text-sm`, `font-regular`, with icon at `--icon-sm` (16px)

### Content Areas

- Main content sits on `--surface-page` (warm cream)
- Content panels, cards, tables use `--surface-content` (white)
- Page titles sit directly on the warm background — no white header bar needed
- Generous top padding before the first content block

---

## Component Patterns

### Tables

```
Header row:    --neutral-100 background, text-xs font-medium text-neutral-600
Body rows:     --surface-content (white), border-b border-neutral-200
Row height:    48–56px standard, 36–40px compact mode
Hover:         --neutral-50 background (very subtle)
```

- Tinted header row — not transparent, not heavy. A warm light wash.
- Sort indicators: small carets, muted until active
- Actions (edit, delete, more): right-aligned, appear on row hover, use `ghost` button variant
- Status cells: use coloured pills (see Badges below)
- Numbers: right-aligned with `tabular-nums`

### Badges & Status Pills

Coloured indicators for status, category, type. Use the semantic palette.

```css
.badge-positive  { background: var(--positive-subtle); color: var(--positive); }
.badge-warning   { background: var(--warning-subtle); color: var(--warning); }
.badge-negative  { background: var(--negative-subtle); color: var(--negative); }
.badge-info      { background: var(--info-subtle); color: var(--info); }
.badge-neutral   { background: var(--neutral-100); color: var(--neutral-600); }
```

- Shape: `rounded-full` for status, `rounded-md` for category/type labels
- Size: `text-xs font-medium px-2.5 py-0.5`
- Include a small icon before text where it aids scanning (e.g. clock for pending, check for complete)

### Filter Bars

Use **pill-style inline filters**, not hidden dropdowns. The user should see current filter state at a glance.

```
[Icon] Label  [Current Value]
```

- Each filter is a button showing its label and current selection
- Active filters use a subtle background tint
- "Reset filters" appears contextually when any filter is active
- Search input is separate, full-width or right-aligned, with icon + placeholder ending in `…`
- Layout: horizontal row, `gap-2` to `gap-3` between pills, wraps on mobile

### Buttons

Follow shadcn variants but with warm neutral adjustments:

| Variant | Use |
|---------|-----|
| `default` (blue) | Primary action per page — one only |
| `secondary` | Secondary actions, filter pills |
| `outline` | Tertiary actions, back navigation |
| `ghost` | Inline actions, table row actions, icon buttons |
| `destructive` | Delete, remove — uses `--negative` |

- One primary (blue) button per visible area. If everything is blue, nothing is.
- Prefer `size="sm"` for non-primary actions
- Icon buttons always have `aria-label`
- Submit buttons: enabled until request starts, show spinner during loading

### Form Inputs

- Border: `--neutral-300` resting, `--brand-blue` on focus
- Background: `--surface-content`
- Focus ring: `ring-2 ring-brand-blue/20` (subtle blue glow, not harsh)
- Correct `type` attributes (`email`, `tel`, `url`, `number`)
- `autocomplete` on every input that benefits from it
- Never block paste
- Errors display inline below the field, `text-xs text-negative`

### Empty States

- Centre-aligned in the content area
- Illustration or icon (muted, not garish), `--icon-xl` or larger
- Heading at `text-xl font-semibold`
- Description at `text-sm text-neutral-500`, max-width `40ch`
- Single CTA button (primary) below

---

## Icons

Using Lucide React throughout. Consistent sizing system:

```
--icon-xs: 12px   /* Inside badges, inline with small text */
--icon-sm: 16px   /* Nav items, form field icons, buttons */
--icon-md: 20px   /* Default, standalone icons */
--icon-lg: 24px   /* Page headers, feature icons */
--icon-xl: 32px   /* Empty states, hero sections */
```

- Default colour: `text-neutral-500` (muted, not competing with text)
- Active/interactive colour: `text-neutral-800` or `text-brand-blue`
- Always `aria-hidden="true"` when decorative
- Always paired with `aria-label` on icon-only buttons
- `flex-shrink-0` to prevent icons collapsing in flex layouts

---

## Animation & Motion

### Principles

- Animation serves function, not decoration
- One well-orchestrated page entrance > scattered micro-interactions
- Always honour `prefers-reduced-motion`
- Never use `transition: all` — list specific properties
- Only animate `transform` and `opacity` for performance

### Standard Transitions

```css
/* Hover states */
transition: background-color 150ms ease, color 150ms ease;

/* Expanding panels, sidebars */
transition: width 200ms ease, opacity 150ms ease;

/* Page content entrance */
opacity: 0 → 1, translateY(8px) → 0, duration 300ms, ease-out
/* Stagger children with 50ms delay increments */
```

### Loading States

- Use skeleton screens with warm grey pulse (`--neutral-100` → `--neutral-200`)
- Loading text: "Loading…" with proper ellipsis
- Spinner for button states, skeleton for content areas
- Never show a blank white page during load

---

## Accessibility Requirements

Non-negotiable. Every component must meet these.

### Focus

- Visible focus ring on every interactive element: `focus-visible:ring-2 focus-visible:ring-brand-blue`
- Never `outline: none` without a replacement
- Use `:focus-visible` not `:focus` (avoids showing rings on click)
- Tab order follows visual order

### Semantics

- `<button>` for actions, `<a>`/`<Link>` for navigation — never `<div onClick>`
- Proper heading hierarchy (`h1` → `h2` → `h3`), never skip levels
- `<label>` on every form control, or `aria-label` when visual label is absent
- `<table>` for tabular data, not `<div>` grids
- `aria-live="polite"` for async updates (toast notifications, loading states)

### Touch & Interaction

- `touch-action: manipulation` to prevent double-tap delay on mobile
- `overscroll-behavior: contain` on modals, drawers, and scrollable panels
- Minimum touch target: 44x44px on mobile
- Destructive actions require confirmation or undo window

### Images & Media

- Every `<img>` has `alt` text (empty `alt=""` for decorative images)
- Explicit `width` and `height` on images to prevent layout shift
- Below-fold images: `loading="lazy"`
- Above-fold images: `priority` or `fetchpriority="high"`

---

## Navigation & State

- URL reflects state — filters, tabs, pagination in query params
- Deep-linkable: if a user can see it, they should be able to link to it
- Use `<Link>` for anything that should support Cmd/Ctrl+click to open in new tab
- Back navigation uses breadcrumb-style links ("← Back to templates"), not browser back
- `<meta name="theme-color">` matches the current background

---

## Dark Mode

Plan from day one using semantic tokens. Warm dark, not cold.

- Dark backgrounds use warm charcoal (`#1a1916`, `#131210`) not blue-black
- Elevated surfaces are slightly lighter warm dark (`#1f1d19`, `#262420`)
- Text inverts to warm cream, not pure white (`#f0ede7`)
- Brand blue shifts slightly lighter for dark backgrounds (`#5858e0`)
- Borders shift to `#2a2720` range
- Set `color-scheme: dark` on `<html>`
- Test every colour pairing for contrast in both modes

---

## Responsive Behaviour

- Sidebar collapses to icon-only on tablet, off-canvas on mobile
- Card grids: 3-column → 2-column → 1-column
- Page titles scale down: `5xl` → `4xl` → `3xl` using `clamp()`
- Filter bars wrap on narrow screens
- Tables gain horizontal scroll on mobile, not column hiding (data matters)
- Minimum body text: never below `14px` on any viewport

---

## Decision Checklist

Before shipping any UI, verify:

- [ ] Surface layering: chrome/page/content layers are distinct
- [ ] Warm neutrals used throughout, no cool greys sneaking in
- [ ] Page title is `4xl`+ with clear hierarchy to body text
- [ ] Cards use borders only, no shadows (unless interactive hover state)
- [ ] Filter state is visible inline, not hidden in dropdowns
- [ ] Only one primary (blue) button per visible area
- [ ] Focus indicators visible on every interactive element
- [ ] Semantic HTML: buttons for actions, links for navigation
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Colour contrast meets WCAG AA minimum (4.5:1 body, 3:1 large/UI)
- [ ] Proper `alt`, `aria-label`, `type`, `autocomplete` attributes
- [ ] Loading states use skeletons or spinners, never blank space
