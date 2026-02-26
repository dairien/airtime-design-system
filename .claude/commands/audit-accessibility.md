---
description: Audit an interface for accessibility compliance -- WCAG contrast, focus management, target sizes, motion sensitivity, ARIA, and form usability.
argument-hint: http://localhost:5050
---

# Audit Accessibility

WCAG 2.1/2.2 compliance audit. Tests whether real people with diverse abilities can use this interface.

## Playwright Setup

If the user provides a URL, use it directly. Otherwise, probe common ports: 5050, 5001, 3000, 5173, 8080, 8000.

1. `browser_resize` to **1440 x 900**
2. `browser_navigate` to target URL
3. `browser_snapshot` to verify render

## Audit Checks

### 1. Color Contrast (WCAG 1.4.3 / 1.4.6)

For each text element visible on page:
- Extract computed `color` and `background-color`
- Calculate contrast ratio
- **AA**: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold)
- **AAA**: 7:1 for normal text, 4.5:1 for large text

Use `browser_evaluate` to batch-measure all text elements:
```javascript
() => {
  return [...document.querySelectorAll('*')].filter(el => {
    const text = el.textContent?.trim();
    return text && el.children.length === 0;
  }).map(el => {
    const style = getComputedStyle(el);
    return {
      text: el.textContent.trim().slice(0, 50),
      color: style.color,
      bg: style.backgroundColor,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight
    };
  });
}
```

### 2. Focus Management (WCAG 2.4.7)

- Tab through entire page with `browser_press_key("Tab")`
- Every interactive element must have visible focus indicator
- Focus order must follow visual reading order
- No focus traps (Tab should cycle through, not get stuck)

### 3. Touch Target Size (WCAG 2.5.8)

All interactive elements must be at least 24x24px (AA) or 44x44px (AAA). Use `browser_evaluate` to measure:
```javascript
() => {
  return [...document.querySelectorAll('a, button, input, select, [role="button"]')].map(el => {
    const rect = el.getBoundingClientRect();
    return { tag: el.tagName, text: el.textContent?.trim().slice(0, 30), width: rect.width, height: rect.height };
  });
}
```

### 4. ARIA and Semantics (WCAG 4.1.2)

- All images have `alt` attributes
- Form inputs have associated `<label>` elements
- Buttons have accessible names (text content or `aria-label`)
- Landmarks present (`<nav>`, `<main>`, `<header>`, `<footer>`)
- `lang` attribute on `<html>`
- Page has a `<title>`
- Heading hierarchy (`h1` -> `h2` -> `h3`, no skips)

### 5. Motion and Animation (WCAG 2.3.1 / 2.3.3)

- Check for `prefers-reduced-motion` media query in CSS
- Animations should pause/reduce with reduced motion preference
- No content that flashes more than 3 times per second

### 6. Form Usability

- Labels visible at all times (not placeholder-only)
- Error messages adjacent to fields, not just banner at top
- Required fields marked
- Input type matches expected data (`type="email"`, `type="tel"`)

## Severity Levels

**Critical** -- Blocks access entirely. Missing alt text on functional images. No keyboard access to primary action. Contrast below 3:1.

**Serious** -- Significant barrier. Focus order illogical. Touch targets too small. Missing form labels.

**Moderate** -- Usable but degraded. Focus indicator hard to see. Heading hierarchy skips levels.

**Minor** -- Best practice. Missing `aria-label` on decorative element. Could use more descriptive link text.

## Output

Report organized by WCAG success criterion:

```
## Accessibility Audit Report
### <URL> -- <date>

### Summary
- Critical: N issues
- Serious: N issues
- Moderate: N issues
- Minor: N issues
- WCAG Level: AA / partial AA / below AA

### Issues by Criterion
#### 1.4.3 Contrast (Minimum) -- [PASS/FAIL]
...
```

Leave browser open after audit.
