---
description: Audit a codebase for Airtime design system health -- token coverage, hardcoded values, unused tokens, near-duplicates, overrides, and component adoption.
argument-hint: path/to/project
---

# Design System Audit

Measure the gap between the Airtime design system and how it's actually used in a codebase. Reports token coverage, hardcoded values, unused tokens, near-duplicates, component adoption, and a prioritized refactoring plan.

## Input

**Directory** (required): The directory to audit. Must contain HTML/CSS files that consume Airtime tokens.

Parse `$ARGUMENTS` as the target directory path. If empty, ask the user for the path.

## Output

A structured report with these sections:

```
## Design System Health Report
### <directory> -- audited against Airtime Design System
### <date>

### Summary
- Token Coverage: XX% (NNN/NNN values use tokens)
- Hardcoded Values: NNN across NN files
- Unused Tokens: NN defined but never referenced
- Near-Duplicates: NN value clusters that should consolidate
- Token Overrides: NN !important or inline style overrides
- Component Adoption: XX% (N/N components used)

### 1. Hardcoded Values
### 2. Token Coverage Breakdown
### 3. Unused Tokens
### 4. Near-Duplicate Values
### 5. Token Overrides
### 6. Component Adoption
### 7. Refactoring Plan
```

## Audit Process

### Step 1: Gather Context

Identify all files to audit:
```
Glob: <directory>/**/*.css, <directory>/**/*.html, <directory>/**/*.js
```

Exclude `node_modules/`, `dist/`, `.git/`, and `generated/tokens.css` itself.

Read this repo's `generated/tokens.css` and parse every custom property definition. Build a lookup table:
```
--color-background-primary: #0A0D0E
--color-content-primary: #FFFFFF
--space-100: 40px
...
```

Also read `tokens/*.tokens.json` for the full semantic picture.

### Step 2: Find Hardcoded Values

Grep for hardcoded design values:

**Colors:** `#[0-9a-fA-F]{3,8}\b`, `rgba?\s*\(`, `hsla?\s*\(`
**Typography:** `font-size:\s*[^v;]`, `line-height:\s*[^v;]`, `font-weight:\s*[^v;]`
**Spacing:** `margin[^:]*:\s*[^v;]`, `padding[^:]*:\s*[^v;]`, `gap\s*:\s*[^v;]`

Filter out false positives: `0`, `auto`, `inherit`, `none`, `transparent`, `currentColor`, percentages, `1px` borders, values in `:root {}` definitions, `@font-face`, comments, `@media` queries.

### Step 3: Calculate Token Coverage

Count `var(--` usages vs hardcoded values. Break down by category (colors, typography, spacing, sizing) and by file.

### Step 4: Find Unused Tokens

For each token in `generated/tokens.css`, grep the target directory. Any token with zero references is unused.

### Step 5: Detect Near-Duplicates

**Colors:** RGB distance < 15 between any two values.
**Spacing:** Values within 2px of each other.

### Step 6: Report Overrides

Find `!important` on design properties, inline styles, and local token re-definitions outside `tokens.css`.

### Step 6b: Component Adoption

Check whether the target codebase imports Airtime component CSS (`components/*.css`).

**If imported:** Audit token coverage within component files and state completeness (`:hover`, `:focus`, `:disabled`).

**If not imported:** Count custom implementations that serve the same purpose as Airtime components. Report missed opportunities.

### Step 7: Generate Refactoring Plan

Prioritized list:
- **Priority 1:** Hardcoded values appearing 5+ times (bulk replacements)
- **Priority 2:** Near-duplicate consolidation
- **Priority 3:** Override cleanup and dead token removal
- **Priority 4:** One-off hardcoded values for review

### Step 8: Health Grade

```
90%+ coverage, <10% unused, 0 overrides, 80%+ adoption  -> A
75-89% coverage, <20% unused, <5 overrides, 50%+ adoption -> B
50-74% coverage, <30% unused, <10 overrides               -> C
Below 50% coverage                                         -> D
```
