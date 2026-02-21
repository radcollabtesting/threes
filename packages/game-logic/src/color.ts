/**
 * Color breakdown system with split mechanics.
 *
 * 16 named colors forming a cyclic breakdown chain:
 *
 *   Black → LightGray →(milestone)→ C,M,Y → LightC,LightM,LightY → White
 *   White → DarkGray →(milestone)→ R,G,B → DarkR,DarkG,DarkB → Black
 *
 * Matching 2 of the same color "splits" them into component colors.
 * Regular splits: 2 tiles → 2 output tiles (to queue).
 * Milestone splits: 2 tiles → 3 output tiles (1 on merge point with 2x, 2 to queue).
 *
 * Encoding: id = colorIndex + dots * NUM_COLORS + 1
 *   (0 is reserved for empty cells)
 */

import type { CellValue } from './types';

/* ── Color indices ──────────────────────────────────────── */

export const BLACK_IDX = 0;
export const LIGHT_GRAY_IDX = 1;
export const DARK_GRAY_IDX = 2;
export const WHITE_IDX = 3;
export const CYAN_IDX = 4;
export const MAGENTA_IDX = 5;
export const YELLOW_IDX = 6;
export const LIGHT_CYAN_IDX = 7;
export const LIGHT_MAGENTA_IDX = 8;
export const LIGHT_YELLOW_IDX = 9;
export const RED_IDX = 10;
export const GREEN_IDX = 11;
export const BLUE_IDX = 12;
export const DARK_RED_IDX = 13;
export const DARK_GREEN_IDX = 14;
export const DARK_BLUE_IDX = 15;
export const NUM_COLORS = 16;

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

/* ── Tiers (for scoring & display) ──────────────────────── */

/** Tier groupings for scoring:
 *   Tier 0: transition colors (Black, White, Light Gray, Dark Gray)
 *   Tier 1: primary colors (C,M,Y and R,G,B)
 *   Tier 2: variant colors (Light C/M/Y and Dark R/G/B)
 */
const TRANSITION_INDICES = new Set([BLACK_IDX, WHITE_IDX, LIGHT_GRAY_IDX, DARK_GRAY_IDX]);
const PRIMARY_INDICES = new Set([CYAN_IDX, MAGENTA_IDX, YELLOW_IDX, RED_IDX, GREEN_IDX, BLUE_IDX]);
const VARIANT_INDICES = new Set([
  LIGHT_CYAN_IDX, LIGHT_MAGENTA_IDX, LIGHT_YELLOW_IDX,
  DARK_RED_IDX, DARK_GREEN_IDX, DARK_BLUE_IDX,
]);

export function tileTier(id: CellValue): number {
  if (id === 0) return -1;
  const ci = tileColorIndex(id);
  if (TRANSITION_INDICES.has(ci)) return 0;
  if (PRIMARY_INDICES.has(ci)) return 1;
  if (VARIANT_INDICES.has(ci)) return 2;
  return 0;
}

/* ── Display: dots ──────────────────────────────────── */

/**
 * Returns the number of dots to display on a tile.
 * Used for visual tier distinction on the tile.
 */
export function tileDisplayDots(id: CellValue): number {
  if (id === 0) return 0;
  const ci = tileColorIndex(id);
  // Milestone colors (Light Gray, Dark Gray) get 1 dot
  if (ci === LIGHT_GRAY_IDX || ci === DARK_GRAY_IDX) return 1;
  // Primary colors get 2 dots
  if (PRIMARY_INDICES.has(ci)) return 2;
  // Variant colors get 1 dot
  if (VARIANT_INDICES.has(ci)) return 1;
  // Transition endpoints (Black, White) get 0 dots
  return 0;
}

/* ── Display: hex colors ─────────────────────────────── */

const HEX_MAP: string[] = [];
HEX_MAP[BLACK_IDX] = '#1A1A2E';
HEX_MAP[LIGHT_GRAY_IDX] = '#B8B8C8';
HEX_MAP[DARK_GRAY_IDX] = '#4A4A5A';
HEX_MAP[WHITE_IDX] = '#F0F0FF';
HEX_MAP[CYAN_IDX] = '#87FBE9';
HEX_MAP[MAGENTA_IDX] = '#CA4DF2';
HEX_MAP[YELLOW_IDX] = '#F4CF5F';
HEX_MAP[LIGHT_CYAN_IDX] = '#C3FDF4';
HEX_MAP[LIGHT_MAGENTA_IDX] = '#E4A6F9';
HEX_MAP[LIGHT_YELLOW_IDX] = '#F9E7AF';
HEX_MAP[RED_IDX] = '#EB5560';
HEX_MAP[GREEN_IDX] = '#77D054';
HEX_MAP[BLUE_IDX] = '#5764F5';
HEX_MAP[DARK_RED_IDX] = '#8B2530';
HEX_MAP[DARK_GREEN_IDX] = '#3B6A2A';
HEX_MAP[DARK_BLUE_IDX] = '#2B3278';

