#!/usr/bin/env node

/**
 * Airtime Design System — Token Generation Script
 * Reads DTCG token files and generates tokens.css with CSS custom properties.
 *
 * Usage: node scripts/generate.js [--oklch] [--modern-css]
 *
 * Reads from: ./tokens/*.tokens.json
 * Writes to:  ./generated/tokens.css
 *
 * --- Flags ---
 *
 * --oklch   Enable OKLCH color space output.
 * --modern-css  Enable modern CSS output features (color-mix, light-dark, @property).
 */

const fs = require('fs');
const path = require('path');

// --- Argument parsing ---
const args = process.argv.slice(2);
const OKLCH_ENABLED = args.includes('--oklch');
const MODERN_CSS_ENABLED = args.includes('--modern-css');

// Standalone: hardcoded paths relative to project root
const PROJECT_ROOT = path.join(__dirname, '..');
const TOKENS_DIR = path.join(PROJECT_ROOT, 'tokens');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'tokens.css');

// --- Format detection ---

function detectFormat() {
  // Three-tier: if primitives/ subdirectory exists with .tokens.json files, use three-tier pipeline
  const primitivesDir = path.join(TOKENS_DIR, 'primitives');
  if (fs.existsSync(primitivesDir) && fs.statSync(primitivesDir).isDirectory()) {
    const primFiles = fs.readdirSync(primitivesDir).filter(f => f.endsWith('.tokens.json'));
    if (primFiles.length > 0) return 'three-tier';
  }
  // Flat DTCG: if any *.tokens.json files exist at top level
  const files = fs.readdirSync(TOKENS_DIR);
  const dtcgFiles = files.filter(f => f.endsWith('.tokens.json'));
  return dtcgFiles.length > 0 ? 'dtcg' : 'legacy';
}

// ============================================================
// OKLCH COLOR SPACE CONVERSION
// ============================================================
// Conversion path: sRGB hex → linear RGB → CIE XYZ (D65) → OKLab → OKLCH
// Reference: Björn Ottosson, "A perceptual color space for image processing"
// https://bottosson.github.io/posts/oklab/

/**
 * Detect whether a CSS color value is already in oklch() syntax.
 */
function isOklchValue(value) {
  return typeof value === 'string' && /^\s*oklch\s*\(/.test(value);
}

/**
 * Parse a hex color string into [r, g, b, a] with 0-255 integer components.
 * Supports #RGB, #RGBA, #RRGGBB, #RRGGBBAA.
 * Returns null if not a valid hex color.
 */
function parseHex(hex) {
  if (typeof hex !== 'string') return null;
  hex = hex.trim();
  if (!hex.startsWith('#')) return null;
  const h = hex.slice(1);
  let r, g, b, a = 255;
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length === 4) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
    a = parseInt(h[3] + h[3], 16);
  } else if (h.length === 6) {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else if (h.length === 8) {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
    a = parseInt(h.slice(6, 8), 16);
  } else {
    return null;
  }
  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null;
  return [r, g, b, a];
}

/**
 * sRGB component (0-1) to linear RGB. Inverse of the sRGB companding function.
 */
function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear RGB [0-1] to CIE XYZ (D65 illuminant).
 * Matrix from IEC 61966-2-1 (sRGB spec).
 */
function linearRGBToXYZ(lr, lg, lb) {
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;
  return [x, y, z];
}

/**
 * Convert CIE XYZ to OKLab using the Ottosson matrices.
 * Two-step: XYZ → LMS (cone response) → OKLab (perceptual).
 */
function xyzToOKLab(x, y, z) {
  // XYZ to LMS (using the M1 matrix from Ottosson)
  let l = 0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z;
  let m = 0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z;
  let s = 0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z;

  // Cube root (LMS → LMS')
  l = Math.cbrt(l);
  m = Math.cbrt(m);
  s = Math.cbrt(s);

  // LMS' to OKLab (using the M2 matrix from Ottosson)
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const b = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  return [L, a, b];
}

/**
 * Convert OKLab [L, a, b] to OKLCH [L, C, H].
 * L = lightness (0-1), C = chroma (0+), H = hue in degrees (0-360).
 */
function oklabToOKLCH(L, a, b) {
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return [L, C, H];
}

/**
 * Convert a hex color to an OKLCH CSS string.
 * Returns e.g. "oklch(54.5% 0.12 264.1)" or "oklch(54.5% 0.12 264.1 / 0.72)" for alpha.
 * Returns null if the hex cannot be parsed.
 */
function hexToOklch(hex) {
  const parsed = parseHex(hex);
  if (!parsed) return null;
  const [r8, g8, b8, a8] = parsed;

  // Normalize to 0-1
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;

  // sRGB → linear RGB
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  // Linear RGB → XYZ (D65)
  const [x, y, z] = linearRGBToXYZ(lr, lg, lb);

  // XYZ → OKLab
  const [L, a, bLab] = xyzToOKLab(x, y, z);

  // OKLab → OKLCH
  const [Lch, C, H] = oklabToOKLCH(L, a, bLab);

  // Format: oklch(L% C H) — L as percentage, C to 4 decimal places, H to 1 decimal
  // For achromatic colors (C ≈ 0), omit hue — spec allows "none"
  const Lpct = round(Lch * 100, 2);
  const Cround = round(C, 4);
  const Hround = round(H, 1);

  // Use "none" for hue and zero chroma when achromatic (chroma effectively 0)
  const isAchromatic = Cround < 0.0005;
  const chromaStr = isAchromatic ? '0' : String(Cround);
  const hueStr = isAchromatic ? 'none' : String(Hround);

  const alpha = a8 / 255;
  if (alpha < 1) {
    const alphaRound = round(alpha, 2);
    return `oklch(${Lpct}% ${chromaStr} ${hueStr} / ${alphaRound})`;
  }
  return `oklch(${Lpct}% ${chromaStr} ${hueStr})`;
}

/**
 * Round a number to n decimal places, stripping trailing zeros.
 */
function round(num, places) {
  const factor = Math.pow(10, places);
  return Math.round(num * factor) / factor;
}

/**
 * Convert a color value to OKLCH if possible.
 * - If already oklch(), return as-is.
 * - If hex, convert via the full pipeline.
 * - Otherwise return null (unconvertible).
 */
function toOklch(value) {
  if (isOklchValue(value)) return value.trim();
  return hexToOklch(value);
}

