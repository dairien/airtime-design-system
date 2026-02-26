# V3 Merge Plan: Consolidate into Single Source of Truth

**Date**: 2026-02-25
**Comparing**: `airtime-design-system` (current) vs `airtime-design-system-v3`

---

## Context

Both repos share **identical token values and design language** — same 128+ tokens, same 7 component categories, same teal accent (`#79DDE8` dark / `#1A7580` light). The differences are structural and tooling-related. The goal is to make this repo (`airtime-design-system`) the single source of truth moving forward.

---

## What V3 Has That's Better/Newer

| Area | Detail |
|------|--------|
| **Accessibility** | `button.css` adds `:focus-visible` keyboard focus ring (missing in current) |
| **Individual SVG icons** | `icons/` directory with 744 standalone `.svg` files — useful for non-JS contexts |
| **Figma source exports** | `variables/` directory with raw Figma DTCG exports (Dark, Light, Sizing, Typography) |
| **Gallery architecture** | Sidebar + iframe pattern — tokens and components viewable independently |
| **Iframe embed detection** | `contact-sheet.html` hides its sidebar when embedded (prevents flash) |
| **README** | 558 lines with HTML code examples for every component variant |
| **Simpler token JSON** | Flat key-value format (easier to read/edit by hand) |

## What This Repo Has That V3 Lacks

| Area | Detail |
|------|--------|
| **Claude Code skills** | 7 skill definitions in `.claude/commands/` (`/apply-tokens`, `/audit-ux`, `/figma-to-tokens`, etc.) |
| **Anti-pattern rules** | `generated/.design-rules.json` (1038 lines) for AI generation guardrails |
| **Advanced token compiler** | `scripts/generate.js` (1559 lines) with OKLCH color conversion, `--modern-css` flag, format auto-detection |
| **Rules generator** | `scripts/generate-rules.js` for creating `.design-rules.json` |
| **Rich CLAUDE.md** | 155 lines with token quick-reference table, anti-patterns, component inventory, design philosophy |
| **Task Master config** | `.taskmaster/config.json` for project management |
| **Unified gallery** | Single `index.html` with tokens + components + icon browser all in one page |

## Functionally Identical

- All 33 color token values
- All spacing, sizing, radii, shadow, border, opacity, transition, z-index tokens
- 6 of 7 component CSS files (identical CSS)
- `generated/icons.js` (same 742 icon functions)
- `assets/logo.svg`

---

## Proposed Plan

### Phase 1 — Pull V3 Improvements

1. **Port the `:focus-visible` fix** from V3's `button.css` (accessibility improvement)
2. **Add `icons/` directory** — copy 744 individual SVG files from V3
3. **Add `variables/` directory** — copy raw Figma exports from V3
4. **Adopt V3's `index.html` + `contact-sheet.html` architecture** — the sidebar+iframe pattern is better UX. Replace both HTML files.
5. **Merge V3's README** — the 558-line version with HTML code examples is far more useful for developers

### Phase 2 — Keep This Repo's Strengths

6. Keep `.claude/commands/` skills (V3 has nothing equivalent)
7. Keep `generated/.design-rules.json` and `scripts/generate-rules.js`
8. Keep the advanced `scripts/generate.js` (OKLCH, modern CSS)
9. Keep the rich `CLAUDE.md` (update if needed)
10. Keep `.taskmaster/` config

### Phase 3 — Decide on Token Format

11. Resolve token JSON format (see questions below)

---

## Decisions (2026-02-25)

1. **Token JSON format**: **(c) Keep both** — DTCG `.tokens.json` files for standards compliance + simpler `.json` files for hand-editing. Both coexist in `tokens/`.
2. **Gallery HTML**: **(b) Keep current** — unified `index.html` with integrated icon browser. Only port the `:focus-visible` fix.
3. **Individual SVG icons**: **Include both** — `icons/` directory (744 SVGs) + `generated/icons.js` (JS functions).
4. **Figma `variables/` directory**: **Skip** — intermediate development files, not needed.
5. **Git history**: **No** — clean copy of files only, no V3 history.
6. **Nothing else to exclude**. V3 repo can be deleted after merge.

## Completed Actions

- [x] Ported `:focus-visible` keyboard focus ring to `components/button.css`
- [x] Copied 742 individual SVG icons to `icons/` directory
- [x] Copied 9 simpler token JSON files alongside existing DTCG files in `tokens/`
- [ ] ~~Add `variables/` directory~~ — Skipped (intermediate files)
- [ ] ~~Replace HTML files~~ — Skipped (keeping current gallery)
- [ ] ~~Replace README~~ — Skipped (keeping current)

## Post-Merge

- Delete `airtime-design-system-v3` repo once confirmed
