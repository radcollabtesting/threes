/**
 * Named color system with same-color merge rules.
 *
 * 13 named colors across 4 tiers:
 *   Tier 0 (base):      Cyan, Magenta, Yellow
 *   Tier 1 (primary):   Blue, Red, Green
 *   Tier 2 (secondary): Orange, Violet, Indigo, Teal
 *   Tier 3 (tertiary):  Gray
 *
 * Encoding: id = colorIndex + dots * NUM_COLORS + 1
 *   (0 is reserved for empty cells)
 *
 * Merge rules (deterministic same-color matching):
 *   - Two tiles of the same color and same dots merge.
 *   - Each color has a fixed result (carries dots):
 *     Cyan → Blue,  Magenta → Red,  Yellow → Green
 *     Blue → Indigo,  Red → Orange,  Green → Teal
 *     Indigo / Orange / Teal → Gray
 *   - Gray + Gray (same dots) → Gray with dots + 1.
 *   - Different colors → blocked (canMerge returns false).
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
HEX_MAP[CYAN_IDX] = '#53ffec';
HEX_MAP[MAGENTA_IDX] = '#e854ff';
HEX_MAP[YELLOW_IDX] = '#ffd654';
HEX_MAP[BLUE_IDX] = '#5476ff';
HEX_MAP[RED_IDX] = '#ff5468';
HEX_MAP[GREEN_IDX] = '#68ff54';
HEX_MAP[ORANGE_IDX] = '#ffa854';
HEX_MAP[VIOLET_IDX] = '#b454ff';
HEX_MAP[CHARTREUSE_IDX] = '#c8ff54';
HEX_MAP[TEAL_IDX] = '#2db890';
HEX_MAP[TURQUOISE_IDX] = '#54b4ff';
HEX_MAP[INDIGO_IDX] = '#8054ff';
// Gray uses a dynamic scale — see grayHex() below.
// HEX_MAP[GRAY_IDX] is intentionally left unset.
HEX_MAP[BROWN_IDX] = '#A0522D';

/**
 * Returns a gray hex that darkens with each merge.
 * Starts light (#B0B0B0) and steps down ~26 per merge, clamped at #2E2E2E.
 */
function grayHex(dots: number): string {
  const start = 0xB0; // 176 — light gray
  const floor = 0x2E; //  46 — near black
  const step = 26;
  const v = Math.max(floor, start - dots * step);
  const h = v.toString(16).padStart(2, '0');
  return `#${h}${h}${h}`;
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

/** Returns single-letter label for named colors, null otherwise. */
export function tileLabel(id: CellValue): string | null {
  if (id === 0) return null;
  return LABEL_MAP[tileColorIndex(id)] ?? null;
}

/* ── Deterministic merge map: color → result color ──── */

const MERGE_MAP: Record<number, number> = {
  [CYAN_IDX]: BLUE_IDX,        // C+C → B
  [MAGENTA_IDX]: RED_IDX,      // M+M → R
  [YELLOW_IDX]: GREEN_IDX,     // Y+Y → G
  [BLUE_IDX]: INDIGO_IDX,      // B+B → I
  [RED_IDX]: ORANGE_IDX,       // R+R → O
  [GREEN_IDX]: TEAL_IDX,       // G+G → T
  [ORANGE_IDX]: GRAY_IDX,      // O+O → Gray
  [VIOLET_IDX]: GRAY_IDX,      // V+V → Gray
  [CHARTREUSE_IDX]: GRAY_IDX,  // Ch+Ch → Gray
  [TEAL_IDX]: GRAY_IDX,        // T+T → Gray
  [TURQUOISE_IDX]: GRAY_IDX,   // Tu+Tu → Gray
  [INDIGO_IDX]: GRAY_IDX,      // I+I → Gray
  [BROWN_IDX]: GRAY_IDX,       // Br+Br → Gray
};

/* ── Merge logic ─────────────────────────────────────── */

/**
 * Two tiles can merge if they have the same color and same dots.
 * This gives the simple "match two identical tiles" rule.
 */
export function canMerge(a: CellValue, b: CellValue): boolean {
  if (a === 0 || b === 0) return false;
  return tileColorIndex(a) === tileColorIndex(b) && tileDots(a) === tileDots(b);
}

/**
 * Returns the merged tile value. Fully deterministic — each color
 * has exactly one result color (see MERGE_MAP).
 */
export function mergeResult(a: CellValue, b: CellValue): CellValue {
  const ci = tileColorIndex(a);
  const dots = tileDots(a);

  // Gray + Gray (same dots) → Gray with dots + 1
  if (ci === GRAY_IDX) {
    return encodeTile(GRAY_IDX, dots + 1);
  }

  const nextColor = MERGE_MAP[ci];
  if (nextColor === undefined) {
    // Should not reach here if canMerge was checked first
    return a;
  }

  return encodeTile(nextColor, dots);
}

/* ── Merge partners (for hint indicators) ────────────── */

/** Returns color indices that this tile can merge with (always its own color). */
export function getMergePartners(id: CellValue): number[] {
  if (id === 0) return [];
  return [tileColorIndex(id)];
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
