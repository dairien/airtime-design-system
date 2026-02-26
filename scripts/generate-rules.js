#!/usr/bin/env node

/**
 * Airtime Design System — Design Rules Generation Script
 * Reads token files and generates .design-rules.json with usage constraints.
 *
 * Usage: node scripts/generate-rules.js
 *
 * Reads from: ./tokens/*.json
 * Writes to:  ./generated/.design-rules.json
 */

const fs = require('fs');
const path = require('path');

// Standalone: hardcoded paths
const PROJECT_ROOT = path.join(__dirname, '..');
const TOKENS_DIR = path.join(PROJECT_ROOT, 'tokens');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, '.design-rules.json');

if (!fs.existsSync(TOKENS_DIR)) {
  console.error(`Error: tokens directory not found at ${TOKENS_DIR}`);
  process.exit(1);
}

// --- Helpers ---

function loadJSON(filename) {
  const filepath = path.join(TOKENS_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  const raw = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  const { _meta, ...data } = raw;
  return { data, meta: _meta || {} };
}

function pxVal(n) {
  return n === 0 ? '0' : `${n}px`;
}

/**
 * Extract the primary font family name from a font stack string.
 * e.g. "'SF Pro Display', 'Helvetica Neue', ..." => "SF Pro Display"
 */
function primaryFontName(stack) {
  if (!stack) return null;
  const first = stack.split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, '');
}

/**
 * Detect the "default" fonts that signal generic AI output.
 * Returns names that should NOT be substituted for the system's actual fonts.
 */
