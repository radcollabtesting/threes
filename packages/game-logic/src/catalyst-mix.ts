/**
 * Catalyst mix: sacrifice a Gray tile to blend two adjacent tiles.
 *
 * The Gray tile is consumed; the two selected neighbors are removed
 * and their blended result replaces the Gray. A separate multiplier
 * grid tracks scoring bonuses (+2x per catalyst mix).
 *
 * Mix table maps (colorIdx1, colorIdx2) → resultColorIdx.
 * Order-independent: mix(A,B) === mix(B,A).
 * Same-color mixes use the standard merge map (next tier).
 */

import type { CellValue, Grid, Position, MoveEvent } from './types';
import {
  CYAN_IDX,
  MAGENTA_IDX,
  YELLOW_IDX,
  BLUE_IDX,
  RED_IDX,
  GREEN_IDX,
  ORANGE_IDX,
  TEAL_IDX,
  INDIGO_IDX,
  GRAY_IDX,
  BROWN_IDX,
  tileColorIndex,
  tileDots,
  encodeTile,
} from './color';

/* ── Merge map (same-color → next tier) ──────────────── */

const SAME_COLOR_MAP: Record<number, number> = {
  [CYAN_IDX]: BLUE_IDX,
  [MAGENTA_IDX]: RED_IDX,
  [YELLOW_IDX]: GREEN_IDX,
  [BLUE_IDX]: INDIGO_IDX,
  [RED_IDX]: ORANGE_IDX,
  [GREEN_IDX]: TEAL_IDX,
  [ORANGE_IDX]: GRAY_IDX,
  [TEAL_IDX]: GRAY_IDX,
  [INDIGO_IDX]: GRAY_IDX,
  [BROWN_IDX]: GRAY_IDX,
};

/* ── Cross-color mix lookup table ─────────────────────── */

/** Key: "min,max" of two color indices → result color index */
const MIX_TABLE = new Map<string, number>();

function addMix(a: number, b: number, result: number): void {
  const key = a < b ? `${a},${b}` : `${b},${a}`;
  MIX_TABLE.set(key, result);
}

// Base (C/M/Y) cross-mixes
addMix(CYAN_IDX, MAGENTA_IDX, BLUE_IDX);
addMix(MAGENTA_IDX, YELLOW_IDX, RED_IDX);
addMix(YELLOW_IDX, CYAN_IDX, GREEN_IDX);

// Red (4) + base
addMix(RED_IDX, CYAN_IDX, BROWN_IDX);
addMix(RED_IDX, MAGENTA_IDX, INDIGO_IDX);
addMix(RED_IDX, YELLOW_IDX, ORANGE_IDX);

// Blue (3) + base
addMix(BLUE_IDX, CYAN_IDX, TEAL_IDX);
addMix(BLUE_IDX, MAGENTA_IDX, INDIGO_IDX);
addMix(BLUE_IDX, YELLOW_IDX, GREEN_IDX);

// Green (5) + base
addMix(GREEN_IDX, CYAN_IDX, TEAL_IDX);
addMix(GREEN_IDX, MAGENTA_IDX, BROWN_IDX);
addMix(GREEN_IDX, YELLOW_IDX, YELLOW_IDX);

// Orange (6) + everything
addMix(ORANGE_IDX, CYAN_IDX, BROWN_IDX);
addMix(ORANGE_IDX, MAGENTA_IDX, INDIGO_IDX);
addMix(ORANGE_IDX, YELLOW_IDX, YELLOW_IDX);
addMix(ORANGE_IDX, RED_IDX, RED_IDX);
addMix(ORANGE_IDX, GREEN_IDX, BROWN_IDX);
addMix(ORANGE_IDX, BLUE_IDX, BROWN_IDX);
addMix(ORANGE_IDX, TEAL_IDX, BROWN_IDX);
addMix(ORANGE_IDX, INDIGO_IDX, BROWN_IDX);

