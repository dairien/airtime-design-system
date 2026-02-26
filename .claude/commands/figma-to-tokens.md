---
description: Extract or update design tokens from the Airtime Figma file into DTCG JSON and regenerate CSS.
argument-hint: https://figma.com/design/FILE_KEY/file?node-id=6-2445
---

# Figma to Tokens

Extract design tokens from Figma frames into DTCG `.tokens.json` files, then regenerate `generated/tokens.css`.

## Prerequisites

1. **Figma MCP must be connected**:
   ```bash
   claude mcp add --transport http figma https://mcp.figma.com/mcp
   ```
2. **Developer mode** must be enabled in Figma (`Shift+D`)

## Input

The user provides a **Figma URL** containing the file key and node ID:
- `https://figma.com/design/{fileKey}/{fileName}?node-id={nodeId}`

## Workflow

### Step 1: Detect Figma Variables

Call `get_variable_defs` on the file to check for Variables.

- **Variables exist** -> DTCG extraction (preferred)
- **No Variables** -> visual frame extraction (fallback)

### Step 2: Extract Tokens

**DTCG Path (Variables available):**
1. Map each Figma variable collection to a token group
2. Convert Figma types to DTCG `$type` (COLOR -> "color", FLOAT -> "dimension"/"number", etc.)
3. Map Figma modes to `$extensions.mode` entries
4. Use `get_design_context` to discover visual-only tokens not in Variables

**Legacy Path (no Variables):**
1. Use `get_design_context` for structure and text labels
2. Use `get_variable_defs` on specific nodes for bindings
3. Extract values manually from frame inspection

### Step 3: Write Token Files

Write `.tokens.json` files to `tokens/`, one per category:
- `tokens/colors.tokens.json`
- `tokens/typography.tokens.json`
- `tokens/sizing.tokens.json`
- `tokens/radii.tokens.json`
- `tokens/shadows.tokens.json`
- `tokens/borders.tokens.json`
- `tokens/opacity.tokens.json`
- `tokens/z-index.tokens.json`
- `tokens/transitions.tokens.json`

**Important naming convention**: The generator uses the last path segment as the CSS variable name. Leaf keys must include the full CSS name:
- Sizing: `"size-0"`, `"size-05"`, `"space-20"` (not just `"0"`, `"05"`, `"20"`)
- Radii: `"radius-0"`, `"radius-15"` (not just `"0"`, `"15"`)
- Z-index: `"z-base"`, `"z-modal"` (not just `"base"`, `"modal"`)
- Transitions: `"duration-fast"`, `"easing-default"` (not just `"fast"`, `"default"`)

### Step 4: Regenerate CSS

```bash
node scripts/generate.js
```

### Step 5: Verify

Compare the new `generated/tokens.css` against the previous version. Report:
- Tokens added
- Tokens removed
- Values changed
- Total token count

### Step 6: Component Extraction (optional)

If the user requests component extraction, scan the Figma file for component sets and generate CSS to `components/`. Follow the component extraction process from the toolkit's `/figma-to-tokens` skill.

## DTCG Format Reference

```json
{
  "color": {
    "background": {
      "primary": {
        "dark": {
          "$value": "#0A0D0E",
          "$type": "color",
          "$extensions": { "mode": "dark" }
        },
        "light": {
          "$value": "#F5F5F5",
          "$type": "color",
          "$extensions": { "mode": "light" }
        }
      }
    }
  }
}
```

## Type Mapping

| Figma Type | DTCG `$type` | When |
|------------|-------------|------|
| COLOR | `"color"` | Always |
| FLOAT | `"dimension"` | Spacing, sizing, radii, border-width, font-size |
| FLOAT | `"number"` | Opacity, z-index, font-weight |
| STRING | `"fontFamily"` | Font families |