/**
 * Check if a CSS value is a color (hex or oklch). Used to decide whether to
 * generate OKLCH variants for a given variable.
 */
function isColorValue(value) {
  if (typeof value !== 'string') return false;
  return /^#([0-9a-fA-F]{3,8})$/.test(value.trim()) || isOklchValue(value);
}

// ============================================================
// LEGACY FORMAT PIPELINE (original)
// ============================================================

function loadJSON(filename) {
  const filepath = path.join(TOKENS_DIR, filename);
  const raw = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  const { _meta, ...data } = raw;
  return { data, meta: _meta };
}

function cssVar(name, value) {
  return `  --${name}: ${value};`;
}

function pxVal(n) {
  return n === 0 ? '0' : `${n}px`;
}

function generateColors() {
  const { data } = loadJSON('colors.json');
  const root = [];
  const light = [];
  const dark = [];
  // OKLCH color entries: { propName, hex, oklch, bucket } for each convertible color
  const oklchColors = [];

  for (const [key, value] of Object.entries(data.dark || {})) {
    const propName = `color-${key}`;
    dark.push(cssVar(propName, value));
    if (OKLCH_ENABLED && isColorValue(value)) {
      const oklch = toOklch(value);
      if (oklch) oklchColors.push({ propName, hex: value, oklch, bucket: 'dark' });
    }
  }
  for (const [key, value] of Object.entries(data.light || {})) {
    const propName = `color-${key}`;
    light.push(cssVar(propName, value));
    if (OKLCH_ENABLED && isColorValue(value)) {
      const oklch = toOklch(value);
      if (oklch) oklchColors.push({ propName, hex: value, oklch, bucket: 'light' });
    }
  }
  for (const [key, value] of Object.entries(data.shared || {})) {
    const propName = `color-${key}`;
    root.push(cssVar(propName, value));
    if (OKLCH_ENABLED && isColorValue(value)) {
      const oklch = toOklch(value);
      if (oklch) oklchColors.push({ propName, hex: value, oklch, bucket: 'root' });
    }
  }

  return OKLCH_ENABLED
    ? { root, light, dark, oklchColors }
    : { root, light, dark };
}

function generateSizing() {
  const { data } = loadJSON('sizing.json');
  const root = [];

  for (const [key, value] of Object.entries(data.size || {})) {
    root.push(cssVar(key, pxVal(value)));
  }
  for (const [key, value] of Object.entries(data.space || {})) {
    root.push(cssVar(key, pxVal(value)));
  }

  return { root };
}

function generateTypography() {
  const { data } = loadJSON('typography.json');
  const root = [];

  for (const [key, value] of Object.entries(data.primitive.family || {})) {
    root.push(cssVar(`font-family-${key}`, value));
  }
  for (const [key, value] of Object.entries(data.primitive.weight || {})) {
    root.push(cssVar(`font-weight-${key}`, value));
  }
  for (const [name, style] of Object.entries(data.composite || {})) {
    root.push(cssVar(`font-size-${name}`, pxVal(style.fontSize)));
    root.push(cssVar(`line-height-${name}`, pxVal(style.lineHeight)));
    root.push(cssVar(`font-weight-${name}`, data.primitive.weight[style.fontWeight]));
  }

  return { root };
}

function generateRadii() {
  const { data } = loadJSON('radii.json');
  const root = [];

  for (const [key, value] of Object.entries(data.radius || {})) {
    root.push(cssVar(key, pxVal(value)));
  }

  return { root };
}

function generateShadows() {
  const { data } = loadJSON('shadows.json');
  const root = [];
  const light = [];
  const dark = [];

  const levels = ['small', 'medium', 'large'];

  for (const level of levels) {
    const geo = data.geometry[level];
    const shadowTemplate = `${pxVal(geo.offsetX)} ${pxVal(geo.offsetY)} ${pxVal(geo.blurRadius)} ${pxVal(geo.spreadRadius)}`;

    dark.push(cssVar(`shadow-${level}`, `${shadowTemplate} ${data.dark[`shadow-${level}`]}`));
    light.push(cssVar(`shadow-${level}`, `${shadowTemplate} ${data.light[`shadow-${level}`]}`));
  }

  for (const [key, value] of Object.entries(data.blur || {})) {
    root.push(cssVar(key, pxVal(value)));
  }

  return { root, light, dark };
}

function generateBorders() {
  const { data } = loadJSON('borders.json');
  const root = [];

  for (const [key, value] of Object.entries(data.width || {})) {
    root.push(cssVar(`border-width-${key}`, pxVal(value)));
  }
  for (const [key, value] of Object.entries(data.style || {})) {
    root.push(cssVar(`border-style-${key}`, value));
  }

  return { root };
}

function generateOpacity() {
  const { data } = loadJSON('opacity.json');
  const root = [];

  for (const [key, value] of Object.entries(data.opacity || {})) {
    root.push(cssVar(`opacity-${key}`, value));
  }

  return { root };
}

function generateZIndex() {
  const { data } = loadJSON('z-index.json');
  const root = [];

  for (const [key, value] of Object.entries(data.z || {})) {
    root.push(cssVar(`z-${key}`, value));
  }

  return { root };
}

function generateTransitions() {
  const { data } = loadJSON('transitions.json');
  const root = [];

  for (const [key, value] of Object.entries(data.duration || {})) {
    root.push(cssVar(`duration-${key}`, `${value}ms`));
  }
  for (const [key, value] of Object.entries(data.easing || {})) {
    root.push(cssVar(`easing-${key}`, value));
  }

  return { root };
}

// ============================================================
// DTCG FORMAT PIPELINE
// ============================================================

/**
 * Load a DTCG .tokens.json file and return the parsed JSON (minus top-level $ keys).
 */
