/**
 * Named color system with cross-color merge rules at every tier.
 *
 * 13 named colors across 4 tiers:
 *   Tier 0 (base):      Cyan, Magenta, Yellow
 *   Tier 1 (primary):   Blue, Red, Green
 *   Tier 2 (secondary): Orange, Indigo, Teal
 *   Tier 3 (tertiary):  Gray
 *
 * Encoding: id = colorIndex + dots * NUM_COLORS + 1
 *   (0 is reserved for empty cells)
 *
 * Merge rules (cross-color at each tier):
 *   Base:      C+M → Blue,  M+Y → Red,   Y+C → Green
 *   Primary:   B+R → Indigo, R+G → Orange, B+G → Teal
 *   Secondary: any two different secondaries → Gray
 *   Gray + Gray (same dots) → Gray with dots + 1.
 *   Same color never merges (except Gray+Gray).
 */

import type { CellValue } from './types';

/* ── Color indices ──────────────────────────────────────── */

export const CYAN_IDX = 0;
export const MAGENTA_IDX = 1;
export const YELLOW_IDX = 2;
export const BLUE_IDX = 3;
export const RED_IDX = 4;
export const GREEN_IDX = 5;
export const ORANGE_IDX = 6;
export const VIOLET_IDX = 7;
export const CHARTREUSE_IDX = 8;
export const TEAL_IDX = 9;
export const TURQUOISE_IDX = 10;
export const INDIGO_IDX = 11;
export const GRAY_IDX = 12;
export const BROWN_IDX = 13;
export const NUM_COLORS = 14;

/* ── Encoding / Decoding ──────────────────────────────── */

export function encodeTile(colorIndex: number, dots: number): CellValue {
  return colorIndex + dots * NUM_COLORS + 1;
}

export function tileColorIndex(id: CellValue): number {
  return (id - 1) % NUM_COLORS;
}

export function tileDots(id: CellValue): number {
  return Math.floor((id - 1) / NUM_COLORS);
}

/* ── Tier (for scoring) ──────────────────────────────── */

const BASE_INDICES = new Set([CYAN_IDX, MAGENTA_IDX, YELLOW_IDX]);
const PRIMARY_INDICES = new Set([BLUE_IDX, RED_IDX, GREEN_IDX]);
const SECONDARY_INDICES = new Set([
  ORANGE_IDX, VIOLET_IDX, INDIGO_IDX, TEAL_IDX, BROWN_IDX,
]);
const TERTIARY_INDICES = new Set([GRAY_IDX]);

export function tileTier(id: CellValue): number {
  if (id === 0) return -1;
  const ci = tileColorIndex(id);
  if (BASE_INDICES.has(ci)) return 0;
  if (PRIMARY_INDICES.has(ci)) return 1;
  if (SECONDARY_INDICES.has(ci)) return 2;
  if (TERTIARY_INDICES.has(ci)) return 3;
  return 0;
}

/* ── Display: dots ──────────────────────────────────── */

/**
 * Returns the number of white dots to display on a tile.
 * Dots indicate the tile's tier/value progression:
 *   Base (C/M/Y):        0 dots
 *   Primary (R/G/B):     1 dot
 *   Secondary (O/V/I/T): 2 dots
 *   Gray:                2 dots + 1 per gray merge
 */
export function tileDisplayDots(id: CellValue): number {
  if (id === 0) return 0;
  const tier = tileTier(id);
  if (tier <= 0) return 0;
  if (tier <= 2) return tier;
  // Gray (tier 3): starts at 2, +1 per gray merge
  return 2 + tileDots(id);
}

/* ── Display: hex colors ─────────────────────────────── */

const HEX_MAP: string[] = [];
HEX_MAP[CYAN_IDX] = '#87FBE9';
HEX_MAP[MAGENTA_IDX] = '#CA4DF2';
HEX_MAP[YELLOW_IDX] = '#F4CF5F';
HEX_MAP[BLUE_IDX] = '#5764F5';
HEX_MAP[RED_IDX] = '#EB5560';
HEX_MAP[GREEN_IDX] = '#77D054';
HEX_MAP[ORANGE_IDX] = '#E98028';
HEX_MAP[VIOLET_IDX] = '#CA4DF2';
HEX_MAP[CHARTREUSE_IDX] = '#77D054';
HEX_MAP[TEAL_IDX] = '#58AC91';
HEX_MAP[TURQUOISE_IDX] = '#5764F5';
HEX_MAP[INDIGO_IDX] = '#964EF5';
// Gray uses a dynamic scale (dark → light → white) — see grayHex() below.
// HEX_MAP[GRAY_IDX] is intentionally left unset.
HEX_MAP[BROWN_IDX] = '#995037';

