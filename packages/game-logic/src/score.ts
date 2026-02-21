import type { CellValue, Grid } from './types';
import { tileTier } from './color';

/**
 * Computes the score for a single tile (used for display/game-over).
 *
 * Tier 0 (transition: Black/White/Grays):  3 pts
 * Tier 1 (primaries: C/M/Y/R/G/B):        9 pts
 * Tier 2 (variants: Light/Dark):           3 pts
 */
export function scoreTile(value: CellValue): number {
  if (value === 0) return 0;
  const tier = tileTier(value);
  if (tier < 0) return 0;
  if (tier === 1) return 9;
  return 3;
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
 * Computes total score with multipliers applied.
 * Each 2x multiplier doubles the tile's score.
 */
export function scoreGridWithMultipliers(grid: Grid, multipliers: number[][]): number {
  let total = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (cell > 0) {
        const base = scoreTile(cell);
        const mult = multipliers[r]?.[c] ?? 0;
        total += mult > 0 ? base * Math.pow(2, mult) : base;
      }
    }
  }
  return total;
}
