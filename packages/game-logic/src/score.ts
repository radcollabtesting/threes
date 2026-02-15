import type { CellValue, Grid } from './types';
import { tileTier, tileDots } from './color';

/**
 * Computes the score for a single tile.
 *
 * Score = 3^(tier+1) * 3^dots
 *
 * Tier 0 (base C/M/Y):        3^1 =   3
 * Tier 1 (primary R/G/B):     3^2 =   9
 * Tier 2 (secondary):         3^3 =  27
 * Dots multiply: each dot adds another 3x.
 * Tier -1 (Black / empty):    0
 */
export function scoreTile(value: CellValue): number {
  if (value === 0) return 0;
  const tier = tileTier(value);
  if (tier < 0) return 0; // Black / dead tiles score nothing
  const dots = tileDots(value);
  return Math.pow(3, tier + 1) * Math.pow(3, dots);
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
