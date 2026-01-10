# Design Principles

Core principles that guide the visual design and UX of the Credentially platform.

---

## 1. Information Density

**Users are comfortable with density.** Many come from spreadsheets and expect to see lots of information at once without excessive scrolling.

### Guidelines

- **Compact by default** - Tight padding, smaller gaps, reduced whitespace
- **Progressive disclosure** - Show summaries, expand on demand
- **Data tables over cards** - When showing lists, prefer dense table layouts
- **Avoid "hero" sections** - No oversized headers or excessive padding

### Implementation

```tsx
// Good: Compact padding
<Card className="p-3">

// Avoid: Spacious padding (unless intentional)
<Card className="p-8">
```

### CSS Variables

```css
--radius: 0.375rem;  /* Tight corners, not rounded */
html { font-size: 14px; }  /* Slightly smaller base */
```

---

## 2. Snappy & Fast

**Everything should feel instant.** Interactions should be responsive with minimal delay.

### Guidelines

- **Optimistic updates** - Update UI before server confirms
- **Skeleton states** - Show structure immediately, fill in data
- **Micro-animations** - Short, purposeful (150-300ms max)
- **No loading spinners on primary actions** - Use inline indicators

### Implementation

```tsx
// Good: Optimistic update
const handleComplete = (id) => {
  setTasks(prev => prev.map(t =>
    t.id === id ? { ...t, status: 'completed' } : t
  ));
  updateTask(id, { status: 'completed' }); // Fire and forget
};

// Avoid: Waiting for server
const handleComplete = async (id) => {
  setLoading(true);
  await updateTask(id, { status: 'completed' });
  setLoading(false);
  refetch();
};
```

---

## 3. Spreadsheet Familiarity

**Leverage patterns users already know** from Excel, Google Sheets, and data tools.

### Guidelines

- **Inline editing** - Click to edit, no modal required
- **Keyboard navigation** - Tab, Enter, Escape work as expected
- **Bulk actions** - Select multiple, act on all
- **Sortable columns** - Click header to sort
- **Filterable data** - Quick filters always visible

### Patterns to Emulate

| Tool | Pattern to Borrow |
|------|------------------|
| Excel | Cell-based editing, keyboard shortcuts |
| Notion | Inline property editing, slash commands |
| Linear | Dense lists, keyboard-first, smooth animations |
| Airtable | Views, filters, grouping |

---

## 4. Visual Hierarchy Through Density

**Use density itself to create hierarchy**, not just size and colour.

### Guidelines

- **Primary content: Normal density** - Readable, comfortable
- **Supporting content: High density** - Compact, scannable
- **Metadata: Highest density** - Tiny text, minimal chrome

### Implementation

```tsx
// Primary: Normal text
<p className="text-sm">{description}</p>

// Metadata: Dense
<span className="text-xs text-muted-foreground">{timestamp}</span>

// Data-heavy section
<div data-density="high">
  {/* Content here renders more compact */}
</div>
```

---

## 5. Consistent Spacing Scale

**Use a tight spacing scale** throughout the application.

### Scale

| Token | Value | Use Case |
|-------|-------|----------|
| `gap-1` | 0.25rem (4px) | Between inline elements |
| `gap-2` | 0.5rem (8px) | Between related items |
| `gap-3` | 0.75rem (12px) | Between sections |
| `gap-4` | 1rem (16px) | Major section breaks |
| `p-2` | 0.5rem | Tight padding (buttons, badges) |
| `p-3` | 0.75rem | Standard padding (cards, inputs) |
| `p-4` | 1rem | Comfortable padding (page sections) |

### Avoid

- `gap-6` or larger for standard UI
- `p-8` or larger except for page-level containers
- Inconsistent spacing within the same component type

---

## 6. Border Radius

**Keep corners tight** for a professional, data-focused feel.

```css
--radius: 0.375rem;  /* 6px - Sharp but not harsh */
```

### Guidelines

- Buttons, inputs, cards: Use `--radius` (rounded-md)
- Badges, pills: `rounded-full` is acceptable
- Large containers: Sharper corners (`rounded-sm` or `rounded`)

---

## 7. Colour Usage

**Colour for meaning, not decoration.**

### Status Colours

| Colour | Meaning |
|--------|---------|
| Green | Success, compliant, complete |
| Amber | Warning, expiring, attention needed |
| Red | Error, non-compliant, urgent |
| Blue | Information, links, primary actions |
| Grey | Neutral, disabled, secondary |

### Guidelines

- **Don't over-saturate** - Use muted versions for backgrounds
- **Consistent meaning** - Green always means "good", red always means "bad"
- **Accessible contrast** - Ensure text is readable on coloured backgrounds

---

## 8. Typography

**Legible, compact, scannable.**

### Scale

| Element | Size | Weight |
|---------|------|--------|
| Page title | text-xl (1.25rem) | semibold |
| Section title | text-lg (1.125rem) | semibold |
| Card title | text-base (1rem) | medium |
| Body | text-sm (0.875rem) | normal |
| Caption/meta | text-xs (0.75rem) | normal |

### Guidelines

- **Avoid text-2xl or larger** in application UI
- **Use font-medium sparingly** - Only for emphasis
- **Muted foreground for secondary text** - `text-muted-foreground`

---

## Quick Reference: Compact Component Patterns

### Cards

```tsx
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-base">{title}</CardTitle>
  </CardHeader>
  <CardContent className="pt-0">
    {content}
  </CardContent>
</Card>
```

### Tables

```tsx
<Table className="table-dense">
  <TableBody>
    {items.map(item => (
      <TableRow key={item.id} className="h-8">
        <TableCell className="py-1">{item.name}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Buttons

```tsx
// Prefer size="sm" for most actions
<Button size="sm">Action</Button>

// Use default size sparingly (primary CTAs only)
<Button>Primary Action</Button>
```

### Badges

```tsx
<Badge className="text-[10px] px-1.5 py-0.5">{status}</Badge>
```

---

## Applying These Principles

When building new features:

1. **Start compact** - Begin with tight spacing, loosen only if needed
2. **Test with real data** - Ensure layouts work with long text, many items
3. **Check at different densities** - Does it still work with fewer items?
4. **Keyboard test** - Can users navigate without a mouse?
5. **Compare to spreadsheets** - Would this feel natural in Excel?

---

## Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|------------|
| Large hero sections | Compact headers with essential info |
| Card grids with 3+ columns of fat cards | Dense lists or tables |
| Modals for simple edits | Inline editing |
| Full-page loading spinners | Skeleton states |
| Excessive iconography | Text labels with occasional icons |
| Rounded-full on rectangles | Consistent border-radius |
