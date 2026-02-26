# Airtime Design System

Technical, clean design system with teal accent, extracted from Airtime's Figma file. Dark theme default, SF Pro system font stack, 128+ tokens across 9 categories, 94 component variants across 7 categories, 742 icon variants. Designed for AI-native workflows in Claude Code.

## Two Modes

### Apply Mode
Restyle an existing interface with Airtime tokens. Use `/apply-tokens` to map your current CSS to Airtime custom properties. Every color, spacing, radius, and typography value gets replaced with the corresponding token.

### Design Mode
Generate new interfaces from scratch using Airtime's visual language. Use `/frontend-design` with this CLAUDE.md loaded to constrain output to the Airtime palette, spacing scale, and component patterns.

## Token Quick Reference

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--color-background-primary` | `#0A0D0E` | `#F5F5F5` | Page backgrounds, main content |
| `--color-background-secondary` | `#12181A` | `#FFFFFF` | Sidebars, cards, inputs |
| `--color-background-tertiary` | `#1B2326` | `#EBEBEB` | Code blocks, hover states |
| `--color-content-primary` | `#FFFFFF` | `#000E14` | Headings, primary text |
| `--color-content-secondary` | `#D2D5D6` | `#383D3D` | Descriptions, labels |
| `--color-content-tertiary` | `#B0B1B2` | `#646666` | Placeholders, disabled |
| `--color-highlight-primary` | `#FFFFFF14` | `#00000014` | Borders, dividers |
| `--color-highlight-secondary` | `#FFFFFF29` | `#0000000A` | Hover backgrounds |
| `--color-accent-teal` | `#79DDE8` | `#1A7580` | Links, active states, focus |
| `--color-accent-destructive` | `#FF6D4C` | `#D6402F` | Errors, destructive actions |
| `--color-modeless-teal` | `#79DDE8` | `#79DDE8` | Brand elements (theme-independent) |
| `--color-modeless-white` | `#FFFFFF` | `#FFFFFF` | Text on dark/colored backgrounds |
| `--color-modeless-black` | `#000000` | `#000000` | Text on light backgrounds |
| `--color-modeless-overlay` | `#00000080` | `#00000080` | Modal backdrop |
| `--font-size-heading-large` | 16px / 24px / 700 | -- | Large headings |
| `--font-size-heading-medium` | 14px / 20px / 600 | -- | Medium headings |
| `--font-size-heading-small` | 12px / 16px / 600 | -- | Small headings |
| `--font-size-body-large` | 14px / 20px / 400 | -- | Large body text |
| `--font-size-body-medium` | 12px / 16px / 400 | -- | Default body text |
| `--font-size-body-small` | 11px / 16px / 400 | -- | Small labels |
| `--space-10` | 4px | -- | Tight gaps |
| `--space-15` | 6px | -- | Inline padding |
| `--space-20` | 8px | -- | Standard padding |
| `--space-30` | 12px | -- | Section gaps |
| `--space-40` | 16px | -- | Container padding |
| `--space-60` | 24px | -- | Large gaps |
| `--radius-15` | 6px | -- | Buttons, inputs |
| `--radius-20` | 8px | -- | Cards |
| `--radius-35` | 14px | -- | Menus |
| `--radius-9999` | pill | -- | Badges, avatars |
| `--shadow-small` | 0 1px 3px | -- | Buttons, dropdowns |
| `--shadow-medium` | 0 4px 12px | -- | Cards, popovers |
| `--shadow-large` | 0 8px 24px | -- | Modals, dialogs |

## Anti-Patterns

These constraints prevent generic AI-generated output. Violating any is a critical error.

1. **No generic fonts.** Do not use Inter, Open Sans, Lato, Poppins, or Montserrat. This system uses `-apple-system` (SF Pro).
2. **No indigo/purple gradients.** Do not use `#6366f1`, `#8b5cf6`, `#7c3aed`, or any purple-to-blue gradient. These are the most common AI-generated default colors.
3. **No invented accent colors.** Only use `accent-teal` (`#79DDE8` dark, `#1A7580` light). Do not introduce new brand colors.
4. **No uniform border-radius.** This system has 17 distinct radius values. Do not apply `8px` to everything.
5. **No decorative gradients.** No gradients unless explicitly defined in tokens.
6. **No excessive rounding.** Match radius to element size and role using the radius scale.
7. **Use defined spacing only.** All padding, margin, and gap values must come from spacing tokens. No arbitrary values like `15px` or `22px`.
8. **No color invention.** Every color must come from a defined token. No hex values outside the palette.

## Component Inventory

94 total variants across 7 categories:

