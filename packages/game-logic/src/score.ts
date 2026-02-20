import type { CellValue, Grid } from './types';
import { tileTier } from './color';

/**
 * Computes the score for a single tile.
 *
 * Each shade level is 3× the previous (same scoring for all colors):
 *   Shade 1 = 3^1 =   3     (R1, G1, B1)
 *   Shade 2 = 3^2 =   9     (R2, G2, B2)
 *   Shade 3 = 3^3 =  27     (R3, G3, B3)
 *   Shade 4 = 3^4 =  81     (R4, G4, B4)
 *   Shade 5 = 3^5 = 243     (R5, G5, B5)
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
