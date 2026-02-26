---
description: Apply Airtime design tokens to an existing interface. Creates a variation with Airtime's visual language applied.
argument-hint: path/to/project
---

# Apply Tokens

Apply the Airtime design system to an existing project by creating a variation that uses Airtime's `tokens.css` and component CSS.

## How It Works

Run `/apply-tokens <path>` pointing to any project folder that contains an `index.html`. Claude will:

1. Confirm the target project directory
2. Create a `variations/airtime/` directory inside the target project
3. Clone the project's `index.html` into the variation folder
4. Link Airtime's `generated/tokens.css` and component CSS files
5. Replace hardcoded values with token references
6. Verify the result in a browser

## Workflow

### Step 1: Confirm the Project

Before doing anything, confirm with the user:
- **Target directory**: the `$ARGUMENTS` value (must contain an `index.html`)
- **Token source**: this repo's `generated/tokens.css`

Show the user what will happen and get confirmation before proceeding.

### Step 2: Create the Variation

```bash
mkdir -p <target>/variations/airtime/
cp <target>/index.html <target>/variations/airtime/index.html
```

### Step 3: Link Shared Assets

Check what asset directories the target project uses:
```bash
grep -oE '(src|href)="[^"]*"' <target>/index.html | grep -v 'http' | head -20
```

For each referenced directory (e.g., `files/`, `assets/`, `images/`):
```bash
ln -s ../../<dir> <target>/variations/airtime/<dir>
```

### Step 4: Link Token CSS

Copy or symlink `generated/tokens.css` from this repo into the variation and update the HTML `<link>` tag:

```html
<link rel="stylesheet" href="tokens.css">
```

### Step 4b: Link Component CSS

Symlink each component CSS file into the variation:

```bash
mkdir -p <target>/variations/airtime/components/
```

For each file in this repo's `components/` directory, create a symlink. Add `<link>` tags in the variation HTML after `tokens.css`, respecting dependency order:

```html
<!-- Standalone components first -->
<link rel="stylesheet" href="components/button.css">
<link rel="stylesheet" href="components/input.css">
<link rel="stylesheet" href="components/controls.css">
<link rel="stylesheet" href="components/rows.css">
<link rel="stylesheet" href="components/education.css">
<link rel="stylesheet" href="components/others.css">
<!-- Dependent components last (menus.css requires rows.css) -->
<link rel="stylesheet" href="components/menus.css">
```

Check class name compatibility between the variation HTML and the component CSS. If classes don't match, add an HTML comment documenting the mapping.

### Step 5: Replace System-Specific Token Names

Search for token names specific to other systems and replace with Airtime equivalents:
- Any accent color name -> `--color-accent-teal`
- Any highlight name -> `--color-highlight-primary` / `--color-highlight-secondary`

### Step 6: Replace Hardcoded Color Values

```bash
grep -nE 'rgba?\([^)]+\)' <target>/variations/airtime/index.html | head -20
grep -nE '#[0-9A-Fa-f]{6,8}' <target>/variations/airtime/index.html | head -20
```

Map each to the closest Airtime token. Use the token quick reference in CLAUDE.md.

### Step 7: Update Page Title

```html
<title>Project Name — Airtime</title>
```

### Step 8: Visual Verification

1. Open the variation in Playwright
2. Check console for 404s
3. Take a screenshot
4. Verify: correct dark background, teal accent on interactive elements, text readability, all images loading

## Token-to-CSS Verification

After applying tokens, search for leftover hardcoded values:
- `grep -E '#[0-9A-Fa-f]{3,8}' <target>/variations/airtime/index.html`
- `grep -E 'rgba?\(' <target>/variations/airtime/index.html`

Every match should either be replaced with a `var(--token-name)` reference or confirmed as intentionally hardcoded (e.g., SVG fills, data URIs).

## Theme Testing

- Toggle `.dark`/`.light` class on `<html>` via Playwright `browser_evaluate`
- Screenshot both themes
- Verify no missing theme variables

## Rules

- **Always confirm the project** before making changes
- **Never modify the original `index.html`** -- only work in `variations/`
- **All visual values must reference CSS custom properties** -- no hardcoded colors
- **Symlink assets, don't copy** -- keeps variations lightweight and in sync