function loadDTCG(filename) {
  const filepath = path.join(TOKENS_DIR, filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

/**
 * Collect all tokens from a DTCG tree into a flat map.
 * Each entry: { path: ['color','background','primary','dark'], $value, $type, $extensions }
 * The path is the sequence of keys from root to the token node.
 */
function flattenDTCG(obj, parentPath = []) {
  const tokens = [];
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$')) continue; // skip $name, $description, etc.
    if (val && typeof val === 'object' && '$value' in val) {
      tokens.push({
        path: [...parentPath, key],
        $value: val.$value,
        $type: val.$type,
        $extensions: val.$extensions || {}
      });
    } else if (val && typeof val === 'object') {
      tokens.push(...flattenDTCG(val, [...parentPath, key]));
    }
  }
  return tokens;
}

/**
 * Build a lookup map from dot-path to $value for resolving {references}.
 * E.g., "font.weight.semibold" -> 600
 */
function buildRefMap(allTokens) {
  const map = {};
  for (const t of allTokens) {
    map[t.path.join('.')] = t.$value;
  }
  return map;
}

/**
 * Resolve {curly.brace} references in a $value.
 */
function resolveRefs(value, refMap) {
  if (typeof value === 'string') {
    return value.replace(/\{([^}]+)\}/g, (_, ref) => {
      const resolved = refMap[ref];
      if (resolved === undefined) {
        console.warn(`  Warning: unresolved reference {${ref}}`);
        return `{${ref}}`;
      }
      // Recursively resolve in case the target is also a reference
      return resolveRefs(String(resolved), refMap);
    });
  }
  return value;
}

/**
 * Format a DTCG $value for CSS output, based on $type.
 */
function formatDTCGValue(value, type) {
  if (type === 'shadow' && typeof value === 'object') {
    // Composite shadow: { offsetX, offsetY, blur, spread, color }
    return `${value.offsetX} ${value.offsetY} ${value.blur} ${value.spread} ${value.color}`;
  }
  if (type === 'cubicBezier') {
    if (Array.isArray(value)) {
      return `cubic-bezier(${value.join(', ')})`;
    }
    // Named easing like "ease-in" — pass through as-is
    return String(value);
  }
  if (type === 'duration' && typeof value === 'number') {
    return `${value}ms`;
  }
  // Everything else: pass through as string
  return String(value);
}

function generateDTCGColors() {
  const data = loadDTCG('colors.tokens.json');
  const tokens = flattenDTCG(data);
  const root = [];
  const light = [];
  const dark = [];
  const oklchColors = [];

  for (const t of tokens) {
    const mode = t.$extensions.mode;
    // Determine CSS property name from path.
    // Path patterns:
    //   color.background.primary.dark  -> --color-background-primary (dark mode)
    //   color.modeless.white           -> --color-modeless-white (shared)
    const pathParts = [...t.path];
    const cssValue = formatDTCGValue(t.$value, t.$type);

    if (mode === 'dark' || mode === 'light') {
      // Remove the mode segment (last element) from the path
      pathParts.pop();
      const propName = pathParts.join('-');
      const line = cssVar(propName, cssValue);
      if (mode === 'dark') dark.push(line);
      else light.push(line);

      if (OKLCH_ENABLED && t.$type === 'color' && isColorValue(cssValue)) {
        const oklch = toOklch(cssValue);
        if (oklch) oklchColors.push({ propName, hex: cssValue, oklch, bucket: mode });
      }
    } else {
      // Shared / modeless token
      const propName = pathParts.join('-');
      root.push(cssVar(propName, cssValue));

      if (OKLCH_ENABLED && t.$type === 'color' && isColorValue(cssValue)) {
        const oklch = toOklch(cssValue);
        if (oklch) oklchColors.push({ propName, hex: cssValue, oklch, bucket: 'root' });
      }
    }
  }

  return OKLCH_ENABLED
    ? { root, light, dark, oklchColors }
    : { root, light, dark };
}

function generateDTCGSizing() {
  const data = loadDTCG('sizing.tokens.json');
  const tokens = flattenDTCG(data);
  const root = [];

  for (const t of tokens) {
    // Path: size.size-0, space.space-05 — use last segment as CSS name
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root };
}

function generateDTCGTypography() {
  const data = loadDTCG('typography.tokens.json');
  const allTokens = flattenDTCG(data);
  const refMap = buildRefMap(allTokens);
  const root = [];

  // Index tokens by group for controlled ordering
  const families = {};   // font.family.*
  const weights = {};     // font.weight.* (primitive)
  const sizes = {};       // font.size.*
  const lineHeights = {}; // line-height.*
  const compositeWeights = {}; // font-weight-composite.*

  for (const t of allTokens) {
    const topGroup = t.path[0];
    if (topGroup === 'font' && t.path[1] === 'family') {
      families[t.path[2]] = t;
    } else if (topGroup === 'font' && t.path[1] === 'weight') {
      weights[t.path[2]] = t;
    } else if (topGroup === 'font' && t.path[1] === 'size') {
      sizes[t.path[2]] = t;
    } else if (topGroup === 'line-height') {
      lineHeights[t.path[1]] = t;
    } else if (topGroup === 'font-weight-composite') {
      compositeWeights[t.path[1]] = t;
    }
  }

  // 1. Primitive: font families
  for (const [key, t] of Object.entries(families)) {
    root.push(cssVar(`font-family-${key}`, formatDTCGValue(t.$value, t.$type)));
  }

  // 2. Primitive: font weights
  for (const [key, t] of Object.entries(weights)) {
    root.push(cssVar(`font-weight-${key}`, formatDTCGValue(t.$value, t.$type)));
  }

  // 3. Composite styles — interleave font-size, line-height, font-weight per style
  //    to match the legacy output ordering
  const compositeNames = Object.keys(sizes);
  for (const name of compositeNames) {
    const sizeToken = sizes[name];
    const lhToken = lineHeights[name];
    const wToken = compositeWeights[name];

    if (sizeToken) {
      root.push(cssVar(`font-size-${name}`, formatDTCGValue(sizeToken.$value, sizeToken.$type)));
    }
    if (lhToken) {
      root.push(cssVar(`line-height-${name}`, formatDTCGValue(lhToken.$value, lhToken.$type)));
    }
    if (wToken) {
      let resolvedValue = resolveRefs(wToken.$value, refMap);
      root.push(cssVar(`font-weight-${name}`, formatDTCGValue(resolvedValue, wToken.$type)));
    }
  }

  return { root };
}

function generateDTCGRadii() {
  const data = loadDTCG('radii.tokens.json');
  const tokens = flattenDTCG(data);
  const root = [];

  for (const t of tokens) {
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root };
}