| Category | Variants | File | Key Classes |
|----------|----------|------|-------------|
| **Buttons** | 6 | `components/button.css` | `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-destructive`, `.btn-modeless`, `.btn-outline`, `.btn-icon-only` |
| **Inputs** | 13 | `components/input.css` | `.input`, `.input-lg`, `.input-error`, `.input-no-fill`, `.input-wrapper`, `.input-bare`, `.input-split` |
| **Controls** | 21 | `components/controls.css` | `.segmented`, `.checkbox`, `.radio`, `.slider`, `.progress`, `.loader`, `.dropdown` |
| **Rows** | 12 | `components/rows.css` | `.row`, `.row-destructive`, `.row-thumbnail`, `.row-account` |
| **Menus** | 9 | `components/menus.css` | `.menu`, `.menu-thumbnail`, `.menu-account`, `.menu-scrollable` |
| **Education** | 7 | `components/education.css` | `.coach-mark`, `.tooltip` |
| **Others** | 26 | `components/others.css` | `.badge`, `.divider`, `.scrollbar`, `.color-picker`, `.swatches` |

## Skills

| Skill | Direction | Description |
|-------|-----------|-------------|
| `/apply-tokens` | Tokens -> Interface | Restyle existing UI with Airtime tokens |
| `/frontend-design` | Concept -> HTML | Generate new interfaces in Airtime's visual language |
| `/generate-tokens` | JSON -> CSS | Compile token JSON into CSS custom properties |
| `/figma-to-tokens` | Figma -> Tokens | Extract tokens from the Airtime Figma file |
| `/audit-ux` | Interface -> Critique | Design critique against Airtime standards |
| `/audit-accessibility` | Interface -> Compliance | WCAG 2.1/2.2 compliance check |
| `/audit-design-system` | Codebase -> Report | Token coverage, hardcoded values, unused tokens |

## File Structure

```
airtime-design-system/
  index.html                 # Unified contact sheet
  CLAUDE.md                  # This file (AI instructions)
  README.md                  # Project documentation
  generated/
    tokens.css               # Compiled CSS custom properties
    icons.js                 # 742 SVG icon functions (AppIcons object)
    .design-rules.json       # Anti-pattern rules for AI generation
  components/
    button.css               # 6 variants (primary, secondary, destructive, modeless, outline, icon-only)
    input.css                # 13 variants (default, large, error, no-fill, wrapper, split)
    controls.css             # 21 variants (segmented, checkbox, radio, slider, progress, loader, dropdown)
    rows.css                 # 12 variants (default, destructive, thumbnail, account)
    menus.css                # 9 variants (default, thumbnail, account, scrollable, positional)
    education.css            # 7 variants (coach-mark with 8 arrow positions, tooltip)
    others.css               # 26 variants (badge, divider, scrollbar, color-picker, swatches)
  tokens/
    colors.tokens.json       # 27 color tokens (dark/light/shared)
    typography.tokens.json   # 7 composite styles, 4 weights, SF Pro font stack
    sizing.tokens.json       # 17 size tokens + 10 space tokens
    radii.tokens.json        # 17 radius tokens (0-40px + 9999px pill)
    shadows.tokens.json      # 3 shadow levels + 3 blur levels
    borders.tokens.json      # 3 border widths + solid style
    opacity.tokens.json      # 9 opacity levels (0-100%)
    transitions.tokens.json  # 3 durations + 3 easing curves
    z-index.tokens.json      # 6 stacking layers (0-500)
  assets/
    logo.svg                 # Airtime wordmark (currentColor)
  scripts/
    generate-tokens.js       # Token compiler (wraps toolkit generate.js)
```

## Token Pipeline

Tokens are stored in **DTCG 2025.10 format** (`tokens/*.tokens.json`). Each file uses `$value`, `$type`, and `$extensions` fields per the W3C Design Tokens Community Group specification. Color tokens use `$extensions.mode` for dark/light theming. Typography, sizing, and other categories are theme-independent.

To regenerate CSS from tokens:

```bash
# Standard generation
node scripts/generate.js

# With OKLCH color space
node scripts/generate.js --oklch

# With modern CSS features
node scripts/generate.js --oklch --modern-css
```

This reads `tokens/*.tokens.json` and writes `generated/tokens.css` with CSS custom properties organized by theme (`:root` for shared, `.dark`/`.light` for themed, and `@media (prefers-color-scheme)` fallbacks).

## Design Philosophy

Airtime's visual language is **technical and precise** -- a desktop application UI system, not a marketing site. Key characteristics:

- **Dark-first**: Dark theme is the default; light theme is secondary
- **Teal accent**: Single accent color (`#79DDE8` dark / `#1A7580` light) for all interactive elements
- **System font**: SF Pro via `-apple-system` stack -- no custom web fonts to load
- **Compact scale**: Typography maxes out at 16px -- this is a tool UI, not a display typeface showcase
- **Dense spacing**: 2px base unit with tight spacing between elements, reflecting desktop application density
- **Layered surfaces**: Three background levels (primary/secondary/tertiary) create depth without shadows
- **Minimal decoration**: No gradients, no decorative borders, no ornamental elements. Color and spacing do the work.
