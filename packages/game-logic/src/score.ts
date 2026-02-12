import type { CellValue, Grid } from './types';

/**
 * Computes the score for a single tile.
 *
 * Tiles 1 and 2 score 0.
 * Tiles ≥ 3: score(v) = 3^(log₂(v/3) + 1)
 *
 * Examples:
 *   3  → 3^1 =   3
 *   6  → 3^2 =   9
 *   12 → 3^3 =  27
 *   24 → 3^4 =  81
 *   48 → 3^5 = 243
 */
export function scoreTile(value: CellValue): number {
  if (value < 3) return 0;
  const exponent = Math.log2(value / 3) + 1;
  return Math.pow(3, exponent);
}

/** Computes the total score across all tiles on the grid */
export function scoreGrid(grid: Grid): number {
  let total = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell > 0) total += scoreTile(cell);
    }
  }
  return Math.round(total); // round to avoid floating-point noise
}

/** Simple sum of all tile values on the grid. */
export function sumGrid(grid: Grid): number {
  let total = 0;
  for (const row of grid) {
    for (const cell of row) {
      total += cell;
    }
  }
  return total;
}
