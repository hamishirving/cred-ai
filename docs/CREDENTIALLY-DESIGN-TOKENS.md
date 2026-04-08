# Credentially Design Tokens

Reference tokens extracted from the MedPassport Doctor Focus Demo (`drfocused-medpassport-demo`, branch `ai-project-documentation`). Use these as the source of truth when aligning cred-ai with the existing Credentially product.

## Colors

### Brand

| Token | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#4444CF` | Primary actions, links, focus rings |
| Primary Blue Light | `#E4E4FE` | Blue tints, selected states |
| Dark Blue | `#3030BC` | Hover/pressed on primary |
| Secondary Purple | `#735EF7` | Secondary accent |

### Neutrals (Grey Scale)

| Token | Hex | Usage |
|-------|-----|-------|
| Grey 10 | `#FCFDFF` | Lightest background |
| Grey 20 | `#F3F5FA` | Light background, table headers |
| Grey 30 | `#ECEEF5` | Borders, dividers |
| Grey 40 | `#8F939C` | Muted text |
| Grey 50 | `#ABAFBF` | Placeholder text |
| Grey 60 | `#6E7391` | Secondary text |
| Grey 70 | `#DFE1E9` | Light borders |
| Grey 75 | `#F8F9FF` | Subtle background |
| Grey 80 | `#F0F0F0` | Disabled background |
| Grey 90 | `#FDFDFD` | Near-white |

### Dark Neutrals (Black Scale)

| Token | Hex | Usage |
|-------|-----|-------|
| Black 70 | `#252222` | Primary text |
| Black 80 | `#393C41` | Headings |
| Black 90 | `#282B31` | Darkest text |

### Semantic: Success (Green)

| Token | Hex | Usage |
|-------|-----|-------|
| Green 10 | `#F4FEF3` | Success background |
| Green 60 | `#00C379` | Success primary |
| Green 70 | `#3DC46A` | Success accent |
| Green 80 | `#248444` | Success dark |
| Green 90 | `#2E9851` | Success hover |

### Semantic: Error (Red)

| Token | Hex | Usage |
|-------|-----|-------|
| Red 10 | `#FFF6F9` | Error background |
| Red 70 | `#F32E65` | Error primary |
| Red 80 | `#D22959` | Error dark |
| Red 90 | `#DA0C46` | Error destructive |

### Semantic: Warning (Yellow)

| Token | Hex | Usage |
|-------|-----|-------|
| Yellow 10 | `#FFFBF4` | Warning background |
| Yellow 20 | `#FFF9EB` | Warning tint |
| Yellow 80 | `#A76502` | Warning dark |
| Yellow 90 | `#C29000` | Warning primary |
| Yellow 100 | `#E6AA00` | Warning accent |

## Typography

### Font Family
- **Primary:** `'Inter', sans-serif`
- **Alternative:** `'GT Walsheim Pro', sans-serif` (rarely used)

### Font Sizes

| Name | Size | Line Height |
|------|------|-------------|
| Extra Small | 12px | 16px |
| Small | 13px | 16px |
| Medium | 15px | 24px |
| Big | 18px | 24px |
| Extra Big | 24px | 32px |

### Font Weights
- Regular: 400
- Medium: 500
- Bold: 700

### Typography Mixins (reference)
- `regularSmall` — 13px / 16px / 400
- `regular` — 18px / 24px / 400
- `mediumSmall` — 13px / 16px / 500
- `medium` — 15px / 24px / 500
- `boldSmall` — 18px / 24px / 700
- `boldRegular` — 18px / 24px / 700
- `bold` — 24px / 32px / 700
- `tableHeader` — 15px / 600 / uppercase + letter-spacing

## Spacing

### Grid
- Base unit: **8px**
- Scale: 8, 12, 16, 24, 32px

### Layout
- Header height: 64px
- Desktop margin: 32px
- Mobile margin: 16px

## Border Radius
- Default (inputs, panels): **5px**
- Buttons (circular): 50%

## Shadows
- Minimal: `0 1px 2px 1px` for hover states
- Light elevation approach throughout

## Breakpoints

| Name | Value |
|------|-------|
| Mobile | max 1024px |
| Tablet | 1024px–1630px |
| Desktop | 1630px+ |

## MUI Theme Reference

These are the key MUI component overrides from the existing product:
- `MuiButton` — padding: 5px 16px
- `MuiOutlinedInput` — padding: 12px
- `MuiFormControl` — min-height: 42px, bottom padding: 6px
- `MuiFormLabel` — 12px size
- `MuiGrid` — 16px gutters

## Notes

- The existing product uses `redesignThemeColors()` SCSS helper as the preferred color accessor
- ~817 hardcoded hex values exist in the codebase (tech debt)
- cred-ai uses Tailwind CSS variables, so these tokens should be mapped into `globals.css` `:root` and the `@theme` block
