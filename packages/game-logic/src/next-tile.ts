import type { CellValue, NextTileStrategy } from './types';
import { shuffleArray } from '@threes/rng';
import { CYAN, MAGENTA, YELLOW } from './color';

/**
 * Creates a next-tile generator based on the selected strategy.
 *
 * Both strategies only produce the three base color tiles (C, M, Y).
 * Merged colors are only created through player-driven merges.
 */
export function createNextTileGenerator(
  strategy: NextTileStrategy,
  rng: () => number,
): () => CellValue {
  switch (strategy) {
    case 'bag':
      return createBagGenerator(rng);
    case 'random':
    default:
      return createRandomGenerator(rng);
  }
}

/**
 * BAG generator:
 *   Bag = [C,C,C,C, M,M,M,M, Y,Y,Y,Y]  (12 tiles)
 *   Shuffle with seeded RNG on creation and on each refill.
 *   Pop one value per call.
 */
function createBagGenerator(rng: () => number): () => CellValue {
  const BAG_TEMPLATE: CellValue[] = [
    CYAN, CYAN, CYAN, CYAN,
    MAGENTA, MAGENTA, MAGENTA, MAGENTA,
    YELLOW, YELLOW, YELLOW, YELLOW,
  ];

  let bag: CellValue[] = [];

  return function nextFromBag(): CellValue {
    if (bag.length === 0) {
      bag = shuffleArray(BAG_TEMPLATE, rng);
    }
    return bag.pop()!;
  };
}

/**
 * RANDOM generator:
 *   Uniform random choice among {C, M, Y}.
 */
function createRandomGenerator(rng: () => number): () => CellValue {
  const VALUES: CellValue[] = [CYAN, MAGENTA, YELLOW];
  return function nextRandom(): CellValue {
    return VALUES[Math.floor(rng() * VALUES.length)];
  };
}
