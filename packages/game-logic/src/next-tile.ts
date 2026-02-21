/**
 * Next-tile generator for the color breakdown game.
 *
 * Produces BLACK and WHITE tiles in a shuffled bag pattern.
 * These are the cycle endpoints — the raw material players
 * break down through splits.
 *
 * Bag = [BK, BK, BK, BK, W, W, W, W] (8 tiles per bag).
 * Shuffle with seeded RNG on creation and each refill.
 */

import type { CellValue } from './types';
import { shuffleArray } from '@threes/rng';
import { BLACK, WHITE } from './color';

const BAG_TEMPLATE: CellValue[] = [
  BLACK, BLACK, BLACK, BLACK,
  WHITE, WHITE, WHITE, WHITE,
];

/**
 * Creates a next-tile generator that produces BLACK and WHITE tiles
 * from a shuffled bag. Deterministic given the same RNG.
 */
export function createNextTileGenerator(
  rng: () => number,
): () => CellValue {
  let bag: CellValue[] = [];

  return function next(): CellValue {
    if (bag.length === 0) {
      bag = shuffleArray(BAG_TEMPLATE, rng);
    }
    return bag.pop()!;
  };
}
