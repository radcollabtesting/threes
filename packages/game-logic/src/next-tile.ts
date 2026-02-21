/**
 * Next-tile generator — DEPRECATED.
 *
 * The color breakdown system uses a queue instead of a next-tile generator.
 * This module is kept as a stub for backwards compatibility.
 */

import type { CellValue, Grid, NextTileStrategy } from './types';

/** @deprecated Queue system replaced next-tile generation. Always returns () => 0. */
export function createNextTileGenerator(
  _strategy: NextTileStrategy,
  _rng: () => number,
): (grid: Grid) => CellValue {
  return () => 0;
}
