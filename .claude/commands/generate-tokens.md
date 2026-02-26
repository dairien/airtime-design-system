---
description: Compile token JSON into CSS custom properties. Runs scripts/generate.js with optional --oklch and --modern-css flags.
argument-hint: --oklch
---

# Generate Tokens

Compile design token JSON files into a CSS custom properties stylesheet.

Run `node scripts/generate.js $ARGUMENTS` from the project root.

This reads `tokens/*.tokens.json` and writes `generated/tokens.css`. Report the output path and token count when done.