function generateDTCGShadows() {
  const data = loadDTCG('shadows.tokens.json');
  const tokens = flattenDTCG(data);
  const root = [];
  const light = [];
  const dark = [];

  for (const t of tokens) {
    const mode = t.$extensions.mode;
    const topGroup = t.path[0];

    if (topGroup === 'shadow') {
      // shadow.small.dark -> --shadow-small
      const level = t.path[1];
      const propName = `shadow-${level}`;
      const line = cssVar(propName, formatDTCGValue(t.$value, t.$type));
      if (mode === 'dark') dark.push(line);
      else if (mode === 'light') light.push(line);
      else root.push(line);
    } else if (topGroup === 'blur') {
      // blur.blur-small -> --blur-small
      const propName = t.path[t.path.length - 1];
      root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
    }
  }

  return { root, light, dark };
}

function generateDTCGBorders() {
  const data = loadDTCG('borders.tokens.json');
  const tokens = flattenDTCG(data);
  const root = [];

  for (const t of tokens) {
    // border.width.none -> --border-width-none
    // border.style.solid -> --border-style-solid
    const propName = t.path.join('-');
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root };
}

function generateDTCGOpacity() {
  const data = loadDTCG('opacity.tokens.json');
  const tokens = flattenDTCG(data);
  const root = [];

  for (const t of tokens) {
    // opacity.opacity-0 -> --opacity-0
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root };
}

function generateDTCGZIndex() {
  const data = loadDTCG('z-index.tokens.json');
  const tokens = flattenDTCG(data);
  const root = [];

  for (const t of tokens) {
    // z.z-base -> --z-base
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root };
}

function generateDTCGTransitions() {
  const data = loadDTCG('transitions.tokens.json');
  const tokens = flattenDTCG(data);
  const root = [];

  for (const t of tokens) {
    // duration.duration-fast -> --duration-fast
    // easing.easing-default -> --easing-default
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root };
}

// ============================================================
// THREE-TIER FORMAT PIPELINE
// ============================================================
// Loads tokens from primitives/ → semantic/ → component/ subdirectories.
// Primitives contain raw values. Semantic tokens reference primitives.
// Component tokens reference semantic (or primitive) tokens.
// References are resolved depth-first before CSS generation.
// Output is identical to the flat DTCG pipeline.

/**
 * Load and flatten all .tokens.json files from a subdirectory of tokens/.
 * Returns an array of flattened token objects.
 */
function loadTierTokens(subdir) {
  const dir = path.join(TOKENS_DIR, subdir);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.tokens.json'));
  const allTokens = [];
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    allTokens.push(...flattenDTCG(data));
  }
  return allTokens;
}

/**
 * Deep-resolve all {references} in a value, handling both string values
 * and composite objects (e.g., shadow with nested color references).
 *
 * When a string is exactly one {reference} (full-value alias), the resolved
 * value preserves its original type (array, number, object). When references
 * are embedded in a larger string, they are stringified as before.
 */
function deepResolveRefs(value, refMap) {
  if (typeof value === 'string') {
    // Check for full-value reference: string is exactly "{some.path}"
    const fullRefMatch = value.match(/^\{([^}]+)\}$/);
    if (fullRefMatch) {
      const ref = fullRefMatch[1];
      const resolved = refMap[ref];
      if (resolved === undefined) {
        console.warn(`  Warning: unresolved reference {${ref}}`);
        return value;
      }
      // Recursively resolve in case the target is also a reference
      return deepResolveRefs(resolved, refMap);
    }
    // Partial references embedded in a string — stringify resolved values
    return resolveRefs(value, refMap);
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const resolved = {};
    for (const [k, v] of Object.entries(value)) {
      resolved[k] = deepResolveRefs(v, refMap);
    }
    return resolved;
  }
  return value;
}

/**
 * Resolve all tokens in a tier against a reference map.
 * Returns new token objects with $value fully resolved.
 */
function resolveTierTokens(tokens, refMap) {
  return tokens.map(t => ({
    ...t,
    $value: deepResolveRefs(t.$value, refMap)
  }));
}

/**
 * Generate CSS from resolved three-tier tokens.
 * The semantic tier contains all tokens that map to CSS output.
 * Component tier tokens are appended as additional CSS vars.
 * Uses the same CSS name generation logic as the flat DTCG generators.
 */
function generateThreeTierColors(resolvedSemantic) {
  const root = [];
  const light = [];
  const dark = [];
  const oklchColors = [];

  // Filter to color tokens from semantic tier
  const colorTokens = resolvedSemantic.filter(t => t.path[0] === 'color');

  for (const t of colorTokens) {
    const mode = t.$extensions.mode;
    const pathParts = [...t.path];
    const cssValue = formatDTCGValue(t.$value, t.$type);

    if (mode === 'dark' || mode === 'light') {
      pathParts.pop();
      const propName = pathParts.join('-');
      const line = cssVar(propName, cssValue);
      if (mode === 'dark') dark.push(line);
      else light.push(line);

      if (OKLCH_ENABLED && t.$type === 'color' && isColorValue(cssValue)) {
        const oklch = toOklch(cssValue);
        if (oklch) oklchColors.push({ propName, hex: cssValue, oklch, bucket: mode });
      }
    } else {
      const propName = pathParts.join('-');
      root.push(cssVar(propName, cssValue));

      if (OKLCH_ENABLED && t.$type === 'color' && isColorValue(cssValue)) {
        const oklch = toOklch(cssValue);
        if (oklch) oklchColors.push({ propName, hex: cssValue, oklch, bucket: 'root' });
      }
    }
  }

  return OKLCH_ENABLED
    ? { root, light, dark, oklchColors }
    : { root, light, dark };
}

function generateThreeTierSizing(resolvedSemantic) {
  const root = [];
  const sizeTokens = resolvedSemantic.filter(t => t.path[0] === 'size' && t.path.length === 2);
  const spaceTokens = resolvedSemantic.filter(t => t.path[0] === 'space' && t.path.length === 2);

  for (const t of sizeTokens) {
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }
  for (const t of spaceTokens) {
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root };
}