/**
 * Returns a gray hex that lightens with each merge.
 *   dots 0 → dark gray  (#616161)
 *   dots 1 → mid gray   (#b1b1b1)
 *   dots 2+ → white     (#FFFFFF)
 */
const GRAY_STEPS = ['#616161', '#b1b1b1', '#FFFFFF'];
function grayHex(dots: number): string {
  return GRAY_STEPS[Math.min(dots, GRAY_STEPS.length - 1)];
}

export function tileHex(id: CellValue): string {
  if (id === 0) return '#000000';
  const ci = tileColorIndex(id);
  if (ci === GRAY_IDX) return grayHex(tileDots(id));
  return HEX_MAP[ci] ?? '#000000';
}

/** Returns a suitable text color (black or white) for readability. */
export function tileTextColor(id: CellValue): string {
  const hex = tileHex(id);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/* ── Display: labels ─────────────────────────────────── */

const LABEL_MAP: (string | null)[] = [];
LABEL_MAP[CYAN_IDX] = 'C';
LABEL_MAP[MAGENTA_IDX] = 'M';
LABEL_MAP[YELLOW_IDX] = 'Y';
LABEL_MAP[BLUE_IDX] = 'B';
LABEL_MAP[RED_IDX] = 'R';
LABEL_MAP[GREEN_IDX] = 'G';
LABEL_MAP[ORANGE_IDX] = 'O';
LABEL_MAP[VIOLET_IDX] = 'V';
LABEL_MAP[INDIGO_IDX] = 'I';
LABEL_MAP[TEAL_IDX] = 'T';
LABEL_MAP[BROWN_IDX] = 'Br';

/** Gray labels by dots: dark → mid → (white has no label, shows Mix instead). */
const GRAY_LABEL = ['Dk', 'Md'];

/** Returns short label for named colors, null otherwise. */
export function tileLabel(id: CellValue): string | null {
  if (id === 0) return null;
  const ci = tileColorIndex(id);
  if (ci === GRAY_IDX) return GRAY_LABEL[tileDots(id)] ?? null;
  return LABEL_MAP[ci] ?? null;
}

/* ── Cross-color merge map (base tier: C+M→B, M+Y→R, Y+C→G) ── */

const CROSS_MERGE = new Map<string, number>();

function addCross(a: number, b: number, result: number): void {
  const key = a < b ? `${a},${b}` : `${b},${a}`;
  CROSS_MERGE.set(key, result);
}

// Base tier: C+M→B, M+Y→R, Y+C→G
addCross(CYAN_IDX, MAGENTA_IDX, BLUE_IDX);
addCross(MAGENTA_IDX, YELLOW_IDX, RED_IDX);
addCross(YELLOW_IDX, CYAN_IDX, GREEN_IDX);

// Primary tier: B+R→I, R+G→O, B+G→T
addCross(BLUE_IDX, RED_IDX, INDIGO_IDX);
addCross(RED_IDX, GREEN_IDX, ORANGE_IDX);
addCross(BLUE_IDX, GREEN_IDX, TEAL_IDX);

// Secondary tier: any two different secondaries → Gray
addCross(INDIGO_IDX, ORANGE_IDX, GRAY_IDX);
addCross(ORANGE_IDX, TEAL_IDX, GRAY_IDX);
addCross(INDIGO_IDX, TEAL_IDX, GRAY_IDX);

function crossMergeResult(ciA: number, ciB: number): number | undefined {
  const key = ciA < ciB ? `${ciA},${ciB}` : `${ciB},${ciA}`;
  return CROSS_MERGE.get(key);
}

/* ── Merge logic ─────────────────────────────────────── */

/**
 * Cross-color mixing at every tier:
 *   - Base:      two different base colors with same dots
 *   - Primary:   two different primaries with same dots
 *   - Secondary: two different secondaries with same dots → Gray
 *   - Gray:      same color (Gray) and same dots
 */
export function canMerge(a: CellValue, b: CellValue): boolean {
  if (a === 0 || b === 0) return false;
  const ciA = tileColorIndex(a);
  const ciB = tileColorIndex(b);
  if (tileDots(a) !== tileDots(b)) return false;

  // Gray + Gray (same dots)
  if (ciA === GRAY_IDX && ciB === GRAY_IDX) return true;

  // Cross-color merge: two different colors in the same tier
  if (ciA === ciB) return false; // same color never merges (except Gray above)
  if (BASE_INDICES.has(ciA) && BASE_INDICES.has(ciB)) return true;
  if (PRIMARY_INDICES.has(ciA) && PRIMARY_INDICES.has(ciB)) return true;
  if (SECONDARY_INDICES.has(ciA) && SECONDARY_INDICES.has(ciB)) return true;

  return false;
}

/**
 * Returns the merged tile value.
 *   - Cross-color: looks up CROSS_MERGE table
 *   - Gray: increments dots
 */
export function mergeResult(a: CellValue, b: CellValue): CellValue {
  const ciA = tileColorIndex(a);
  const ciB = tileColorIndex(b);
  const dots = tileDots(a);

  // Gray + Gray (same dots) → Gray with dots + 1
  if (ciA === GRAY_IDX) {
    return encodeTile(GRAY_IDX, dots + 1);
  }

  // Cross-color merge
  const result = crossMergeResult(ciA, ciB);
  if (result !== undefined) return encodeTile(result, dots);

  return a; // fallback
}

/* ── Next-color preview helpers ────────────────────── */

/**
 * Returns the hex color of the tile that this tile becomes when merged,
 * or null if there are multiple possible results (cross-color tiles)
 * or no next color (Gray).
 * Secondary tiles always produce Gray so they return gray hex.
 */
export function tileNextHex(id: CellValue): string | null {
  if (id === 0) return null;
  const ci = tileColorIndex(id);
  if (ci === GRAY_IDX) return null;
  // Secondary tiles always → Gray regardless of partner
  if (SECONDARY_INDICES.has(ci)) return grayHex(0);
  // Base and primary tiles have 2 possible results
  return null;
}

/**
 * Returns the short label of the tile that this tile becomes when merged,
 * or null if there are multiple possible results (cross-color tiles)
 * or no next color (Gray).
 * Secondary tiles always produce Gray so they return 'Gr'.
 */
export function tileNextLabel(id: CellValue): string | null {
  if (id === 0) return null;
  const ci = tileColorIndex(id);
  if (ci === GRAY_IDX) return null;
  // Secondary tiles always → Gray regardless of partner
  if (SECONDARY_INDICES.has(ci)) return 'Gr';
  // Base and primary tiles have 2 possible results
  return null;
}

/* ── Merge partners (for hint indicators) ────────────── */

/** Helper: returns the other two colors in a tier set. */
function otherTwo(ci: number, tier: Set<number>): number[] {
  const result: number[] = [];
  for (const idx of tier) {
    if (idx !== ci) result.push(idx);
  }
  return result;
}

/**
 * Returns color indices that this tile can merge with.
 * Cross-color: returns the other colors in the same tier.
 * Gray merges with Gray.
 */
export function getMergePartners(id: CellValue): number[] {
  if (id === 0) return [];
  const ci = tileColorIndex(id);
  if (ci === GRAY_IDX) return [GRAY_IDX];
  if (BASE_INDICES.has(ci)) return otherTwo(ci, BASE_INDICES);
  if (PRIMARY_INDICES.has(ci)) return otherTwo(ci, PRIMARY_INDICES);
  if (SECONDARY_INDICES.has(ci)) return otherTwo(ci, SECONDARY_INDICES);
  return [];
}

/* ── Base tile constants ─────────────────────────────── */

export const CYAN = encodeTile(CYAN_IDX, 0);
export const MAGENTA = encodeTile(MAGENTA_IDX, 0);
export const YELLOW = encodeTile(YELLOW_IDX, 0);
export const BASE_TILES: CellValue[] = [CYAN, MAGENTA, YELLOW];
export const PRIMARY_TILES: CellValue[] = [
  encodeTile(BLUE_IDX, 0),
  encodeTile(RED_IDX, 0),
  encodeTile(GREEN_IDX, 0),
];
export const SECONDARY_TILES: CellValue[] = [
  encodeTile(ORANGE_IDX, 0),
  encodeTile(VIOLET_IDX, 0),
  encodeTile(INDIGO_IDX, 0),
  encodeTile(TEAL_IDX, 0),
];
