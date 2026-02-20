import type { CellValue, Grid, NextTileStrategy } from './types';
import { BASE_TILES } from './color';

/**
 * Creates a next-tile generator.
 *
 * All 3 base tiles (R1, G1, B1) spawn randomly with equal probability.
 * The strategy parameter is kept for API compatibility.
 */
export function createNextTileGenerator(
  _strategy: NextTileStrategy,
  rng: () => number,
): (grid: Grid) => CellValue {
  return function nextTile(_grid: Grid): CellValue {
    const idx = Math.floor(rng() * BASE_TILES.length);
    return BASE_TILES[idx];
  };
}