function generateThreeTierTypography(resolvedSemantic) {
  const root = [];

  // Index tokens by group — same logic as DTCG typography generator
  const families = {};
  const weights = {};
  const sizes = {};
  const lineHeights = {};
  const compositeWeights = {};

  const typoTokens = resolvedSemantic.filter(t =>
    t.path[0] === 'font' || t.path[0] === 'line-height' || t.path[0] === 'font-weight-composite'
  );

  for (const t of typoTokens) {
    const topGroup = t.path[0];
    if (topGroup === 'font' && t.path[1] === 'family') {
      families[t.path[2]] = t;
    } else if (topGroup === 'font' && t.path[1] === 'weight') {
      weights[t.path[2]] = t;
    } else if (topGroup === 'font' && t.path[1] === 'size') {
      sizes[t.path[2]] = t;
    } else if (topGroup === 'line-height') {
      lineHeights[t.path[1]] = t;
    } else if (topGroup === 'font-weight-composite') {
      compositeWeights[t.path[1]] = t;
    }
  }

  for (const [key, t] of Object.entries(families)) {
    root.push(cssVar(`font-family-${key}`, formatDTCGValue(t.$value, t.$type)));
  }
  for (const [key, t] of Object.entries(weights)) {
    root.push(cssVar(`font-weight-${key}`, formatDTCGValue(t.$value, t.$type)));
  }

  const compositeNames = Object.keys(sizes);
  for (const name of compositeNames) {
    const sizeToken = sizes[name];
    const lhToken = lineHeights[name];
    const wToken = compositeWeights[name];

    if (sizeToken) {
      root.push(cssVar(`font-size-${name}`, formatDTCGValue(sizeToken.$value, sizeToken.$type)));
    }
    if (lhToken) {
      root.push(cssVar(`line-height-${name}`, formatDTCGValue(lhToken.$value, lhToken.$type)));
    }
    if (wToken) {
      root.push(cssVar(`font-weight-${name}`, formatDTCGValue(wToken.$value, wToken.$type)));
    }
  }

  return { root };
}

function generateThreeTierRadii(resolvedSemantic) {
  const root = [];
  const tokens = resolvedSemantic.filter(t => t.path[0] === 'radius' && t.path.length === 2);

  for (const t of tokens) {
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root };
}

function generateThreeTierShadows(resolvedSemantic) {
  const root = [];
  const light = [];
  const dark = [];

  const shadowTokens = resolvedSemantic.filter(t => t.path[0] === 'shadow');
  const blurTokens = resolvedSemantic.filter(t => t.path[0] === 'blur');

  for (const t of shadowTokens) {
    const mode = t.$extensions.mode;
    const level = t.path[1];
    const propName = `shadow-${level}`;
    const line = cssVar(propName, formatDTCGValue(t.$value, t.$type));
    if (mode === 'dark') dark.push(line);
    else if (mode === 'light') light.push(line);
    else root.push(line);
  }

  for (const t of blurTokens) {
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root, light, dark };
}

function generateThreeTierBorders(resolvedSemantic) {
  const root = [];
  const tokens = resolvedSemantic.filter(t => t.path[0] === 'border');

  for (const t of tokens) {
    const propName = t.path.join('-');
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root };
}

function generateThreeTierOpacity(resolvedSemantic) {
  const root = [];
  const tokens = resolvedSemantic.filter(t => t.path[0] === 'opacity');

  for (const t of tokens) {
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root };
}

function generateThreeTierZIndex(resolvedSemantic) {
  const root = [];
  const tokens = resolvedSemantic.filter(t => t.path[0] === 'z');

  for (const t of tokens) {
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root };
}

function generateThreeTierTransitions(resolvedSemantic) {
  const root = [];
  const durationTokens = resolvedSemantic.filter(t => t.path[0] === 'duration');
  const easingTokens = resolvedSemantic.filter(t => t.path[0] === 'easing');

  for (const t of durationTokens) {
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }
  for (const t of easingTokens) {
    const propName = t.path[t.path.length - 1];
    root.push(cssVar(propName, formatDTCGValue(t.$value, t.$type)));
  }

  return { root };
}

/**
 * Catch-all generator for tokens whose path[0] doesn't match standard categories.
 * Handles component-tier tokens like button.*, card.*, etc.
 * Emits --{path.join('-')} in the appropriate mode block.
 * Color tokens are included in OKLCH processing when --oklch is active.
 */
function generateThreeTierCatchAll(tokens) {
  const root = [];
  const light = [];
  const dark = [];
  const oklchColors = [];

  for (const t of tokens) {
    const mode = t.$extensions.mode;
    const pathParts = [...t.path];
    const cssValue = formatDTCGValue(t.$value, t.$type);

    if (mode === 'dark' || mode === 'light') {
      // Remove the mode segment (last element) from the path
      pathParts.pop();
      const propName = pathParts.join('-');
      const line = cssVar(propName, cssValue);
      if (mode === 'dark') dark.push(line);
      else light.push(line);

      if (OKLCH_ENABLED && t.$type === 'color' && isColorValue(cssValue)) {
        const oklch = toOklch(cssValue);
        if (oklch) oklchColors.push({ propName, hex: cssValue, oklch, bucket: mode });
      }
    } else {
      const propName = pathParts.join('-');
      root.push(cssVar(propName, cssValue));

      if (OKLCH_ENABLED && t.$type === 'color' && isColorValue(cssValue)) {
        const oklch = toOklch(cssValue);
        if (oklch) oklchColors.push({ propName, hex: cssValue, oklch, bucket: 'root' });
      }
    }
  }

  return OKLCH_ENABLED
    ? { root, light, dark, oklchColors }
    : { root, light, dark };
}

/**
 * Build generators for the three-tier pipeline.
 * Loads all tiers, resolves references depth-first, then returns
 * generator functions that produce the same CSS as the flat DTCG pipeline.
 */