// Teal (9) + everything
addMix(TEAL_IDX, CYAN_IDX, CYAN_IDX);
addMix(TEAL_IDX, MAGENTA_IDX, BLUE_IDX);
addMix(TEAL_IDX, YELLOW_IDX, CYAN_IDX);
addMix(TEAL_IDX, RED_IDX, BROWN_IDX);
addMix(TEAL_IDX, GREEN_IDX, GREEN_IDX);
addMix(TEAL_IDX, BLUE_IDX, BLUE_IDX);
addMix(TEAL_IDX, INDIGO_IDX, BROWN_IDX);

// Indigo (11) + everything
addMix(INDIGO_IDX, CYAN_IDX, BROWN_IDX);
addMix(INDIGO_IDX, MAGENTA_IDX, MAGENTA_IDX);
addMix(INDIGO_IDX, YELLOW_IDX, BROWN_IDX);
addMix(INDIGO_IDX, RED_IDX, RED_IDX);
addMix(INDIGO_IDX, GREEN_IDX, BROWN_IDX);
addMix(INDIGO_IDX, BLUE_IDX, BLUE_IDX);

// Brown (13) + anything → Brown
addMix(BROWN_IDX, CYAN_IDX, BROWN_IDX);
addMix(BROWN_IDX, MAGENTA_IDX, BROWN_IDX);
addMix(BROWN_IDX, YELLOW_IDX, BROWN_IDX);
addMix(BROWN_IDX, RED_IDX, BROWN_IDX);
addMix(BROWN_IDX, BLUE_IDX, BROWN_IDX);
addMix(BROWN_IDX, GREEN_IDX, BROWN_IDX);
addMix(BROWN_IDX, ORANGE_IDX, BROWN_IDX);
addMix(BROWN_IDX, TEAL_IDX, BROWN_IDX);
addMix(BROWN_IDX, INDIGO_IDX, BROWN_IDX);

/* ── Helpers ──────────────────────────────────────────── */

/** Returns the 4 orthogonal neighbors (clamped to grid bounds). */
export function getAdjacentPositions(pos: Position, gridSize: number): Position[] {
  const result: Position[] = [];
  if (pos.row > 0)            result.push({ row: pos.row - 1, col: pos.col });
  if (pos.row < gridSize - 1) result.push({ row: pos.row + 1, col: pos.col });
  if (pos.col > 0)            result.push({ row: pos.row, col: pos.col - 1 });
  if (pos.col < gridSize - 1) result.push({ row: pos.row, col: pos.col + 1 });
  return result;
}

function isAdjacent(a: Position, b: Position): boolean {
  return (Math.abs(a.row - b.row) + Math.abs(a.col - b.col)) === 1;
}

/**
 * Looks up the catalyst mix result for two color indices.
 * Same-color mixes use the merge map (next tier).
 * Cross-color mixes use the mix table.
 * Returns the result color index, or -1 if the combo is not in the table.
 */
export function catalystMixColorResult(ci1: number, ci2: number): number {
  // Same-color: use standard merge progression
  if (ci1 === ci2) {
    return SAME_COLOR_MAP[ci1] ?? -1;
  }
  // Cross-color: look up mix table
  const key = ci1 < ci2 ? `${ci1},${ci2}` : `${ci2},${ci1}`;
  return MIX_TABLE.get(key) ?? -1;
}

/**
 * Returns positions adjacent to grayPos that are valid mix sources
 * (non-empty, non-Gray).
 */
export function getValidMixTargets(grid: Grid, grayPos: Position): Position[] {
  const gridSize = grid.length;
  return getAdjacentPositions(grayPos, gridSize).filter(p => {
    const val = grid[p.row][p.col];
    if (val === 0) return false;
    if (tileColorIndex(val) === GRAY_IDX) return false;
    return true;
  });
}

/**
 * Checks whether two specific sources can be mixed through a Gray catalyst.
 */
