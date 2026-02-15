import type { CellValue, Grid } from './types';
import { tileTier } from './color';

/**
 * Computes the score for a single tile based on its tier (merge depth).
 *
 * Tier 0 (base C/M/Y):     3^1 =   3
 * Tier 1 (primary R/G/B):  3^2 =   9
 * Tier 2 (half blends):    3^3 =  27
 * Tier 3:                  3^4 =  81
 * Tier n:                  3^(n+1)
 */
export function scoreTile(value: CellValue): number {
  if (value === 0) return 0;
  const tier = tileTier(value);
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
