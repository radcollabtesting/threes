import type { CellValue, Grid, NextTileStrategy } from './types';
import { shuffleArray } from '@threes/rng';
import {
  CYAN, MAGENTA, YELLOW,
  BASE_TILES,
  tileTier, tileColorIndex, encodeTile,
} from './color';

/**
 * Creates a next-tile generator based on the selected strategy.
 *
 * All generators accept a Grid parameter; bag and random ignore it,
 * while progressive uses it to decide which tiers are unlocked.
 */
export function createNextTileGenerator(
  strategy: NextTileStrategy,
  rng: () => number,
): (grid: Grid) => CellValue {
  switch (strategy) {
    case 'bag':
      return createBagGenerator(rng);
    case 'progressive':
      return createProgressiveGenerator(rng);
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
function createBagGenerator(rng: () => number): (grid: Grid) => CellValue {
  const BAG_TEMPLATE: CellValue[] = [
    CYAN, CYAN, CYAN, CYAN,
    MAGENTA, MAGENTA, MAGENTA, MAGENTA,
    YELLOW, YELLOW, YELLOW, YELLOW,
  ];

  let bag: CellValue[] = [];

  return function nextFromBag(_grid: Grid): CellValue {
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
function createRandomGenerator(rng: () => number): (grid: Grid) => CellValue {
  const VALUES: CellValue[] = [CYAN, MAGENTA, YELLOW];
  return function nextRandom(_grid: Grid): CellValue {
    return VALUES[Math.floor(rng() * VALUES.length)];
  };
}

/**
 * PROGRESSIVE generator:
 *   Scans the board for specific colors present and only spawns those.
 *   - Always ≥50% chance of base (C, M, Y).
 *   - If any primary colors exist on board: remaining chance picks from
 *     only the specific primaries the player has created.
 *   - Same for secondaries.
 *   Weights: 50% base, 25% primary (if any), 25% secondary (if any).
 *   If only primaries seen: 50% base, 50% primary.
 *   Always consumes exactly 2 rng calls for determinism.
 */
function createProgressiveGenerator(rng: () => number): (grid: Grid) => CellValue {
  return function nextProgressive(grid: Grid): CellValue {
    const seenPrimaries: CellValue[] = [];
    const seenSecondaries: CellValue[] = [];
    const seen = new Set<number>();

    for (const row of grid) {
      for (const cell of row) {
        if (cell === 0) continue;
        const ci = tileColorIndex(cell);
        if (seen.has(ci)) continue;
        seen.add(ci);
        const tier = tileTier(cell);
        if (tier === 1) seenPrimaries.push(encodeTile(ci, 0));
        if (tier === 2) seenSecondaries.push(encodeTile(ci, 0));
      }
    }

    // Always consume two random numbers for determinism
    const tierRoll = rng();
    const tileRoll = rng();

    if (seenPrimaries.length === 0 || tierRoll < 0.5) {
      return BASE_TILES[Math.floor(tileRoll * BASE_TILES.length)];
    }

    if (seenSecondaries.length === 0 || tierRoll < 0.75) {
      return seenPrimaries[Math.floor(tileRoll * seenPrimaries.length)];
    }

    return seenSecondaries[Math.floor(tileRoll * seenSecondaries.length)];
  };
}