function buildThreeTierGenerators() {
  // 1. Load primitives — raw values, no references to resolve
  const primitiveTokens = loadTierTokens('primitives');
  const primitiveRefMap = buildRefMap(primitiveTokens);

  // 2. Load semantic tokens, resolve references against primitives
  const rawSemanticTokens = loadTierTokens('semantic');
  const resolvedSemantic = resolveTierTokens(rawSemanticTokens, primitiveRefMap);
  const semanticRefMap = { ...primitiveRefMap, ...buildRefMap(resolvedSemantic) };

  // 3. Load component tokens, resolve against primitives + semantic
  const rawComponentTokens = loadTierTokens('component');
  const resolvedComponent = resolveTierTokens(rawComponentTokens, semanticRefMap);

  // Merge semantic + component for CSS generation (component overrides/extends)
  const allResolved = [...resolvedSemantic, ...resolvedComponent];

  const tierCount = {
    primitives: primitiveTokens.length,
    semantic: resolvedSemantic.length,
    component: resolvedComponent.length
  };
  console.log(`  Tiers: ${tierCount.primitives} primitives, ${tierCount.semantic} semantic, ${tierCount.component} component`);

  const generators = [
    { name: 'colors', fn: () => generateThreeTierColors(allResolved) },
    { name: 'sizing', fn: () => generateThreeTierSizing(allResolved) },
    { name: 'typography', fn: () => generateThreeTierTypography(allResolved) },
    { name: 'radii', fn: () => generateThreeTierRadii(allResolved) },
    { name: 'shadows', fn: () => generateThreeTierShadows(allResolved) },
    { name: 'borders', fn: () => generateThreeTierBorders(allResolved) },
    { name: 'opacity', fn: () => generateThreeTierOpacity(allResolved) },
    { name: 'z-index', fn: () => generateThreeTierZIndex(allResolved) },
    { name: 'transitions', fn: () => generateThreeTierTransitions(allResolved) },
  ];

  // Catch-all: emit tokens whose path[0] doesn't match any standard category.
  // This covers component-tier tokens like button.*, card.*, etc.
  const standardPrefixes = new Set([
    'color', 'shadow', 'blur', 'font', 'line-height', 'font-weight-composite',
    'size', 'space', 'radius', 'border', 'opacity', 'z', 'duration', 'easing'
  ]);

  const remainingTokens = allResolved.filter(t => !standardPrefixes.has(t.path[0]));

  if (remainingTokens.length > 0) {
    // Group by path[0] for organized CSS comments
    const groups = {};
    for (const t of remainingTokens) {
      const group = t.path[0];
      if (!groups[group]) groups[group] = [];
      groups[group].push(t);
    }

    for (const [group, tokens] of Object.entries(groups)) {
      generators.push({
        name: group,
        fn: () => generateThreeTierCatchAll(tokens)
      });
    }
  }

  return generators;
}

// ============================================================
// MODERN CSS FEATURES (--modern-css flag)
// ============================================================
// Progressive enhancement: appended after standard output.
// - color-mix() for hover/active derived states on accent/action colors
// - light-dark() for tokens with both dark and light values
// - @property for typed custom properties (transitions, validation)
// - Relative color syntax for shade generation (requires --oklch)
// Browser support: Chrome 111+, Safari 16.4+, Firefox 113+

/**
 * Detect whether a CSS property name represents an accent or action color
 * that should get hover/active derived states via color-mix().
 * Matches: accent-*, modeless-brand, modeless-destructive, modeless-teal, etc.
 * Excludes shadow colors, overlays, and alpha-variant tokens (e.g. -24 suffix).
 */
function isAccentOrActionColor(propName) {
  // Must be a color property
  if (!propName.startsWith('color-')) return false;
  const rest = propName.slice('color-'.length);
  // Exclude shadow colors
  if (rest.startsWith('shadow-')) return false;
  // Exclude overlay colors
  if (rest.includes('overlay')) return false;
  // Exclude alpha-variant tokens (e.g. modeless-white-24, modeless-black-24)
  if (/-([\d]+)$/.test(rest)) return false;
  // Include accent-* tokens
  if (rest.startsWith('accent-')) return true;
  // Include modeless brand/destructive/teal (action colors)
  if (rest.startsWith('modeless-') && !rest.includes('white') && !rest.includes('black')) return true;
  return false;
}

/**
 * Generate @property declarations for typed custom properties.
 * Colors get syntax '<color>', spacing/sizing get '<length>'.
 * Returns an array of CSS @property rule strings.
 */
function generatePropertyDeclarations(rootVars, darkVars) {
  const declarations = [];
  const seen = new Set();

  // Helper: extract property name and value from a cssVar line
  function parseCssVarLine(line) {
    const match = line.match(/^\s*--([^:]+):\s*(.+);$/);
    if (!match) return null;
    return { name: match[1], value: match[2] };
  }

  // Helper: determine syntax type from property name and value
  function inferSyntax(name, value) {
    if (name.startsWith('color-')) return '<color>';
    // shadow-small/medium/large are composite box-shadow values, not typeable
    if (name.startsWith('shadow-')) return null;
    if (name.startsWith('size-') || name.startsWith('space-') ||
        name.startsWith('border-width-') || name.startsWith('blur-')) return '<length>';
    if (name.startsWith('radius-')) return '<length>';
    if (name.startsWith('font-size-') || name.startsWith('line-height-')) return '<length>';
    if (name.startsWith('opacity-')) return '<number>';
    if (name.startsWith('z-')) return '<integer>';
    if (name.startsWith('font-weight-')) return '<number>';
    if (name.startsWith('duration-')) return '<time>';
    return null; // Skip tokens we can't type (font-family, easing, border-style)
  }

  // Process root vars first (they provide initial values)
  const allLines = [...rootVars, ...darkVars];
  for (const line of allLines) {
    const parsed = parseCssVarLine(line);
    if (!parsed) continue;
    if (seen.has(parsed.name)) continue;

    const syntax = inferSyntax(parsed.name, parsed.value);
    if (!syntax) continue;

    seen.add(parsed.name);
    declarations.push(
      `@property --${parsed.name} {\n` +
      `  syntax: '${syntax}';\n` +
      `  inherits: true;\n` +
      `  initial-value: ${parsed.value};\n` +
      `}`
    );
  }

  return declarations;
}

/**
 * Generate color-mix() derived states for accent/action colors.
 * Produces hover (90% with white) and active (80% with black) variants.
 * Returns { root: [], dark: [], light: [] } with cssVar lines.
 */
function generateColorMixVars(rootVars, darkVars, lightVars) {
  const result = { root: [], dark: [], light: [] };

  function processVars(vars, bucket) {
    for (const line of vars) {
      const match = line.match(/^\s*--(color-[^:]+):\s*(.+);$/);
      if (!match) continue;
      const propName = match[1];
      if (!isAccentOrActionColor(propName)) continue;

      result[bucket].push(
        `  --${propName}-hover: color-mix(in oklch, var(--${propName}) 90%, white);`
      );
      result[bucket].push(
        `  --${propName}-active: color-mix(in oklch, var(--${propName}) 80%, black);`
      );
    }
  }

  processVars(rootVars, 'root');
  processVars(darkVars, 'dark');
  processVars(lightVars, 'light');

  return result;
}

/**
 * Generate light-dark() declarations for tokens that exist in both dark and light.
 * Returns an array of cssVar lines for :root.
 * Requires color-scheme: light dark on :root.
 */