function getGenericFonts() {
  return ['Inter', 'Arial', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat'];
}

// --- Rule generators ---

function generateColorRules() {
  const result = loadJSON('colors.json');
  if (!result) return null;
  const { data, meta } = result;

  const tokenUsage = {};
  const colorGuidelines = [];

  // Scope matrix from _meta (if present)
  const scope = meta.scope || {};

  // Background tokens
  const bgRoles = {
    'background-primary': 'Use for primary page backgrounds, main content areas, cards, and modals',
    'background-secondary': 'Use for secondary surfaces — sidebars, nested cards, alternate rows, input fields',
    'background-tertiary': 'Use for tertiary surfaces — code blocks, badges, subtle highlights, hover states on secondary surfaces'
  };

  // Content tokens
  const contentRoles = {
    'content-primary': 'Use for primary text, headings, and high-emphasis icons',
    'content-secondary': 'Use for secondary text, descriptions, labels, and medium-emphasis icons',
    'content-tertiary': 'Use for tertiary text, placeholders, disabled text, and low-emphasis icons'
  };

  // Highlight tokens
  const highlightRoles = {
    'highlight-primary': 'Use for borders, dividers, and subtle separators between surfaces',
    'highlight-secondary': 'Use for hover/focus backgrounds on interactive elements, and lighter dividers'
  };

  // Build token usage from what actually exists in the system
  const allThemed = { ...(data.dark || {}), ...(data.light || {}) };

  for (const key of Object.keys(allThemed)) {
    if (bgRoles[key]) {
      tokenUsage[`color-${key}`] = bgRoles[key];
    } else if (contentRoles[key]) {
      tokenUsage[`color-${key}`] = contentRoles[key];
    } else if (highlightRoles[key]) {
      tokenUsage[`color-${key}`] = highlightRoles[key];
    } else if (key.startsWith('accent-')) {
      const role = key.replace('accent-', '');
      if (role === 'destructive') {
        tokenUsage[`color-${key}`] = 'Use for error states, destructive actions, and warning indicators only';
      } else {
        tokenUsage[`color-${key}`] = `Use for primary interactive elements — links, buttons, active states, and focus rings`;
      }
    } else if (key.startsWith('shadow-')) {
      tokenUsage[`color-${key}`] = 'Used internally by shadow tokens — do not apply directly as color';
    }
  }

  // Shared/modeless tokens
  for (const key of Object.keys(data.shared || {})) {
    if (key.includes('overlay')) {
      tokenUsage[`color-${key}`] = 'Use for modal/dialog backdrop overlays';
    } else if (key.includes('white') && key.includes('24')) {
      tokenUsage[`color-${key}`] = 'Use for translucent white overlays on dark backgrounds';
    } else if (key.includes('black') && key.includes('24')) {
      tokenUsage[`color-${key}`] = 'Use for translucent dark overlays on light backgrounds';
    } else if (key.includes('white')) {
      tokenUsage[`color-${key}`] = 'Use for text/icons on dark/colored backgrounds regardless of theme';
    } else if (key.includes('black')) {
      tokenUsage[`color-${key}`] = 'Use for text/icons on light backgrounds regardless of theme';
    } else if (key.includes('destructive')) {
      tokenUsage[`color-${key}`] = 'Theme-independent destructive color — use for persistent error indicators';
    } else if (key.includes('brand') || key.includes('teal') || key.includes('primary')) {
      tokenUsage[`color-${key}`] = 'Theme-independent accent color — use for brand elements that must not shift between themes';
    }
  }

  // Scope guidelines from _meta
  if (scope.background) {
    colorGuidelines.push('Background tokens: apply to frames/containers only, not shapes, text, or strokes');
  }
  if (scope.content) {
    colorGuidelines.push('Content tokens: apply to text, icons, and shape fills — not frame backgrounds');
  }
  if (scope.highlight) {
    colorGuidelines.push('Highlight tokens: use for borders and interactive hover/focus states');
  }
  if (scope.accent) {
    colorGuidelines.push('Accent tokens: can be used across all contexts (text, background, border, icon)');
  }

  // Detect accent color identity for anti-pattern generation
  const accentKeys = Object.keys(allThemed).filter(k => k.startsWith('accent-') && !k.includes('destructive'));
  const accentColors = accentKeys.map(k => ({
    name: k,
    dark: data.dark?.[k],
    light: data.light?.[k]
  }));

  return { tokenUsage, guidelines: colorGuidelines, accents: accentColors };
}

function generateTypographyRules() {
  const result = loadJSON('typography.json');
  if (!result) return null;
  const { data, meta } = result;

  const scale = {};
  const tokenUsage = {};
  const fontStack = data.primitive?.family?.primary || null;
  const fontName = primaryFontName(fontStack);

  // Build typography scale from composites
  for (const [name, style] of Object.entries(data.composite || {})) {
    const weightName = style.fontWeight;
    const weightValue = data.primitive?.weight?.[weightName] || weightName;

    scale[name] = {
      fontSize: pxVal(style.fontSize),
      lineHeight: pxVal(style.lineHeight),
      fontWeight: weightValue,
      fontWeightName: weightName
    };

    // Semantic role descriptions
    if (name.startsWith('heading-')) {
      const level = name.replace('heading-', '');
      tokenUsage[`font-size-${name}`] = `Use for ${level}-sized headings (${pxVal(style.fontSize)}/${pxVal(style.lineHeight)})`;
    } else if (name.startsWith('body-')) {
      const level = name.replace('body-', '');
      tokenUsage[`font-size-${name}`] = `Use for ${level} body text (${pxVal(style.fontSize)}/${pxVal(style.lineHeight)})`;
    } else if (name.startsWith('button-')) {
      tokenUsage[`font-size-${name}`] = `Use for button labels (${pxVal(style.fontSize)}/${pxVal(style.lineHeight)})`;
    } else if (name.startsWith('caption') || name.startsWith('label') || name.startsWith('overline')) {
      tokenUsage[`font-size-${name}`] = `Use for ${name} text (${pxVal(style.fontSize)}/${pxVal(style.lineHeight)})`;
    }
  }

  // Font weight usage
  const weightUsage = {};
  for (const [name, value] of Object.entries(data.primitive?.weight || {})) {
    // Determine which composite styles use this weight
    const uses = Object.entries(data.composite || {})
      .filter(([, s]) => s.fontWeight === name)
      .map(([n]) => n);
    weightUsage[name] = {
      value,
      usedIn: uses.length > 0 ? uses : ['available but not used in default composites']
    };
  }

  return {
    fontFamily: fontStack,
    fontName,
    scale,
    tokenUsage,
    weightUsage,
    codeFontFamily: data.primitive?.family?.code || null
  };
}

function generateSpacingRules() {
  const result = loadJSON('sizing.json');
  if (!result) return null;
  const { data, meta } = result;

  const sizeScale = {};
  const spaceScale = {};
  const tokenUsage = {};

  // Detect base unit from scale progression
  const sizeValues = Object.values(data.size || {}).filter(v => v > 0).sort((a, b) => a - b);
  const baseUnit = sizeValues.length >= 2 ? sizeValues[0] : 4;

  for (const [key, value] of Object.entries(data.size || {})) {
    sizeScale[key] = pxVal(value);
    tokenUsage[key] = `Size token: ${pxVal(value)} — use for width, height, and fixed dimensions`;
  }

  for (const [key, value] of Object.entries(data.space || {})) {
    spaceScale[key] = pxVal(value);
    tokenUsage[key] = `Space token: ${pxVal(value)} — use for padding, margin, and gap`;
  }

  return {
    baseUnit: pxVal(baseUnit),
    sizeScale,
    spaceScale,
    tokenUsage,
    description: meta.scale || `${baseUnit}px base unit spacing scale`
  };
}

function generateRadiiRules() {
  const result = loadJSON('radii.json');
  if (!result) return null;
  const { data, meta } = result;

  const scale = {};
  const tokenUsage = {};

  const values = Object.entries(data.radius || {}).sort((a, b) => a[1] - b[1]);

  for (const [key, value] of values) {
    scale[key] = pxVal(value);

    if (value === 0) {
      tokenUsage[key] = 'No rounding — use for sharp-edged elements';
    } else if (value >= 9999) {
      tokenUsage[key] = 'Pill/circle shape — use for pill buttons, avatars, and fully rounded elements';
    } else if (value <= 4) {
      tokenUsage[key] = `Subtle rounding (${pxVal(value)}) — use for tags, small badges, and inline elements`;
    } else if (value <= 8) {
      tokenUsage[key] = `Standard rounding (${pxVal(value)}) — use for buttons, inputs, and small cards`;
    } else if (value <= 16) {
      tokenUsage[key] = `Medium rounding (${pxVal(value)}) — use for cards, tiles, and medium containers`;
    } else if (value <= 32) {
      tokenUsage[key] = `Large rounding (${pxVal(value)}) — use for large cards, modals, and prominent containers`;
    } else {
      tokenUsage[key] = `Extra large rounding (${pxVal(value)}) — use for hero sections and prominent UI regions`;
    }
  }

  return {
    scale,
    tokenUsage,
    description: meta.scale || null
  };
}

function generateShadowRules() {
  const result = loadJSON('shadows.json');
  if (!result) return null;
  const { data, meta } = result;

  const tokenUsage = {};

  tokenUsage['shadow-small'] = 'Use for subtle depth on buttons, dropdowns, and small interactive elements';
  tokenUsage['shadow-medium'] = 'Use for cards, popovers, and elevated surfaces';
  tokenUsage['shadow-large'] = 'Use for modals, dialogs, and the highest-elevation layers';

  // Blur tokens
  for (const [key, value] of Object.entries(data.blur || {})) {
    tokenUsage[key] = `Backdrop blur (${pxVal(value)}) — use for frosted glass effects on overlapping surfaces`;
  }

  return {
    tokenUsage,
    guidelines: meta.description || null
  };
}

function generateBorderRules() {
  const result = loadJSON('borders.json');
  if (!result) return null;
  const { data, meta } = result;

  const tokenUsage = {};

  for (const [key, value] of Object.entries(data.width || {})) {
    if (value === 0) {
      tokenUsage[`border-width-${key}`] = 'No border — use to explicitly remove borders';
    } else if (value === 1) {
      tokenUsage[`border-width-${key}`] = `Thin border (${pxVal(value)}) — use for dividers, keylines, and input outlines`;
    } else {
      tokenUsage[`border-width-${key}`] = `${key} border (${pxVal(value)}) — use for emphasis borders and focus rings`;
    }
  }

  return {
    tokenUsage,
    guidelines: meta.rationale || null
  };
}

function generateOpacityRules() {
  const result = loadJSON('opacity.json');
  if (!result) return null;
  const { data, meta } = result;

  const tokenUsage = {};

  for (const [key, value] of Object.entries(data.opacity || {})) {
    const pct = Math.round(value * 100);
    if (value === 0) {
      tokenUsage[`opacity-${key}`] = 'Fully transparent — use for hidden/faded-out states';
    } else if (value <= 0.1) {
      tokenUsage[`opacity-${key}`] = `Near-invisible (${pct}%) — use for subtle fill overlays and quaternary backgrounds`;
    } else if (value <= 0.25) {
      tokenUsage[`opacity-${key}`] = `Low opacity (${pct}%) — use for highlight fills, border alpha, and disabled icons`;
    } else if (value <= 0.5) {
      tokenUsage[`opacity-${key}`] = `Medium opacity (${pct}%) — use for scrims, overlay backgrounds, and de-emphasized elements`;
    } else if (value < 1) {
      tokenUsage[`opacity-${key}`] = `High opacity (${pct}%) — use for secondary text, nav text, and frosted glass backgrounds`;
    } else {
      tokenUsage[`opacity-${key}`] = 'Fully opaque — default, use when no transparency is needed';
    }
  }

  return { tokenUsage };
}

function generateTransitionRules() {
  const result = loadJSON('transitions.json');
  if (!result) return null;
  const { data, meta } = result;

  const tokenUsage = {};

  for (const [key, value] of Object.entries(data.duration || {})) {
    tokenUsage[`duration-${key}`] = `${value}ms — use for ${key}-paced transitions`;
  }
  for (const [key, value] of Object.entries(data.easing || {})) {
    tokenUsage[`easing-${key}`] = `${value} — use as ${key} easing curve`;
  }

  return {
    tokenUsage,
    guidelines: meta.rationale || null
  };
}

function generateZIndexRules() {
  const result = loadJSON('z-index.json');
  if (!result) return null;
  const { data, meta } = result;

  const tokenUsage = {};

  const layerDescriptions = {
    'base': 'Default stacking — use for normal document flow',
    'dropdown': 'Dropdown menus and select popups',
    'sticky': 'Sticky headers and fixed navigation',
    'modal-backdrop': 'Modal backdrop/scrim overlay',
    'modal': 'Modal dialogs and sheets',
    'tooltip': 'Tooltips, toasts, and top-level popovers'
  };

  for (const [key, value] of Object.entries(data.z || {})) {
    tokenUsage[`z-${key}`] = layerDescriptions[key] || `z-index: ${value}`;
  }

  return { tokenUsage };
}

// --- Anti-pattern generation ---

function generateAntiPatterns(typography, colorRules) {
  const antiPatterns = [];

  // Font anti-patterns
  if (typography) {
    const systemFont = typography.fontName;
    const genericFonts = getGenericFonts();

    // Only flag generic fonts that are NOT part of this system
    const disallowed = genericFonts.filter(f => {
      if (!typography.fontFamily) return true;
      return !typography.fontFamily.includes(f);
    });

    if (disallowed.length > 0 && systemFont) {
      antiPatterns.push({
        id: 'no-generic-fonts',
        rule: `Do not use ${disallowed.join(', ')} — this system uses ${systemFont}`,
        severity: 'error',
        reason: 'Generic font substitution is the most visible sign of AI-generated interfaces'
      });
    }

    // Weight anti-pattern: detect if system uses a distinctive weight strategy
    const compositeWeights = Object.values(typography.scale || {}).map(s => s.fontWeightName);
    const uniqueWeights = [...new Set(compositeWeights)];
    if (uniqueWeights.length > 0 && !uniqueWeights.includes('regular')) {
      antiPatterns.push({
        id: 'respect-weight-strategy',
        rule: `This system uses ${uniqueWeights.join(', ')} weights — do not default to font-weight: 400 (regular) for all text`,
        severity: 'warning',
        reason: 'Font weight choices are a core part of brand identity'
      });
    }
  }

  // Color anti-patterns
  if (colorRules && colorRules.accents) {
    const accentNames = colorRules.accents.map(a => a.name);

    // Check if system uses indigo/purple as its accent
    const hasIndigo = colorRules.accents.some(a => {
      const colors = [a.dark, a.light].filter(Boolean).map(c => c.toLowerCase());
      // Check for indigo-ish hues (purple/blue range)
      return colors.some(c => {
        if (!c.startsWith('#') || c.length < 7) return false;
        const r = parseInt(c.slice(1, 3), 16);
        const g = parseInt(c.slice(3, 5), 16);
        const b = parseInt(c.slice(5, 7), 16);
        // Indigo-ish: high blue, medium-low red, low green
        return b > 200 && r > 60 && r < 160 && g < 100;
      });
    });

    if (!hasIndigo) {
      antiPatterns.push({
        id: 'no-default-indigo',
        rule: 'Do not use indigo (#6366f1), purple (#8b5cf6), or violet (#7c3aed) gradients — they are not part of this system',
        severity: 'error',
        reason: 'Indigo/purple is the most common AI-generated default color and signals generic output'
      });
    }

    // Warn against inventing accent colors
    if (accentNames.length > 0) {
      antiPatterns.push({
        id: 'no-invented-accents',
        rule: `Only use the defined accent tokens (${accentNames.join(', ')}) — do not introduce new accent colors`,
        severity: 'error',
        reason: 'Invented accent colors break brand consistency'
      });
    }
  }

  // Radius anti-patterns
  const radiiResult = loadJSON('radii.json');
  if (radiiResult) {
    const radiiValues = Object.values(radiiResult.data.radius || {}).filter(v => v > 0 && v < 9999);
    const has8px = radiiValues.includes(8);
    const hasVariety = radiiValues.length > 3;

    if (hasVariety) {
      antiPatterns.push({
        id: 'no-uniform-radius',
        rule: `Do not apply the same border-radius to all elements — this system defines ${radiiValues.length} distinct radius values for different contexts`,
        severity: 'warning',
        reason: 'Uniform 8px border-radius on everything is a hallmark of AI-generated interfaces'
      });
    }
  }

  // Shadow anti-patterns
  const shadowResult = loadJSON('shadows.json');
  if (shadowResult && shadowResult.meta) {
    if (shadowResult.meta.description && shadowResult.meta.description.toLowerCase().includes('minimal')) {
      antiPatterns.push({
        id: 'minimal-shadows',
        rule: 'Use shadows sparingly — this system relies on background contrast and whitespace for depth, not heavy shadows',
        severity: 'warning',
        reason: 'Excessive shadow use contradicts the design system philosophy'
      });
    }
  }

  // General AI slop anti-patterns (always included)
  antiPatterns.push({
    id: 'no-generic-gradients',
    rule: 'Do not use decorative gradients unless explicitly defined in the token set',
    severity: 'warning',
    reason: 'Gratuitous gradients (especially purple-to-blue) are a top signal of AI-generated UI'
  });

  antiPatterns.push({
    id: 'no-excessive-rounding',
    rule: 'Do not round every element — use the radius scale tokens and match radius to element size and role',
    severity: 'warning',
    reason: 'Over-rounding creates a toy-like appearance inconsistent with most professional design systems'
  });

  antiPatterns.push({
    id: 'use-defined-spacing',
    rule: 'Use spacing tokens for all padding, margin, and gap — do not use arbitrary values like 15px or 22px',
    severity: 'warning',
    reason: 'Arbitrary spacing values break the visual rhythm of the design system'
  });

  antiPatterns.push({
    id: 'no-color-invention',
    rule: 'Do not introduce colors outside the token palette — every color must come from a defined token',
    severity: 'error',
    reason: 'Invented colors break theme consistency and dark/light mode support'
  });

  return antiPatterns;
}

// --- Component CSS parsing ---

/**
 * Parse a component CSS file and extract structural information:
 * - classNames: all CSS class selectors found
 * - tokenRefs: all var(--*) token references used
 * - variantCount: number of top-level class selectors (approximates variant count)
 * - states: which interactive pseudo-classes are covered (:hover, :focus, :active, :disabled)
 */
function parseComponentCSS(filePath) {
  const css = fs.readFileSync(filePath, 'utf8');

  // Extract class names from selectors (e.g. .btn-primary, .input-lg)
  const classMatches = css.match(/\.([a-zA-Z][\w-]*)/g) || [];
  const classNames = [...new Set(classMatches.map(m => m.slice(1)))]; // remove leading dot, dedupe

  // Extract token references: var(--token-name)
  const tokenMatches = css.match(/var\(--([^)]+)\)/g) || [];
  const tokenRefs = [...new Set(tokenMatches.map(m => {
    // Extract just the custom property name (strip var(-- and ))
    const inner = m.match(/var\(--([^),]+)/);
    return inner ? inner[1] : null;
  }).filter(Boolean))];

  // Count variants: top-level class selectors that are not pseudo-class or compound
  // A "variant" is a standalone class selector like .btn-primary (not .btn:hover)
  const selectorRegex = /^\.([a-zA-Z][\w-]*)(?:\s*[,{])/gm;
  const variantMatches = css.match(selectorRegex) || [];
  const variants = [...new Set(variantMatches.map(m => m.replace(/\s*[,{]$/, '').slice(1)))];

  // Detect state coverage
  const states = {
    hover: /:hover/.test(css),
    focus: /:focus/.test(css),
    active: /:active/.test(css),
    disabled: /:disabled/.test(css) || /aria-disabled/.test(css)
  };

  return {
    classNames,
    tokenRefs,
    variantCount: variants.length,
    variants,
    states
  };
}

// --- Component constraints ---

function generateComponentConstraints(typography, spacing, radii, shadows) {
  // Check if this system has component CSS files
  const componentsDir = path.join(SYSTEMS_DIR, systemName, 'components');
  const hasComponentCSS = fs.existsSync(componentsDir) &&
    fs.statSync(componentsDir).isDirectory() &&
    fs.readdirSync(componentsDir).some(f => f.endsWith('.css'));

  if (hasComponentCSS) {
    return generateComponentConstraintsFromCSS(componentsDir);
  }

  // Fall back to heuristic constraints for systems without component CSS
  return generateHeuristicConstraints(typography, spacing, radii, shadows);
}

/**
 * Parse actual component CSS files to derive constraints from real data.
 * Returns constraints keyed by component name (filename without extension).
 */
function generateComponentConstraintsFromCSS(componentsDir) {
  const constraints = {};
  const cssFiles = fs.readdirSync(componentsDir).filter(f => f.endsWith('.css'));

  for (const file of cssFiles) {
    const componentName = path.basename(file, '.css');
    const filePath = path.join(componentsDir, file);
    const parsed = parseComponentCSS(filePath);

    // Derive constraints from what we parsed
    const constraint = {};

    // Token usage summary
    const colorTokens = parsed.tokenRefs.filter(t => t.startsWith('color-'));
    const spacingTokens = parsed.tokenRefs.filter(t => t.startsWith('space-') || t.startsWith('size-'));
    const radiusTokens = parsed.tokenRefs.filter(t => t.startsWith('radius-'));
    const typographyTokens = parsed.tokenRefs.filter(t =>
      t.startsWith('font-') || t.startsWith('line-height-')
    );
    const shadowTokens = parsed.tokenRefs.filter(t =>
      t.startsWith('shadow-') || t.startsWith('color-shadow-')
    );
    const transitionTokens = parsed.tokenRefs.filter(t =>
      t.startsWith('duration-') || t.startsWith('easing-')
    );

    if (colorTokens.length > 0) {
      constraint.colors = `Uses ${colorTokens.length} color tokens: ${colorTokens.join(', ')}`;
    }
    if (spacingTokens.length > 0) {
      constraint.spacing = `Uses spacing/size tokens: ${spacingTokens.join(', ')}`;
    }
    if (radiusTokens.length > 0) {
      constraint.radius = `Uses radius tokens: ${radiusTokens.join(', ')}`;
    }
    if (typographyTokens.length > 0) {
      constraint.typography = `Uses typography tokens: ${typographyTokens.join(', ')}`;
    }
    if (shadowTokens.length > 0) {
      constraint.shadow = `Uses shadow tokens: ${shadowTokens.join(', ')}`;
    }
    if (transitionTokens.length > 0) {
      constraint.transitions = `Uses transition tokens: ${transitionTokens.join(', ')}`;
    }

    // State coverage
    const coveredStates = Object.entries(parsed.states)
      .filter(([, covered]) => covered)
      .map(([state]) => `:${state}`);
    const missingStates = Object.entries(parsed.states)
      .filter(([, covered]) => !covered)
      .map(([state]) => `:${state}`);

    if (coveredStates.length > 0) {
      constraint.statesCovered = coveredStates.join(', ');
    }
    if (missingStates.length > 0) {
      constraint.statesMissing = missingStates.join(', ');
    }

    // Variant summary
    constraint.variantCount = parsed.variantCount;
    constraint.variants = parsed.variants;
    constraint.file = `components/${file}`;

    constraints[componentName] = constraint;
  }

  return constraints;
}

/**
 * Heuristic constraints for systems without component CSS files.
 * Provides generic guidance based on token availability.
 */
function generateHeuristicConstraints(typography, spacing, radii, shadows) {
  const constraints = {};

  // Button constraints
  constraints.button = {
    typography: typography?.scale?.['button-default']
      ? `Use font-size-button-default (${typography.scale['button-default'].fontSize})`
      : 'Use body-medium font size',
    radius: 'Use radius-20 (standard) or radius-9999 (pill) — not an arbitrary value',
    padding: spacing ? 'Use space tokens for horizontal and vertical padding' : null,
    shadow: 'Buttons typically use shadow-small or no shadow'
  };

  // Card constraints
  constraints.card = {
    radius: radii?.scale?.['radius-30']
      ? `Use radius-30 or larger (${radii.scale['radius-30']}+) for cards`
      : 'Use medium-to-large radius tokens for cards',
    shadow: 'Use shadow-small for flat cards, shadow-medium for elevated cards',
    background: 'Use background-secondary or background-tertiary — not background-primary (which is the page)'
  };

  // Modal constraints
  constraints.modal = {
    radius: radii?.scale?.['radius-70']
      ? `Use radius-70 (${radii.scale['radius-70']}) for modals`
      : 'Use large radius tokens for modals',
    shadow: 'Use shadow-large for modals',
    backdrop: 'Use modeless-overlay for the backdrop scrim'
  };

  // Input constraints
  constraints.input = {
    border: 'Use border-width-thin with highlight-primary color',
    radius: 'Use radius-20 (standard button/input radius)',
    typography: typography?.scale?.['body-large']
      ? `Use font-size-body-large (${typography.scale['body-large'].fontSize}) for input text`
      : 'Use body-medium or body-large font size'
  };

  // Navigation constraints
  constraints.navigation = {
    background: 'Use background-primary or background-secondary with optional backdrop blur',
    blur: shadows ? 'Use blur tokens for frosted glass nav effects' : null,
    zIndex: 'Use z-sticky for fixed/sticky navigation'
  };

  // Clean up null values
  for (const component of Object.values(constraints)) {
    for (const [key, value] of Object.entries(component)) {
      if (value === null) delete component[key];
    }
  }

  return constraints;
}

// --- Main assembly ---

function generateRules() {
  console.log(`Reading tokens from: ${TOKENS_DIR}`);

  const colorRules = generateColorRules();
  const typography = generateTypographyRules();
  const spacing = generateSpacingRules();
  const radii = generateRadiiRules();
  const shadows = generateShadowRules();
  const borders = generateBorderRules();
  const opacity = generateOpacityRules();
  const transitions = generateTransitionRules();
  const zIndex = generateZIndexRules();

  const antiPatterns = generateAntiPatterns(typography, colorRules);
  const componentConstraints = generateComponentConstraints(typography, spacing, radii, shadows);

  // Build component inventory if component CSS files exist
  const componentsDir = path.join(SYSTEMS_DIR, systemName, 'components');
  let componentInventory = null;
  if (fs.existsSync(componentsDir) && fs.statSync(componentsDir).isDirectory()) {
    const cssFiles = fs.readdirSync(componentsDir).filter(f => f.endsWith('.css'));
    if (cssFiles.length > 0) {
      componentInventory = {};
      for (const file of cssFiles) {
        const componentName = path.basename(file, '.css');
        const filePath = path.join(componentsDir, file);
        const parsed = parseComponentCSS(filePath);
        componentInventory[componentName] = {
          file: `components/${file}`,
          classes: parsed.classNames,
          variants: parsed.variants,
          variantCount: parsed.variantCount,
          tokenRefs: parsed.tokenRefs,
          states: parsed.states
        };
      }
    }
  }

  // Merge all token usage maps
  const allTokenUsage = {};
  const sections = [colorRules, typography, spacing, radii, shadows, borders, opacity, transitions, zIndex];
  for (const section of sections) {
    if (section?.tokenUsage) {
      Object.assign(allTokenUsage, section.tokenUsage);
    }
  }

  // Build the rules document
  const rules = {
    _meta: {
      system: systemName,
      generated: new Date().toISOString().split('T')[0],
      description: `Design rules for the ${systemName} design system. Use these constraints to ensure AI-generated interfaces match the system's visual language and avoid generic output.`,
      usage: 'Load this file in /frontend-design or /apply-tokens to constrain generation to this system\'s tokens and patterns.'
    },

    tokenUsage: allTokenUsage,

    typography: typography ? {
      fontFamily: typography.fontFamily,
      fontName: typography.fontName,
      codeFontFamily: typography.codeFontFamily,
      scale: typography.scale,
      weightUsage: typography.weightUsage
    } : null,

    spacing: spacing ? {
      baseUnit: spacing.baseUnit,
      sizeScale: spacing.sizeScale,
      spaceScale: spacing.spaceScale,
      description: spacing.description
    } : null,

    colorUsage: colorRules ? {
      guidelines: colorRules.guidelines,
      accents: colorRules.accents
    } : null,

    radii: radii ? {
      scale: radii.scale,
      description: radii.description
    } : null,

    antiPatterns,

    componentConstraints,

    components: componentInventory
  };

  // Remove null sections
  for (const [key, value] of Object.entries(rules)) {
    if (value === null) delete rules[key];
  }

  // Write output
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const json = JSON.stringify(rules, null, 2);
  fs.writeFileSync(OUTPUT_FILE, json + '\n', 'utf8');

  // Stats
  const tokenCount = Object.keys(allTokenUsage).length;
  const antiPatternCount = antiPatterns.length;
  const componentCount = Object.keys(componentConstraints).length;
  const componentFileCount = componentInventory ? Object.keys(componentInventory).length : 0;

  console.log(`Generated ${OUTPUT_FILE}`);
  console.log(`  Token usage rules:    ${tokenCount}`);
  console.log(`  Anti-patterns:        ${antiPatternCount}`);
  console.log(`  Component constraints: ${componentCount}`);
  if (componentFileCount > 0) {
    console.log(`  Component CSS files:  ${componentFileCount} (parsed from components/)`);
  }
}

generateRules();
