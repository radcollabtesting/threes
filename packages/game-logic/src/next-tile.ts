import type { CellValue, Grid, NextTileStrategy } from './types';
import { BASE_TILE } from './color';

/**
 * Creates a next-tile generator.
 *
 * In the simplified shade system, only R1 tiles spawn.
 * The strategy parameter is kept for API compatibility but
 * all strategies produce R1.
 */
export function createNextTileGenerator(
  _strategy: NextTileStrategy,
  _rng: () => number,
): (grid: Grid) => CellValue {
  return function nextTile(_grid: Grid): CellValue {
    return BASE_TILE;
  };
}