function generateLightDarkVars(darkVars, lightVars) {
  const lines = [];

  // Build maps: propName -> value for each mode
  const darkMap = {};
  const lightMap = {};

  for (const line of darkVars) {
    const match = line.match(/^\s*--([^:]+):\s*(.+);$/);
    if (match) darkMap[match[1]] = match[2];
  }
  for (const line of lightVars) {
    const match = line.match(/^\s*--([^:]+):\s*(.+);$/);
    if (match) lightMap[match[1]] = match[2];
  }

  // Emit light-dark() only for color properties that exist in both modes.
  // light-dark() is a CSS color function — not valid for non-color values like box-shadow.
  for (const prop of Object.keys(darkMap)) {
    if (!lightMap[prop]) continue;
    if (!prop.startsWith('color-')) continue;
    // light-dark() takes (light-value, dark-value)
    lines.push(`  --${prop}: light-dark(${lightMap[prop]}, ${darkMap[prop]});`);
  }

  return lines;
}

/**
 * Generate relative color syntax shade variants for accent/action colors.
 * Only active when both --modern-css and --oklch are enabled.
 * Produces lighter (L * 1.2) and darker (L * 0.8) variants.
 * Returns { root: [], dark: [], light: [] } with cssVar lines.
 */
function generateRelativeColorVars(rootVars, darkVars, lightVars) {
  const result = { root: [], dark: [], light: [] };

  function processVars(vars, bucket) {
    for (const line of vars) {
      const match = line.match(/^\s*--(color-[^:]+):\s*(.+);$/);
      if (!match) continue;
      const propName = match[1];
      if (!isAccentOrActionColor(propName)) continue;

      result[bucket].push(
        `  --${propName}-lighter: oklch(from var(--${propName}) calc(l * 1.2) c h);`
      );
      result[bucket].push(
        `  --${propName}-darker: oklch(from var(--${propName}) calc(l * 0.8) c h);`
      );
    }
  }

  processVars(rootVars, 'root');
  processVars(darkVars, 'dark');
  processVars(lightVars, 'light');

  return result;
}

// ============================================================
// ASSEMBLY (shared between all pipelines)
// ============================================================

function assemble(generators) {
  const rootVars = [];
  const lightVars = [];
  const darkVars = [];
  // Collect all OKLCH color entries from color generators
  const allOklchColors = [];

  for (const { name, fn } of generators) {
    const result = fn();

    if (result.root && result.root.length) {
      rootVars.push(`\n  /* ${name} */`);
      rootVars.push(...result.root);
    }
    if (result.light && result.light.length) {
      lightVars.push(`\n  /* ${name} */`);
      lightVars.push(...result.light);
    }
    if (result.dark && result.dark.length) {
      darkVars.push(`\n  /* ${name} */`);
      darkVars.push(...result.dark);
    }
    if (result.oklchColors && result.oklchColors.length) {
      allOklchColors.push(...result.oklchColors);
    }
  }

  const sections = [];

  sections.push(`/* tokens.css — Generated from v2/tokens/*.json */`);
  sections.push(`/* Do not edit manually. Run: node scripts/generate.js */`);
  sections.push(`/* Generated: ${new Date().toISOString().split('T')[0]} */\n`);

  sections.push(`:root {${rootVars.join('\n')}\n}\n`);
  sections.push(`.dark {${darkVars.join('\n')}\n}\n`);
  sections.push(`.light {${lightVars.join('\n')}\n}\n`);

  const nestIndent = (vars) => vars.join('\n').split('\n').map(l => l ? '  ' + l : l).join('\n');

  sections.push(`/* OS preference fallback (when no .dark/.light class is set) */`);
  sections.push(`@media (prefers-color-scheme: dark) {\n  :root:not(.dark):not(.light) {${nestIndent(darkVars)}\n  }\n}\n`);
  sections.push(`@media (prefers-color-scheme: light) {\n  :root:not(.dark):not(.light) {${nestIndent(lightVars)}\n  }\n}`);

  // --- OKLCH @supports block ---
  if (OKLCH_ENABLED && allOklchColors.length > 0) {
    sections.push('');
    sections.push(`/* OKLCH color space — perceptually uniform, wider gamut */`);
    sections.push(`/* Hex fallbacks above; OKLCH overrides below for supporting browsers */`);

    // Group colors by bucket
    const byBucket = { root: [], dark: [], light: [] };
    for (const c of allOklchColors) {
      byBucket[c.bucket].push(c);
    }

    const supportsLines = [];
    supportsLines.push(`@supports (color: oklch(0% 0 0)) {`);

    // :root — shared/modeless colors
    if (byBucket.root.length > 0) {
      supportsLines.push(`  :root {`);
      for (const c of byBucket.root) {
        supportsLines.push(`    --${c.propName}: ${c.oklch};`);
        supportsLines.push(`    --${c.propName}-hex: ${c.hex};`);
      }
      supportsLines.push(`  }\n`);
    }

    // .dark
    if (byBucket.dark.length > 0) {
      supportsLines.push(`  .dark {`);
      for (const c of byBucket.dark) {
        supportsLines.push(`    --${c.propName}: ${c.oklch};`);
        supportsLines.push(`    --${c.propName}-hex: ${c.hex};`);
      }
      supportsLines.push(`  }\n`);
    }

    // .light
    if (byBucket.light.length > 0) {
      supportsLines.push(`  .light {`);
      for (const c of byBucket.light) {
        supportsLines.push(`    --${c.propName}: ${c.oklch};`);
        supportsLines.push(`    --${c.propName}-hex: ${c.hex};`);
      }
      supportsLines.push(`  }\n`);
    }

    // OS preference fallbacks inside @supports
    if (byBucket.dark.length > 0) {
      supportsLines.push(`  @media (prefers-color-scheme: dark) {`);
      supportsLines.push(`    :root:not(.dark):not(.light) {`);
      for (const c of byBucket.dark) {
        supportsLines.push(`      --${c.propName}: ${c.oklch};`);
        supportsLines.push(`      --${c.propName}-hex: ${c.hex};`);
      }
      supportsLines.push(`    }`);
      supportsLines.push(`  }\n`);
    }

    if (byBucket.light.length > 0) {
      supportsLines.push(`  @media (prefers-color-scheme: light) {`);
      supportsLines.push(`    :root:not(.dark):not(.light) {`);
      for (const c of byBucket.light) {
        supportsLines.push(`      --${c.propName}: ${c.oklch};`);
        supportsLines.push(`      --${c.propName}-hex: ${c.hex};`);
      }
      supportsLines.push(`    }`);
      supportsLines.push(`  }`);
    }

    supportsLines.push(`}`);
    sections.push(supportsLines.join('\n'));
  }

  // --- Modern CSS progressive enhancement (--modern-css flag) ---
  if (MODERN_CSS_ENABLED) {
    sections.push('');
    sections.push(`/* Modern CSS — progressive enhancement */`);
    sections.push(`/* Browser support: Chrome 111+, Safari 16.4+, Firefox 113+ */`);

    // 1. @property declarations (top of modern section — unsupported browsers ignore them)
    const propertyDecls = generatePropertyDeclarations(rootVars, darkVars);
    if (propertyDecls.length > 0) {
      sections.push('');
      sections.push(`/* @property — typed custom properties (enables transitions, validation) */`);
      sections.push(propertyDecls.join('\n\n'));
    }

    // 2. color-mix() for hover/active derived states
    const colorMix = generateColorMixVars(rootVars, darkVars, lightVars);
    const hasColorMix = colorMix.root.length > 0 || colorMix.dark.length > 0 || colorMix.light.length > 0;
    if (hasColorMix) {
      sections.push('');
      sections.push(`/* color-mix() — runtime hover/active derived states */`);
      const cmLines = [];
      cmLines.push(`@supports (color: color-mix(in oklch, red, blue)) {`);
      if (colorMix.root.length > 0) {
        cmLines.push(`  :root {`);
        cmLines.push(...colorMix.root.map(l => '  ' + l));
        cmLines.push(`  }\n`);
      }
      if (colorMix.dark.length > 0) {
        cmLines.push(`  .dark {`);
        cmLines.push(...colorMix.dark.map(l => '  ' + l));
        cmLines.push(`  }\n`);
      }
      if (colorMix.light.length > 0) {
        cmLines.push(`  .light {`);
        cmLines.push(...colorMix.light.map(l => '  ' + l));
        cmLines.push(`  }`);
      }
      cmLines.push(`}`);
      sections.push(cmLines.join('\n'));
    }

    // 3. light-dark() for theme values
    const lightDarkLines = generateLightDarkVars(darkVars, lightVars);
    if (lightDarkLines.length > 0) {
      sections.push('');
      sections.push(`/* light-dark() — single-property theme values (requires color-scheme on :root) */`);
      const ldLines = [];
      ldLines.push(`@supports (color: light-dark(red, blue)) {`);
      ldLines.push(`  :root {`);
      ldLines.push(`    color-scheme: light dark;`);
      ldLines.push(...lightDarkLines.map(l => '  ' + l));
      ldLines.push(`  }`);
      ldLines.push(`}`);
      sections.push(ldLines.join('\n'));
    }

    // 4. Relative color syntax shade generation (requires --oklch)
    if (OKLCH_ENABLED) {
      const relColor = generateRelativeColorVars(rootVars, darkVars, lightVars);
      const hasRelColor = relColor.root.length > 0 || relColor.dark.length > 0 || relColor.light.length > 0;
      if (hasRelColor) {
        sections.push('');
        sections.push(`/* Relative color syntax — OKLCH shade generation */`);
        const rcLines = [];
        rcLines.push(`@supports (color: oklch(from red l c h)) {`);
        if (relColor.root.length > 0) {
          rcLines.push(`  :root {`);
          rcLines.push(...relColor.root.map(l => '  ' + l));
          rcLines.push(`  }\n`);
        }
        if (relColor.dark.length > 0) {
          rcLines.push(`  .dark {`);
          rcLines.push(...relColor.dark.map(l => '  ' + l));
          rcLines.push(`  }\n`);
        }
        if (relColor.light.length > 0) {
          rcLines.push(`  .light {`);
          rcLines.push(...relColor.light.map(l => '  ' + l));
          rcLines.push(`  }`);
        }
        rcLines.push(`}`);
        sections.push(rcLines.join('\n'));
      }
    }
  }

  return sections.join('\n');
}

