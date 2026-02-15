/**
 * Named color system with merge lookup table.
 *
 * 12 named colors: 3 base, 3 primary, 6 secondary.
 *
 * Encoding: id = colorIndex + dots * NUM_COLORS + 1
 *   (0 is reserved for empty cells)
 *
 * Merge rules:
 *   - Forward merges: 9 specific pairs produce named results (0 dots).
 *   - Backward merges: secondary + one of its parents → parent with +1 dot.
 *   - Unlisted combos → blocked (canMerge returns false).
 *   - Same colorIndex → cannot merge.
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
export const NUM_COLORS = 12;

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
  ORANGE_IDX, VIOLET_IDX, CHARTREUSE_IDX,
  TEAL_IDX, TURQUOISE_IDX, INDIGO_IDX,
]);

export function tileTier(id: CellValue): number {
  if (id === 0) return -1;
  const ci = tileColorIndex(id);
  if (BASE_INDICES.has(ci)) return 0;
  if (PRIMARY_INDICES.has(ci)) return 1;
  if (SECONDARY_INDICES.has(ci)) return 2;
  return 0;
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
HEX_MAP[TEAL_IDX] = '#54ffc8';
HEX_MAP[TURQUOISE_IDX] = '#54b4ff';
HEX_MAP[INDIGO_IDX] = '#8054ff';

export function tileHex(id: CellValue): string {
  if (id === 0) return '#000000';
  return HEX_MAP[tileColorIndex(id)] ?? '#000000';
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
// Secondaries: no letter label (just show color)

/** Returns single-letter label for base/primary colors, null otherwise. */
export function tileLabel(id: CellValue): string | null {
  if (id === 0) return null;
  return LABEL_MAP[tileColorIndex(id)] ?? null;
}

/* ── Forward merge table ─────────────────────────────── */

function mergeKey(a: number, b: number): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return lo * NUM_COLORS + hi;
}

const FORWARD_MERGES = new Map<number, number>([
  [mergeKey(CYAN_IDX, MAGENTA_IDX), BLUE_IDX],
  [mergeKey(MAGENTA_IDX, YELLOW_IDX), RED_IDX],
  [mergeKey(YELLOW_IDX, CYAN_IDX), GREEN_IDX],
  [mergeKey(RED_IDX, YELLOW_IDX), ORANGE_IDX],
  [mergeKey(RED_IDX, MAGENTA_IDX), VIOLET_IDX],
  [mergeKey(GREEN_IDX, YELLOW_IDX), CHARTREUSE_IDX],
  [mergeKey(GREEN_IDX, CYAN_IDX), TEAL_IDX],
  [mergeKey(BLUE_IDX, CYAN_IDX), TURQUOISE_IDX],
  [mergeKey(BLUE_IDX, MAGENTA_IDX), INDIGO_IDX],
]);

/* ── Backward merge (secondary + parent → parent with +1 dot) ── */

const SECONDARY_PARENTS = new Map<number, number[]>([
  [ORANGE_IDX, [RED_IDX, YELLOW_IDX]],
  [VIOLET_IDX, [RED_IDX, MAGENTA_IDX]],
  [CHARTREUSE_IDX, [GREEN_IDX, YELLOW_IDX]],
  [TEAL_IDX, [GREEN_IDX, CYAN_IDX]],
  [TURQUOISE_IDX, [BLUE_IDX, CYAN_IDX]],
  [INDIGO_IDX, [BLUE_IDX, MAGENTA_IDX]],
]);

/* ── Merge logic ─────────────────────────────────────── */

/** Check if a pair is a backward merge (secondary + parent). */
function isBackward(ciA: number, ciB: number): boolean {
  const parentsA = SECONDARY_PARENTS.get(ciA);
  if (parentsA && parentsA.includes(ciB)) return true;
  const parentsB = SECONDARY_PARENTS.get(ciB);
  if (parentsB && parentsB.includes(ciA)) return true;
  return false;
}

export function canMerge(a: CellValue, b: CellValue): boolean {
  if (a === 0 || b === 0) return false;

  const ciA = tileColorIndex(a);
  const ciB = tileColorIndex(b);

  // Same color can never merge
  if (ciA === ciB) return false;

  // Only allow forward merges (in table) or backward merges (secondary + parent)
  if (FORWARD_MERGES.has(mergeKey(ciA, ciB))) return true;
  if (isBackward(ciA, ciB)) return true;

  return false;
}

export function mergeResult(a: CellValue, b: CellValue): CellValue {
  const ciA = tileColorIndex(a);
  const ciB = tileColorIndex(b);

  // Check forward merge table
  const fwd = FORWARD_MERGES.get(mergeKey(ciA, ciB));
  if (fwd !== undefined) {
    return encodeTile(fwd, 0);
  }

  // Backward merge: secondary + parent → parent with +1 dot
  const backA = tryBackwardMerge(ciA, ciB, a, b);
  if (backA !== null) return backA;
  const backB = tryBackwardMerge(ciB, ciA, b, a);
  if (backB !== null) return backB;

  // Should not reach here if canMerge was checked first
  return a;
}

function tryBackwardMerge(
  secIdx: number, parentIdx: number,
  _secTile: CellValue, parentTile: CellValue,
): CellValue | null {
  const parents = SECONDARY_PARENTS.get(secIdx);
  if (!parents) return null;
  if (!parents.includes(parentIdx)) return null;
  // Secondary merges backward into its parent; parent gains a dot
  const parentDots = tileDots(parentTile);
  return encodeTile(parentIdx, parentDots + 1);
}

/** True if this merge was a backward merge (secondary + parent). */
export function isBackwardMerge(a: CellValue, b: CellValue): boolean {
  if (a === 0 || b === 0) return false;
  return isBackward(tileColorIndex(a), tileColorIndex(b));
}

/* ── Base tile constants ─────────────────────────────── */

export const CYAN = encodeTile(CYAN_IDX, 0);
export const MAGENTA = encodeTile(MAGENTA_IDX, 0);
export const YELLOW = encodeTile(YELLOW_IDX, 0);
export const BASE_TILES: CellValue[] = [CYAN, MAGENTA, YELLOW];
