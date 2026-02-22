/**
 * Color breakdown system with split mechanics.
 *
 * 8 named colors forming a cyclic breakdown chain:
 *
 *   Black →(milestone)→ C,M,Y → White →(milestone)→ R,G,B → Black
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
export const WHITE_IDX = 1;
export const CYAN_IDX = 2;
export const MAGENTA_IDX = 3;
export const YELLOW_IDX = 4;
export const RED_IDX = 5;
export const GREEN_IDX = 6;
export const BLUE_IDX = 7;
export const NUM_COLORS = 8;

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
 *   Tier 0: endpoints (Black, White)
 *   Tier 1: primary colors (C,M,Y and R,G,B)
 */
const ENDPOINT_INDICES = new Set([BLACK_IDX, WHITE_IDX]);
const PRIMARY_INDICES = new Set([CYAN_IDX, MAGENTA_IDX, YELLOW_IDX, RED_IDX, GREEN_IDX, BLUE_IDX]);

export function tileTier(id: CellValue): number {
  if (id === 0) return -1;
  const ci = tileColorIndex(id);
  if (ENDPOINT_INDICES.has(ci)) return 0;
  if (PRIMARY_INDICES.has(ci)) return 1;
  return 0;
}

/* ── Display: dots ──────────────────────────────────── */

/**
 * Returns the number of dots to display on a tile.
 * Endpoints (Black, White) get 0 dots.
 * Primary colors get 1 dot.
 */
export function tileDisplayDots(id: CellValue): number {
  if (id === 0) return 0;
  const ci = tileColorIndex(id);
  if (PRIMARY_INDICES.has(ci)) return 1;
  return 0;
}

/* ── Display: hex colors ─────────────────────────────── */

const HEX_MAP: string[] = [];
HEX_MAP[BLACK_IDX] = '#1A1A2E';
HEX_MAP[WHITE_IDX] = '#F0F0FF';
HEX_MAP[CYAN_IDX] = '#87FBE9';
HEX_MAP[MAGENTA_IDX] = '#CA4DF2';
HEX_MAP[YELLOW_IDX] = '#F4CF5F';
HEX_MAP[RED_IDX] = '#EB5560';
HEX_MAP[GREEN_IDX] = '#77D054';
HEX_MAP[BLUE_IDX] = '#5764F5';

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
LABEL_MAP[WHITE_IDX] = 'W';
LABEL_MAP[CYAN_IDX] = 'C';
LABEL_MAP[MAGENTA_IDX] = 'M';
LABEL_MAP[YELLOW_IDX] = 'Y';
LABEL_MAP[RED_IDX] = 'R';
LABEL_MAP[GREEN_IDX] = 'G';
LABEL_MAP[BLUE_IDX] = 'B';

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
  [BLACK_IDX]: [CYAN_IDX, MAGENTA_IDX, YELLOW_IDX],   // milestone!
  [CYAN_IDX]: [WHITE_IDX, WHITE_IDX],
  [MAGENTA_IDX]: [WHITE_IDX, WHITE_IDX],
  [YELLOW_IDX]: [WHITE_IDX, WHITE_IDX],
  [WHITE_IDX]: [RED_IDX, GREEN_IDX, BLUE_IDX],         // milestone!
  [RED_IDX]: [BLACK_IDX, BLACK_IDX],
  [GREEN_IDX]: [BLACK_IDX, BLACK_IDX],
  [BLUE_IDX]: [BLACK_IDX, BLACK_IDX],
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
  [BLACK_IDX]: 27,         // milestone
  [CYAN_IDX]: 3,
  [MAGENTA_IDX]: 3,
  [YELLOW_IDX]: 3,
  [WHITE_IDX]: 27,         // milestone
  [RED_IDX]: 3,
  [GREEN_IDX]: 3,
  [BLUE_IDX]: 3,
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
export const WHITE = encodeTile(WHITE_IDX, 0);
export const CYAN = encodeTile(CYAN_IDX, 0);
export const MAGENTA = encodeTile(MAGENTA_IDX, 0);
export const YELLOW = encodeTile(YELLOW_IDX, 0);
export const RED = encodeTile(RED_IDX, 0);
export const GREEN = encodeTile(GREEN_IDX, 0);
export const BLUE = encodeTile(BLUE_IDX, 0);

/** Starting tile pool */
export const START_TILES: CellValue[] = [BLACK];

// Legacy exports for compatibility
export const BASE_TILES: CellValue[] = [BLACK];
export const PRIMARY_TILES: CellValue[] = [CYAN, MAGENTA, YELLOW, RED, GREEN, BLUE];
export const SECONDARY_TILES: CellValue[] = [];
