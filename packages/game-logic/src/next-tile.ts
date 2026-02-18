import type { CellValue, Grid, NextTileStrategy } from './types';
import { shuffleArray } from '@threes/rng';
import {
  CYAN, MAGENTA, YELLOW,
  BASE_TILES,
  tileTier, tileColorIndex, encodeTile, canMerge,
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
 * Collects all tile values sitting on the four board edges.
 */
function getEdgeTileValues(grid: Grid): Set<CellValue> {
  const values = new Set<CellValue>();
  const size = grid.length;
  if (size === 0) return values;
  for (let i = 0; i < size; i++) {
    if (grid[0][i] !== 0) values.add(grid[0][i]);
    if (grid[size - 1][i] !== 0) values.add(grid[size - 1][i]);
    if (grid[i][0] !== 0) values.add(grid[i][0]);
    if (grid[i][size - 1] !== 0) values.add(grid[i][size - 1]);
  }
  return values;
}

/** Chance that the tile pick is biased toward an edge-mergeable candidate. */
const EDGE_BIAS = 0.5;

/**
 * PROGRESSIVE generator:
 *   Scans the board for specific colors present and only spawns those.
 *   Weights: 67% base, 17% primary (if any), 17% secondary (if any).
 *   If only primaries seen: 67% base, 33% primary.
 *
 *   Edge-bias mercy mechanic: after selecting the tier pool, 50% of the
 *   time the generator prefers a tile that has a merge partner on one of
 *   the four board edges, giving the player a better chance of an
 *   immediate match. Falls back to uniform pick when no edge match exists.
 *
 *   Always consumes exactly 3 rng calls for determinism.
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

    // Always consume three random numbers for determinism
    const tierRoll = rng();
    const biasRoll = rng();
    const tileRoll = rng();

    let pool: CellValue[];
    if (seenPrimaries.length === 0 || tierRoll < 2 / 3) {
      pool = BASE_TILES;
    } else if (seenSecondaries.length === 0 || tierRoll < 5 / 6) {
      pool = seenPrimaries;
    } else {
      pool = seenSecondaries;
    }

    // Edge-bias: prefer tiles whose merge partner sits on a board edge
    if (biasRoll < EDGE_BIAS) {
      const edgeValues = getEdgeTileValues(grid);
      const edgeMatched = pool.filter(t =>
        [...edgeValues].some(ev => canMerge(t, ev)),
      );
      if (edgeMatched.length > 0) {
        return edgeMatched[Math.floor(tileRoll * edgeMatched.length)];
      }
    }

    return pool[Math.floor(tileRoll * pool.length)];
  };
}