export function canCatalystMix(
  grid: Grid,
  grayPos: Position,
  src1: Position,
  src2: Position,
): boolean {
  const grayVal = grid[grayPos.row][grayPos.col];
  if (grayVal === 0 || tileColorIndex(grayVal) !== GRAY_IDX) return false;
  if (!isAdjacent(grayPos, src1) || !isAdjacent(grayPos, src2)) return false;
  if (src1.row === src2.row && src1.col === src2.col) return false;

  const v1 = grid[src1.row][src1.col];
  const v2 = grid[src2.row][src2.col];
  if (v1 === 0 || v2 === 0) return false;
  if (tileColorIndex(v1) === GRAY_IDX || tileColorIndex(v2) === GRAY_IDX) return false;

  const ci1 = tileColorIndex(v1);
  const ci2 = tileColorIndex(v2);
  return catalystMixColorResult(ci1, ci2) !== -1;
}

/**
 * Checks whether any Gray tile on the board has a valid catalyst mix available.
 * Used to prevent premature game-over when a mix could clear board space.
 * Only white Gray tiles (dots >= 2) can perform catalyst mixes.
 */
export function hasValidCatalystMix(grid: Grid): boolean {
  const gridSize = grid.length;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const val = grid[r][c];
      if (val === 0 || tileColorIndex(val) !== GRAY_IDX) continue;
      if (tileDots(val) < 2) continue;

      const grayPos: Position = { row: r, col: c };
      const targets = getValidMixTargets(grid, grayPos);
      if (targets.length < 2) continue;

      // Check if any pair of targets can mix
      for (let i = 0; i < targets.length; i++) {
        for (let j = i + 1; j < targets.length; j++) {
          const ci1 = tileColorIndex(grid[targets[i].row][targets[i].col]);
          const ci2 = tileColorIndex(grid[targets[j].row][targets[j].col]);
          if (catalystMixColorResult(ci1, ci2) !== -1) return true;
        }
      }
    }
  }
  return false;
}

/**
 * Checks whether a specific Gray tile has at least one valid catalyst mix.
 * Used to decide whether to enable/disable the Mix button on that tile.
 * Only white Gray tiles (dots >= 2) can perform catalyst mixes.
 */
export function grayHasValidMix(grid: Grid, grayPos: Position): boolean {
  const val = grid[grayPos.row]?.[grayPos.col];
  if (!val || tileColorIndex(val) !== GRAY_IDX) return false;
  if (tileDots(val) < 2) return false;

  const targets = getValidMixTargets(grid, grayPos);
  if (targets.length < 2) return false;

  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const ci1 = tileColorIndex(grid[targets[i].row][targets[i].col]);
      const ci2 = tileColorIndex(grid[targets[j].row][targets[j].col]);
      if (catalystMixColorResult(ci1, ci2) !== -1) return true;
    }
  }
  return false;
}

/**
 * Executes a catalyst mix on the grid (mutates in place).
 *
 * @returns The resulting tile value and animation events,
 *          or null if the mix is invalid.
 */
export function applyCatalystMix(
  grid: Grid,
  grayPos: Position,
  src1: Position,
  src2: Position,
): { resultValue: CellValue; events: MoveEvent[] } | null {
  if (!canCatalystMix(grid, grayPos, src1, src2)) return null;

  const v1 = grid[src1.row][src1.col];
  const v2 = grid[src2.row][src2.col];
  const ci1 = tileColorIndex(v1);
  const ci2 = tileColorIndex(v2);

  const resultColor = catalystMixColorResult(ci1, ci2);
  if (resultColor === -1) return null;

  // Result tile has dots=0 so it merges normally with other tiles
  const resultValue = encodeTile(resultColor, 0);

  // Clear source tiles and Gray, place result at Gray position
  grid[src1.row][src1.col] = 0;
  grid[src2.row][src2.col] = 0;
  grid[grayPos.row][grayPos.col] = resultValue;

  // Build animation events
  const events: MoveEvent[] = [
    // Source tiles slide into Gray position
    {
      type: 'move',
      from: src1,
      to: grayPos,
      value: v1,
    },
    {
      type: 'move',
      from: src2,
      to: grayPos,
      value: v2,
    },
    // Merge event at Gray position
    {
      type: 'merge',
      from: src1,
      to: grayPos,
      value: resultValue,
      mergedFrom: [v1, v2],
    },
  ];

  return { resultValue, events };
}
