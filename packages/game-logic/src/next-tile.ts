import type { CellValue, NextTileStrategy } from './types';
import { shuffleArray } from '@threes/rng';

/**
 * Interface for the progressive generator, which supports unlocking
 * new tile values as the player merges higher tiles.
 */
export interface ProgressiveGenerator {
  next: () => CellValue;
  /** Call when a merge produces a new value — adds it to the pool */
  unlock: (value: CellValue) => void;
}

/**
 * Creates a next-tile generator based on the selected strategy.
 *
 * - 'bag' and 'random' return a simple function (backward compat).
 * - 'progressive' returns a ProgressiveGenerator with next() + unlock().
 */
export function createNextTileGenerator(
  strategy: NextTileStrategy,
  rng: () => number,
): (() => CellValue) | ProgressiveGenerator {
  switch (strategy) {
    case 'bag':
      return createBagGenerator(rng);
    case 'random':
      return createRandomGenerator(rng);
    case 'progressive':
      return createProgressiveGenerator(rng);
  }
}

/**
 * BAG generator:
 *   Bag = [1,1,1,1, 2,2,2,2, 3,3,3,3]  (12 tiles)
 *   Shuffle with seeded RNG on creation and on each refill.
 *   Pop one value per call.
 */
function createBagGenerator(rng: () => number): () => CellValue {
  const BAG_TEMPLATE: CellValue[] = [
    1, 1, 1, 1,
    2, 2, 2, 2,
    3, 3, 3, 3,
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
 *   Uniform random choice among {1, 2, 3}.
 */
function createRandomGenerator(rng: () => number): () => CellValue {
  const VALUES: CellValue[] = [1, 2, 3];
  return function nextRandom(): CellValue {
    return VALUES[Math.floor(rng() * VALUES.length)];
  };
}

/**
 * PROGRESSIVE generator:
 *   Starts with {1, 2} in the pool. As the player merges to create
 *   new tile values, those values are unlocked and can appear as
 *   next tiles.
 *
 *   Weights:
 *     1, 2, 3  → weight 1.0  (base tiles, equal chance)
 *     6        → weight 0.5
 *     12       → weight 0.25
 *     24       → weight 0.125
 *     …each tier halves
 *
 *   Selection: weighted random pick from the unlocked pool.
 */
function createProgressiveGenerator(rng: () => number): ProgressiveGenerator {
  const pool = new Set<CellValue>([1, 2]);

  function weight(v: CellValue): number {
    if (v <= 3) return 1;
    // Each doubling above 3 halves the weight: 6→0.5, 12→0.25, …
    // v = 3 * 2^k  →  k = log2(v/3)  →  weight = 1 / 2^(k+1)
    const k = Math.log2(v / 3);
    return 1 / Math.pow(2, k + 1);
  }

  function next(): CellValue {
    const entries: { value: CellValue; w: number }[] = [];
    let total = 0;
    for (const v of pool) {
      const w = weight(v);
      entries.push({ value: v, w });
      total += w;
    }

    let r = rng() * total;
    for (const e of entries) {
      r -= e.w;
      if (r < 0) return e.value;
    }
    // Fallback (shouldn't happen due to floating point, but safe)
    return entries[entries.length - 1].value;
  }

  function unlock(value: CellValue): void {
    pool.add(value);
  }

  return { next, unlock };
}