export function tileHex(id: CellValue): string {
  if (id === 0) return '#000000';
  const ci = tileColorIndex(id);
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
LABEL_MAP[BLACK_IDX] = 'BK';
LABEL_MAP[LIGHT_GRAY_IDX] = 'LG';
LABEL_MAP[DARK_GRAY_IDX] = 'DG';
LABEL_MAP[WHITE_IDX] = 'W';
LABEL_MAP[CYAN_IDX] = 'C';
LABEL_MAP[MAGENTA_IDX] = 'M';
LABEL_MAP[YELLOW_IDX] = 'Y';
LABEL_MAP[LIGHT_CYAN_IDX] = 'LC';
LABEL_MAP[LIGHT_MAGENTA_IDX] = 'LM';
LABEL_MAP[LIGHT_YELLOW_IDX] = 'LY';
LABEL_MAP[RED_IDX] = 'R';
LABEL_MAP[GREEN_IDX] = 'G';
LABEL_MAP[BLUE_IDX] = 'B';
LABEL_MAP[DARK_RED_IDX] = 'DR';
LABEL_MAP[DARK_GREEN_IDX] = 'DG';
LABEL_MAP[DARK_BLUE_IDX] = 'DB';

/** Returns short label for named colors, null otherwise. */
export function tileLabel(id: CellValue): string | null {
  if (id === 0) return null;
  const ci = tileColorIndex(id);
  return LABEL_MAP[ci] ?? null;
}

/* ── Split rules ─────────────────────────────────────── */

/**
 * Split map: each color maps to its breakdown outputs.
 * Array of 2 = regular split (both go to queue, merge point empties).
 * Array of 3 = milestone split (1 on merge point with 2x, 2 to queue).
 */
export const SPLIT_MAP: Record<number, number[]> = {
  // === Subtractive chain (Black → White) ===
  [BLACK_IDX]: [LIGHT_GRAY_IDX, LIGHT_GRAY_IDX],
  [LIGHT_GRAY_IDX]: [CYAN_IDX, MAGENTA_IDX, YELLOW_IDX],         // milestone!
  [CYAN_IDX]: [LIGHT_CYAN_IDX, LIGHT_CYAN_IDX],
  [MAGENTA_IDX]: [LIGHT_MAGENTA_IDX, LIGHT_MAGENTA_IDX],
  [YELLOW_IDX]: [LIGHT_YELLOW_IDX, LIGHT_YELLOW_IDX],
  [LIGHT_CYAN_IDX]: [WHITE_IDX, WHITE_IDX],
  [LIGHT_MAGENTA_IDX]: [WHITE_IDX, WHITE_IDX],
  [LIGHT_YELLOW_IDX]: [WHITE_IDX, WHITE_IDX],

  // === Additive chain (White → Black) ===
  [WHITE_IDX]: [DARK_GRAY_IDX, DARK_GRAY_IDX],
  [DARK_GRAY_IDX]: [RED_IDX, GREEN_IDX, BLUE_IDX],               // milestone!
  [RED_IDX]: [DARK_RED_IDX, DARK_RED_IDX],
  [GREEN_IDX]: [DARK_GREEN_IDX, DARK_GREEN_IDX],
  [BLUE_IDX]: [DARK_BLUE_IDX, DARK_BLUE_IDX],
  [DARK_RED_IDX]: [BLACK_IDX, BLACK_IDX],
  [DARK_GREEN_IDX]: [BLACK_IDX, BLACK_IDX],
  [DARK_BLUE_IDX]: [BLACK_IDX, BLACK_IDX],
};

/** Whether a color index triggers a milestone split (3 outputs). */
export function isMilestoneSplit(colorIndex: number): boolean {
  const outputs = SPLIT_MAP[colorIndex];
  return outputs !== undefined && outputs.length === 3;
}

/** Returns the split output color indices for a given color, or undefined. */
export function getSplitOutputs(colorIndex: number): number[] | undefined {
  return SPLIT_MAP[colorIndex];
}

/* ── Merge logic ─────────────────────────────────────── */

/**
 * Two tiles can merge (split) if they have the same color index.
 * Dots are not used in the split system (always 0).
 */
export function canMerge(a: CellValue, b: CellValue): boolean {
  if (a === 0 || b === 0) return false;
  return tileColorIndex(a) === tileColorIndex(b);
}

/**
 * Returns the split result for two matching tiles.
 * For regular splits: { outputs: [tile, tile], isMilestone: false }
 * For milestone splits: { outputs: [tile, tile, tile], isMilestone: true }
 *
 * The `outputs` are encoded CellValues (with dots=0).
 * For milestone splits, the first output goes on the merge point;
 * the remaining go to the queue.
 */
export interface SplitResult {
  outputs: CellValue[];
  isMilestone: boolean;
  /** Points awarded for this split */
  score: number;
}

/** Score per split by color index */
const SPLIT_SCORE: Record<number, number> = {
  [BLACK_IDX]: 3,
  [LIGHT_GRAY_IDX]: 81,        // milestone
  [CYAN_IDX]: 27,
  [MAGENTA_IDX]: 27,
  [YELLOW_IDX]: 27,
  [LIGHT_CYAN_IDX]: 9,
  [LIGHT_MAGENTA_IDX]: 9,
  [LIGHT_YELLOW_IDX]: 9,
  [WHITE_IDX]: 3,
  [DARK_GRAY_IDX]: 81,         // milestone
  [RED_IDX]: 27,
  [GREEN_IDX]: 27,
  [BLUE_IDX]: 27,
  [DARK_RED_IDX]: 9,
  [DARK_GREEN_IDX]: 9,
  [DARK_BLUE_IDX]: 9,
};

export function splitResult(a: CellValue, _b: CellValue): SplitResult | null {
  if (a === 0) return null;
  const ci = tileColorIndex(a);
  const splitOutputs = SPLIT_MAP[ci];
  if (!splitOutputs) return null;

  const milestone = splitOutputs.length === 3;
  const outputs = splitOutputs.map(idx => encodeTile(idx, 0));
  const score = SPLIT_SCORE[ci] ?? 0;

  return { outputs, isMilestone: milestone, score };
}

/**
 * Legacy mergeResult — returns the first output of the split.
 * Used for compatibility with drag preview (shows the merge point tile).
 * For regular splits, returns 0 (merge point empties).
 * For milestone splits, returns the first output tile.
 */
export function mergeResult(a: CellValue, b: CellValue): CellValue {
  const result = splitResult(a, b);
  if (!result) return a;
  if (result.isMilestone) return result.outputs[0];
  return 0; // regular split: merge point empties
}

/* ── Merge partners (for hint indicators) ────────────── */

/** Returns color indices that this tile can merge with (always its own color). */
export function getMergePartners(id: CellValue): number[] {
  if (id === 0) return [];
  return [tileColorIndex(id)];
}

/* ── Tile constants ─────────────────────────────────── */

export const BLACK = encodeTile(BLACK_IDX, 0);
export const LIGHT_GRAY = encodeTile(LIGHT_GRAY_IDX, 0);
export const DARK_GRAY = encodeTile(DARK_GRAY_IDX, 0);
export const WHITE = encodeTile(WHITE_IDX, 0);
export const CYAN = encodeTile(CYAN_IDX, 0);
export const MAGENTA = encodeTile(MAGENTA_IDX, 0);
export const YELLOW = encodeTile(YELLOW_IDX, 0);
export const LIGHT_CYAN = encodeTile(LIGHT_CYAN_IDX, 0);
export const LIGHT_MAGENTA = encodeTile(LIGHT_MAGENTA_IDX, 0);
export const LIGHT_YELLOW = encodeTile(LIGHT_YELLOW_IDX, 0);
export const RED = encodeTile(RED_IDX, 0);
export const GREEN = encodeTile(GREEN_IDX, 0);
export const BLUE = encodeTile(BLUE_IDX, 0);
export const DARK_RED = encodeTile(DARK_RED_IDX, 0);
export const DARK_GREEN = encodeTile(DARK_GREEN_IDX, 0);
export const DARK_BLUE = encodeTile(DARK_BLUE_IDX, 0);

/** Starting tile pool */
export const START_TILES: CellValue[] = [BLACK];

// Legacy exports for compatibility
export const BASE_TILES: CellValue[] = [BLACK];
export const PRIMARY_TILES: CellValue[] = [CYAN, MAGENTA, YELLOW, RED, GREEN, BLUE];
export const SECONDARY_TILES: CellValue[] = [
  LIGHT_CYAN, LIGHT_MAGENTA, LIGHT_YELLOW,
  DARK_RED, DARK_GREEN, DARK_BLUE,
];
