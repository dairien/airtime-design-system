# Airtime Design System

> A complete, AI-native design system for Claude Code -- 128+ tokens, 94 components, 742 icons, dark/light themes.

![Tokens](https://img.shields.io/badge/tokens-128%2B-79DDE8)
![Components](https://img.shields.io/badge/components-94-79DDE8)
![Icons](https://img.shields.io/badge/icons-742-79DDE8)
![Themes](https://img.shields.io/badge/themes-dark%20%2F%20light-79DDE8)
![License](https://img.shields.io/badge/license-MIT-79DDE8)

## Overview

The Airtime Design System is a complete token-based design system extracted from Airtime's production Figma file and packaged for Claude Code. It provides everything needed to build interfaces that match Airtime's technical, teal-accented visual language.

The system works in two modes: **Apply mode** restyles existing interfaces with Airtime tokens, and **Design mode** generates new interfaces from scratch using the system's constraints and anti-patterns to prevent generic AI output.

All tokens, components, and icons are documented in a single `index.html` contact sheet that serves as both a visual reference and an interactive playground.

## Quick Start

### Reference Mode (no setup required)

Paste this in your Claude Code prompt:

```
Use the Airtime design system from https://github.com/dairien/airtime-design-system
```

Claude Code will read the `CLAUDE.md` file and apply the system's tokens, constraints, and component patterns to your project.

### Local Mode

```bash
git clone https://github.com/dairien/airtime-design-system.git
```

Add this to your project's `CLAUDE.md`:

```markdown
## Design System
Apply the Airtime design system from `../airtime-design-system/`.
Load `CLAUDE.md` from that repo for token values, anti-patterns, and component inventory.
```

Then use any of the 7 skills:

```
/apply-tokens     # Restyle existing UI
/frontend-design  # Generate new interfaces
/audit-ux         # Design critique
```

## Features

- **128+ design tokens** across 9 categories -- colors, typography, spacing, sizing, radii, shadows, borders, opacity, transitions
- **94 component variants** across 7 categories -- buttons, inputs, controls, rows, menus, education, others
- **742 icon variants** (221 unique icons) -- Fill/Stroke styles at 16px/24px, loaded via `AppIcons` JS module
- **7 Claude Code skills** -- apply, generate, audit, convert
- **Dark/light theme** support with `localStorage` persistence and CSS custom property switching
- **OKLCH color space** support via `--oklch` flag for modern browsers
- **Anti-pattern enforcement** -- 8 rules that prevent generic AI output (no Inter font, no indigo gradients, no invented accents, no uniform rounding)
- **Single-page contact sheet** -- all tokens, components, and icons viewable in one `index.html`

## Skills

| Skill | Direction | Description |
|-------|-----------|-------------|
| `/apply-tokens` | Tokens -> Interface | Restyle existing UI with Airtime tokens |
| `/frontend-design` | Concept -> HTML | Generate new interfaces in Airtime's visual language |
| `/generate-tokens` | JSON -> CSS | Compile token JSON into CSS custom properties |
| `/figma-to-tokens` | Figma -> Tokens | Extract updated tokens from the Figma source |
| `/audit-ux` | Interface -> Critique | Design critique against Airtime standards |
| `/audit-accessibility` | Interface -> Compliance | WCAG 2.1/2.2 compliance check |
| `/audit-design-system` | Codebase -> Report | Token coverage, hardcoded values, unused tokens |

## Token System

9 token categories organized in legacy JSON format:

| Category | File | Tokens |
|----------|------|--------|
| Colors | `tokens/colors.json` | 27 -- 10 dark, 10 light, 7 shared (modeless) |
| Typography | `tokens/typography.json` | 7 composite styles, 4 font weights |
| Sizing | `tokens/sizing.json` | 17 size tokens (0-80px) |
| Spacing | `tokens/sizing.json` | 10 space tokens (0-40px) |
| Radii | `tokens/radii.json` | 17 radius tokens (0-40px + 9999px pill) |
| Shadows | `tokens/shadows.json` | 3 shadow levels + 3 blur levels |
| Borders | `tokens/borders.json` | 3 widths (none/thin/medium) + solid style |
| Opacity | `tokens/opacity.json` | 9 levels (0% to 100%) |
| Transitions | `tokens/transitions.json` | 3 durations + 3 easing curves |
| Z-index | `tokens/z-index.json` | 6 stacking layers (base through tooltip) |

### Key Design Decisions

- **Single accent color**: Teal (`#79DDE8` dark / `#1A7580` light) -- no secondary accents
- **System font**: `-apple-system` (SF Pro) -- no web font loading
- **2px base unit**: Spacing and sizing use a 2px grid with `x10` naming (`size-10` = 4px)
- **17 radius values**: From sharp (`0`) to pill (`9999px`), matched to element role
- **3 background layers**: primary/secondary/tertiary for depth without shadows

## Figma Integration

Source Figma file key: `4ycNiPIJ2oXZVaCwaECbUa` (private)

Use `/figma-to-tokens` to re-extract tokens when the Figma file is updated. The extraction process reads Figma variables and component properties, then writes to the `tokens/` directory in legacy JSON format.

## Development

### Token Regeneration

From the `design-toolkit` directory:

```bash
# Standard CSS output
node scripts/generate.js airtime

# With OKLCH color space (Chrome 111+, Safari 16.4+, Firefox 113+)
node scripts/generate.js airtime --oklch

# With modern CSS features (@property, color-mix, light-dark)
node scripts/generate.js airtime --oklch --modern-css
```

### File Structure

```
airtime-design-system/
  index.html              # Unified contact sheet (tokens + components + icons)
  CLAUDE.md               # AI instructions and constraints
  README.md               # This file
  generated/
    tokens.css             # Compiled CSS custom properties
    icons.js               # 742 SVG icon functions
    .design-rules.json     # Anti-pattern rules for AI generation
  components/
    button.css             # Buttons (6 variants)
    input.css              # Inputs (13 variants)
    controls.css           # Controls (21 variants)
    rows.css               # Rows (12 variants)
    menus.css              # Menus (9 variants)
    education.css          # Education (7 variants)
    others.css             # Others (26 variants)
  tokens/
    colors.json            # Color tokens (dark/light/shared)
    typography.json        # Typography tokens
    sizing.json            # Size and space tokens
    radii.json             # Border radius tokens
    shadows.json           # Shadow and blur tokens
    borders.json           # Border width and style tokens
    opacity.json           # Opacity scale tokens
    transitions.json       # Duration and easing tokens
    z-index.json           # Stacking order tokens
  assets/
    logo.svg               # Airtime wordmark (currentColor)
  scripts/
    generate-tokens.js     # Token compiler
```

## License

MIT