// --- Main ---

function generate() {
  const format = detectFormat();
  console.log(`  Format: ${format}`);
  if (OKLCH_ENABLED) console.log(`  OKLCH:  enabled`);
  if (MODERN_CSS_ENABLED) console.log(`  Modern: enabled`);

  let generators;

  if (format === 'three-tier') {
    generators = buildThreeTierGenerators();
  } else if (format === 'dtcg') {
    generators = [
      { name: 'colors', fn: generateDTCGColors },
      { name: 'sizing', fn: generateDTCGSizing },
      { name: 'typography', fn: generateDTCGTypography },
      { name: 'radii', fn: generateDTCGRadii },
      { name: 'shadows', fn: generateDTCGShadows },
      { name: 'borders', fn: generateDTCGBorders },
      { name: 'opacity', fn: generateDTCGOpacity },
      { name: 'z-index', fn: generateDTCGZIndex },
      { name: 'transitions', fn: generateDTCGTransitions },
    ];
  } else {
    generators = [
      { name: 'colors', fn: generateColors },
      { name: 'sizing', fn: generateSizing },
      { name: 'typography', fn: generateTypography },
      { name: 'radii', fn: generateRadii },
      { name: 'shadows', fn: generateShadows },
      { name: 'borders', fn: generateBorders },
      { name: 'opacity', fn: generateOpacity },
      { name: 'z-index', fn: generateZIndex },
      { name: 'transitions', fn: generateTransitions },
    ];
  }

  const css = assemble(generators);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, css + '\n', 'utf8');

  // Stats
  const lines = css.split('\n');
  const rootCount = lines.filter(l => l.match(/^\s{2}--/) && !l.match(/^\s{4}/)).length;
  const darkLines = [];
  let inDark = false;
  for (const line of lines) {
    if (line === '.dark {') inDark = true;
    if (inDark && line === '}') { inDark = false; continue; }
    if (inDark && line.match(/^\s{2}--/)) darkLines.push(line);
  }
  const themedCount = darkLines.length;
  const total = rootCount + themedCount;

  console.log(`Generated ${OUTPUT_FILE}`);
  console.log(`  :root    ${rootCount} shared vars`);
  console.log(`  .dark    ${themedCount} themed vars`);
  console.log(`  .light   ${themedCount} themed vars`);
  console.log(`  Total    ${total} unique custom properties`);
}

generate();
