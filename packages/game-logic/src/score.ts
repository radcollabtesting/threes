import type { CellValue, Grid } from './types';
import { tileTier } from './color';

/**
 * Computes the score for a single tile.
 *
 * Each level is 3× the previous:
 *   R1 = 3^1  =     3      G1 = 3^4 =    81      B1 = 3^7 =  2187
 *   R2 = 3^2  =     9      G2 = 3^5 =   243      B2 = 3^8 =  6561
 *   R3 = 3^3  =    27      G3 = 3^6 =   729      B3 = 3^9 = 19683
 */
export function scoreTile(value: CellValue): number {
  const tier = tileTier(value);
  if (tier < 0) return 0;
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

/** Score the grid (no multiplier system in the simplified game). */
export function scoreGridWithMultipliers(grid: Grid, _multipliers: number[][]): number {
  return scoreGrid(grid);
}
