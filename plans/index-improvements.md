# Airtime Design System — Index Page Improvements

## Overview
Improvements to the airtime-design-system index.html reference page based on user feedback. Focuses on interactivity, information density, and sidebar cleanup.

## Tasks

### Task 1: Remove Sidebar Stats Section
**Priority:** High
**Complexity:** Low

Remove the `.sidebar-meta` grid containing the three stats (128 tokens, 94 variants, 742 icons) from the sidebar. This includes:
- Delete the `.sidebar-meta` HTML block (lines ~716-729)
- Delete the associated CSS rules: `.sidebar-meta`, `.sidebar-stat`, `.sidebar-stat + .sidebar-stat`, `.sidebar-stat-num`, `.sidebar-stat-label`
- The sidebar should flow directly from the logo to the nav section

### Task 2: Style GitHub Button to Match Theme Toggle
**Priority:** High
**Complexity:** Low

The GitHub link in the sidebar footer should match the theme toggle button style and be stacked below it. Currently there's a theme toggle button in `.sidebar-footer`. Changes:
- Add a GitHub button below the theme toggle using the same button styling (same padding, border, hover state, icon + text layout)
- Both buttons stacked vertically in the footer with a small gap between them
- GitHub button should have a GitHub SVG icon + "GitHub" text label
- Both buttons should use the same CSS class for consistent styling
- The button should open the repo URL in a new tab

### Task 3: Remove Accordions from Token Sections
**Priority:** High
**Complexity:** Medium

Remove the `<details>`/`<summary>` accordion wrappers from these token sections, showing content directly:
- Typography (currently `<details open>`)
- Spacing & Sizing (currently `<details>` closed)
- Radii (currently `<details>` closed)
- Shadows (currently `<details>` closed)
- Borders/Opacity/Z-index/Transitions (currently `<details>` closed)

Keep the Colors section as-is (it's already open by default and the accordion makes sense for its larger content).

For each section:
- Remove the `<details>` and `<summary>` wrapper elements
- Keep the section heading as an `<h3>` or equivalent with the same styling as the summary text
- Keep the `.details-content` inner div content intact
- Ensure the section structure stays consistent (section id, heading, content)

### Task 4: Make Scrollbar Demo Interactive
**Priority:** Medium
**Complexity:** Medium

The scrollbar section currently shows static mockups (divs with fixed width/margin-left). Make the scrollbar thumbs draggable:
- Add mousedown/mousemove/mouseup event listeners to `.scrollbar-thumb` elements
- On mousedown, track the starting X position and thumb's margin-left
- On mousemove, calculate the delta and update margin-left (clamped to 0% through track-width minus thumb-width)
- On mouseup, release the drag
- Add `cursor: grab` on thumb, `cursor: grabbing` during drag
- The thumb width should remain fixed (40% of track), only position changes
- Touch events (touchstart/touchmove/touchend) for mobile support

### Task 5: Icon Section — "See All" Button
**Priority:** High
**Complexity:** Medium

Replace the current limited display (45 featured icons) with a condensed grid + "See All" button:
- Keep the initial view showing the 45 featured icons in a compact grid
- Add a "See All 221 Icons" button below the grid (styled as `.btn-secondary`)
- Clicking "See All" expands the grid to show all 221 unique base icons
- Button text changes to "Show Featured" when expanded, toggling back to the 45
- The expanded view shows icons alphabetically sorted by base name
- Deduplicate by base name (strip `_Fill_16`, `_Stroke_24`, etc. suffixes)
- Search should work across both views (featured and all)

### Task 6: Icon Variant Controls (Fill/Stroke, Size Dropdowns)
**Priority:** High
**Complexity:** High
**Depends on:** Task 5

Add dropdown controls above the icon grid to switch between icon variants:
- **Style dropdown:** "Stroke" / "Fill" (default: Stroke)
- **Size dropdown:** "16px" / "24px" (default: 16px)
- Position the dropdowns in a row next to or below the search input
- When a dropdown changes, re-render all visible icons with the selected variant suffix
  - E.g., selecting "Fill" + "24px" renders `AppIcons.Checkmark_Fill_24()` instead of `AppIcons.Checkmark_Stroke_16()`
- Style dropdowns using Airtime's `.dropdown` or native `<select>` with token-based styling
- If an icon doesn't have the selected variant, show the closest available variant with a subtle indicator
- Update the icon cell preview size: 16px icons render at 16px, 24px icons render at 24px
- The variant state should persist across search/filter operations
- The UI for this should be polished — consider using segmented controls (`.segmented` from controls.css) for Fill/Stroke toggle and a clean select for size
