import type { CellValue, Grid } from './types';
import { tileTier, tileDots } from './color';

/**
 * Computes the score for a single tile.
 *
 * Score = 3^(tier+1) * 1.5^dots
 *
 * Tier 0 (base C/M/Y):        3^1 =   3
 * Tier 1 (primary R/G/B):     3^2 =   9
 * Tier 2 (secondary O/V/I/T): 3^3 =  27
 * Tier 3 (Gray):              scores same as tier 2 (27 base)
 * Dots multiply: each dot adds another 1.5x.
 * Tier -1 (Black / empty):    0
 */
export function scoreTile(value: CellValue): number {
  if (value === 0) return 0;
  const tier = tileTier(value);
  if (tier < 0) return 0; // Black / dead tiles score nothing
  const dots = tileDots(value);
  // Gray (tier 3) scores the same as tier 2
  const scoreTier = Math.min(tier, 2);
  return Math.round(Math.pow(3, scoreTier + 1) * Math.pow(1.5, dots));
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

/** Computes total score with catalyst mix multipliers applied */
export function scoreGridWithMultipliers(grid: Grid, multipliers: number[][]): number {
  let total = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (cell > 0) {
        const base = scoreTile(cell);
        const mult = multipliers[r]?.[c] ?? 0;
        total += mult > 0 ? base * mult : base;
      }
    }
  }
  return total;
}
