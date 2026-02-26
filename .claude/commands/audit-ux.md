---
description: Design critique for interface quality -- visual hierarchy, spatial rhythm, typography, consistency, interaction patterns, and user trust. Includes accessibility audit.
argument-hint: http://localhost:5050
---

# Audit UX

Design critique, not compliance report. Finds the structural problems -- where the visual hierarchy fights itself, where users can't find the primary action, where spacing creates noise instead of rhythm.

## Before You Audit

Answer four questions:
1. **Who is using this, and what are they trying to accomplish?**
2. **What is the single most important thing this interface should make easy?**
3. **What is the interface's emotional register?**
4. **What is the information density?**

## Playwright Setup

If the user provides a URL, use it directly. Otherwise, probe common ports: 5050, 5001, 3000, 5173, 8080, 8000.

1. `browser_resize` to **1440 x 900**
2. `browser_navigate` to target URL
3. `browser_snapshot` to verify render

### Automated Interaction Tests

- **Focus order:** Tab through elements, verify visual reading order
- **Hover states:** Hover buttons/links/cards, confirm visible feedback
- **Keyboard navigation:** Enter/Space on buttons, arrows in dropdowns
- **Form validation:** Fill invalid data, check inline errors

Leave browser open after audit.

## Evaluation Dimensions

### Visual Hierarchy
Can you identify primary, secondary, tertiary content at a glance? Is the primary action the most prominent element? Does spacing increase with hierarchy?

### Spatial Rhythm
Uses a consistent system (4px or 8px base). Same conceptual gap = same size everywhere.

### Typography
Body text 16px minimum. Line length 50-75 characters. 1-2 typefaces max. Weight used semantically.

### Consistency & Patterns
Similar actions look the same. Capitalization consistent. Icon styles uniform. Terminology consistent.

### Interaction Quality
Buttons show immediate response. Similar interactions behave the same. Destructive actions are guarded. Affordances are visible without hovering.

### Responsiveness
Test at 320px, 768px, 1440px. Content reflows gracefully. No horizontal scrollbars. Touch targets 44px minimum.

## Severity Levels

**Critical** -- User will fail primary task. Primary action invisible. Form clears input on error.

**Improvement** -- User succeeds but feels friction. Hierarchy unclear. Spacing inconsistent. Labels ambiguous.

**Polish** -- Designer notices; user feels it as "cheap" vs "polished." Baseline alignment. Consistent letter-spacing.

## Output

For each finding:
- **What:** The specific element or area
- **Issue:** The structural problem, not just symptom
- **Why:** Impact on task completion, comprehension, or trust
- **Fix:** Specific remediation with token names or CSS values

## Reference System

This is the Airtime design system. All findings should reference Airtime tokens:
- Colors: `--color-background-*`, `--color-content-*`, `--color-accent-teal`
- Spacing: `--space-10` through `--space-100`
- Typography: `--font-size-*`, `--line-height-*`, `--font-weight-*`
- Radii: `--radius-*`
- Shadows: `--shadow-small`, `--shadow-medium`, `--shadow-large`

After UX critique, run `/audit-accessibility` for full compliance check.
