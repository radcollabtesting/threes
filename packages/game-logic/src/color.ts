/**
 * Named color system with merge lookup table.
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
 * Merge rules:
 *   - Forward merges: specific pairs produce named results (carries max dots).
 *   - Any two different secondaries → Gray (0 dots).
 *   - Gray + Gray (same dots) → Gray with dots + 1.
 *   - Unlisted combos → blocked (canMerge returns false).
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
export const NUM_COLORS = 13;

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
  ORANGE_IDX, VIOLET_IDX, INDIGO_IDX, TEAL_IDX,
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
HEX_MAP[GRAY_IDX] = '#888888';

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
LABEL_MAP[ORANGE_IDX] = 'O';
LABEL_MAP[VIOLET_IDX] = 'V';
LABEL_MAP[INDIGO_IDX] = 'I';
LABEL_MAP[TEAL_IDX] = 'T';

/** Returns single-letter label for named colors, null otherwise. */
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
  // Tier 0 → Tier 1
  [mergeKey(CYAN_IDX, MAGENTA_IDX), BLUE_IDX],
  [mergeKey(MAGENTA_IDX, YELLOW_IDX), RED_IDX],
  [mergeKey(YELLOW_IDX, CYAN_IDX), GREEN_IDX],
  // Tier 1 → Tier 2
  [mergeKey(RED_IDX, YELLOW_IDX), ORANGE_IDX],
  [mergeKey(RED_IDX, MAGENTA_IDX), VIOLET_IDX],
  [mergeKey(RED_IDX, BLUE_IDX), VIOLET_IDX],
  [mergeKey(BLUE_IDX, MAGENTA_IDX), INDIGO_IDX],
  [mergeKey(BLUE_IDX, GREEN_IDX), TEAL_IDX],
]);

/* ── Merge logic ─────────────────────────────────────── */

export function canMerge(a: CellValue, b: CellValue): boolean {
  if (a === 0 || b === 0) return false;

  const ciA = tileColorIndex(a);
  const ciB = tileColorIndex(b);

  // Gray + Gray: same dots required
  if (ciA === GRAY_IDX && ciB === GRAY_IDX) {
    return tileDots(a) === tileDots(b);
  }

  // Same color can never merge (except Gray handled above)
  if (ciA === ciB) return false;

  // Forward merges (in table)
  if (FORWARD_MERGES.has(mergeKey(ciA, ciB))) return true;

  // Two different secondaries → Gray
  if (SECONDARY_INDICES.has(ciA) && SECONDARY_INDICES.has(ciB)) return true;

  return false;
}

export function mergeResult(a: CellValue, b: CellValue): CellValue {
  const ciA = tileColorIndex(a);
  const ciB = tileColorIndex(b);

  // Gray + Gray (same dots) → Gray with dots + 1
  if (ciA === GRAY_IDX && ciB === GRAY_IDX) {
    return encodeTile(GRAY_IDX, tileDots(a) + 1);
  }

  // Two different secondaries → Gray with 0 dots
  if (SECONDARY_INDICES.has(ciA) && SECONDARY_INDICES.has(ciB)) {
    return encodeTile(GRAY_IDX, 0);
  }

  // Check forward merge table — dots carry (max of inputs)
  const fwd = FORWARD_MERGES.get(mergeKey(ciA, ciB));
  if (fwd !== undefined) {
    const carryDots = Math.max(tileDots(a), tileDots(b));
    return encodeTile(fwd, carryDots);
  }

  // Should not reach here if canMerge was checked first
  return a;
}

/* ── Merge partners (for hint dots) ────────────────── */

/** Returns color indices that this tile can merge with. */
export function getMergePartners(id: CellValue): number[] {
  if (id === 0) return [];
  const ci = tileColorIndex(id);
  const partners: number[] = [];

  // Gray merges with Gray (same dots — but partners just lists color indices)
  if (ci === GRAY_IDX) {
    return [GRAY_IDX];
  }

  for (let other = 0; other < NUM_COLORS; other++) {
    if (other === ci) continue;
    if (FORWARD_MERGES.has(mergeKey(ci, other))) {
      partners.push(other);
    } else if (SECONDARY_INDICES.has(ci) && SECONDARY_INDICES.has(other)) {
      partners.push(other);
    }
  }
  return partners;
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
