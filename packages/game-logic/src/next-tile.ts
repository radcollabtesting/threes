import type { CellValue, Grid, NextTileStrategy } from './types';
import { shuffleArray } from '@threes/rng';
import {
  BLUE, RED, GREEN,
  PRIMARY_TILES, SECONDARY_TILES,
  tileTier, canMerge, mergeResult,
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
 *   Bag = [B,B,B,B, R,R,R,R, G,G,G,G]  (12 tiles)
 *   Shuffle with seeded RNG on creation and on each refill.
 *   Pop one value per call.
 */
function createBagGenerator(rng: () => number): (grid: Grid) => CellValue {
  const BAG_TEMPLATE: CellValue[] = [
    BLUE, BLUE, BLUE, BLUE,
    RED, RED, RED, RED,
    GREEN, GREEN, GREEN, GREEN,
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
 *   Uniform random choice among {B, R, G}.
 */
function createRandomGenerator(rng: () => number): (grid: Grid) => CellValue {
  return function nextRandom(_grid: Grid): CellValue {
    return PRIMARY_TILES[Math.floor(rng() * PRIMARY_TILES.length)];
  };
}

/** Edge cell: position + value. */
interface EdgeCell {
  r: number;
  c: number;
  value: CellValue;
}

/**
 * Collects all non-empty cells on the four board edges with their positions.
 */
function getEdgeCells(grid: Grid): EdgeCell[] {
  const cells: EdgeCell[] = [];
  const size = grid.length;
  if (size === 0) return cells;
  const seen = new Set<string>();
  const add = (r: number, c: number) => {
    const key = `${r},${c}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (grid[r][c] !== 0) cells.push({ r, c, value: grid[r][c] });
  };
  for (let i = 0; i < size; i++) {
    add(0, i);
    add(size - 1, i);
    add(i, 0);
    add(i, size - 1);
  }
  return cells;
}

/** Returns orthogonal neighbors of (r,c) within the grid. */
function neighbors(r: number, c: number, size: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (r > 0) out.push([r - 1, c]);
  if (r < size - 1) out.push([r + 1, c]);
  if (c > 0) out.push([r, c - 1]);
  if (c < size - 1) out.push([r, c + 1]);
  return out;
}

/** Chance of spawning a tile that directly merges with a primary/secondary on the edge. */
const HIGHER_TIER_EDGE_CHANCE = 0.1;

/**
 * PROGRESSIVE generator:
 *   Always spawns primary tiles (B, R, G) with chain-merge weighting.
 *
 *   Chain-merge bias: for each primary candidate, score how many "chain"
 *   opportunities exist — where the candidate merges with a primary on
 *   the edge, and the result can then merge with a neighbor of that
 *   edge cell. Higher-scoring candidates are more likely to be picked.
 *
 *   Example: Blue on edge, Orange next to it →
 *     Red scores because R+B→Indigo, Indigo+Orange→Gray (chain!)
 *
 *   10% of the time, if a secondary tile sits on the edge, spawn its
 *   same-tier merge partner for a direct match opportunity.
 *   Falls back to chain-weighted primary pick.
 *
 *   Always consumes exactly 3 rng calls for determinism.
 */
function createProgressiveGenerator(rng: () => number): (grid: Grid) => CellValue {
  return function nextProgressive(grid: Grid): CellValue {
    const size = grid.length;

    // Always consume three random numbers for determinism
    const tierRoll = rng();
    const _reserved = rng();  // reserved for future use / determinism
    const tileRoll = rng();

    const edgeCells = getEdgeCells(grid);

    // ── 10% chance: spawn a same-tier partner for a secondary on the edge ──
    if (tierRoll < HIGHER_TIER_EDGE_CHANCE) {
      const candidates: CellValue[] = [];
      for (const ec of edgeCells) {
        const tier = tileTier(ec.value);
        if (tier === 2) {
          // Find secondary tiles that can merge with this edge secondary
          for (const s of SECONDARY_TILES) {
            if (canMerge(s, ec.value)) candidates.push(s);
          }
        }
      }
      if (candidates.length > 0) {
        return candidates[Math.floor(tileRoll * candidates.length)];
      }
      // Fall through to chain-weighted primary pick
    }

    // ── 90% (or fallback): primary tiles with chain-merge weighting ──
    const scores = new Map<CellValue, number>();
    for (const p of PRIMARY_TILES) scores.set(p, 1); // baseline weight of 1

    for (const ec of edgeCells) {
      for (const p of PRIMARY_TILES) {
        if (!canMerge(p, ec.value)) continue;
        const result = mergeResult(p, ec.value);
        // Check if the merge result can chain-merge with any neighbor
        for (const [nr, nc] of neighbors(ec.r, ec.c, size)) {
          const neighborVal = grid[nr][nc];
          if (neighborVal === 0) continue;
          if (canMerge(result, neighborVal)) {
            scores.set(p, (scores.get(p) ?? 1) + 3);
          }
        }
      }
    }

    // Weighted random selection
    let totalWeight = 0;
    for (const w of scores.values()) totalWeight += w;

    let pick = tileRoll * totalWeight;
    for (const [tile, weight] of scores) {
      pick -= weight;
      if (pick <= 0) return tile;
    }

    return PRIMARY_TILES[Math.floor(tileRoll * PRIMARY_TILES.length)];
  };
}
