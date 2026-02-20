/**
 * Smoke test: verifies that the shared game-logic package
 * is correctly imported and functional in the Vite/vitest context.
 */

import { describe, test, expect } from 'vitest';
import { ThreesGame, canMerge, applyMove, type Grid } from '@threes/game-logic';

describe('shared game-logic (vitest)', () => {
  test('canMerge rules work (same-value matching)', () => {
    expect(canMerge(1, 1)).toBe(true);   // R1 + R1 → can merge
    expect(canMerge(2, 2)).toBe(true);   // R2 + R2 → can merge
    expect(canMerge(1, 2)).toBe(false);  // R1 + R2 → blocked (different values)
  });

  test('one-step movement', () => {
    const grid: Grid = [
      [0, 0, 0, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([0, 0, 1, 0]);
  });

  test('fixture mode loads design board', () => {
    const game = new ThreesGame({ fixtureMode: true });
    // Fixture: [R1, R1, _, R1] / [R1, _, _, R1]
    expect(game.grid[0]).toEqual([1, 1, 0, 1]);
    expect(game.grid[1]).toEqual([1, 0, 0, 1]);
    expect(game.nextTile).toBe(1); // always R1
  });

  test('deterministic seed reproducibility', () => {
    const g1 = new ThreesGame({ seed: 42 });
    const g2 = new ThreesGame({ seed: 42 });
    expect(g1.grid).toEqual(g2.grid);
    expect(g1.nextTile).toBe(g2.nextTile);
  });
});
