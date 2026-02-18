import type { CellValue, Grid } from './types';
import { tileTier, tileDots } from './color';

/**
 * Computes the score for a single tile.
 *
 * Tier 0 (base C/M/Y):        3^1 =   3
 * Tier 1 (primary R/G/B):     3^2 =   9
 * Tier 2 (secondary O/V/I/T): 3^3 =  27
 * Tier 3 (Gray sub-levels):
 *   Dk Gray  (dots 0):  81
 *   Md Gray  (dots 1): 162
 *   White    (dots 2+): 324
 * Tier -1 (Black / empty):    0
 */
export function scoreTile(value: CellValue): number {
  if (value === 0) return 0;
  const tier = tileTier(value);
  if (tier < 0) return 0; // Black / dead tiles score nothing
  if (tier === 3) {
    // Gray sub-levels: 81 × 2^dots, capped at White (dots 2)
    const dots = Math.min(tileDots(value), 2);
    return 81 * Math.pow(2, dots);
  }
  return Math.pow(3, tier + 1);
}

/** Computes the total score across all tiles on the grid */
export function scoreGrid(grid: Grid): number {
  let total = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell > 0) total += scoreTile(cell);
    }
  }
  return total;
}

/**
 * Computes total score with catalyst mix multipliers applied.
 * Each mix doubles the tile's score: base × 2^mixCount.
 */
export function scoreGridWithMultipliers(grid: Grid, multipliers: number[][]): number {
  let total = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (cell > 0) {
        const base = scoreTile(cell);
        const mixCount = multipliers[r]?.[c] ?? 0;
        total += mixCount > 0 ? base * Math.pow(2, mixCount) : base;
      }
    }
  }
  return total;
}
