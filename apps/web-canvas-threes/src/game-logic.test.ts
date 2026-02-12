/**
 * Smoke test: verifies that the shared game-logic package
 * is correctly imported and functional in the Vite/vitest context.
 */

import { describe, test, expect } from 'vitest';
import { ThreesGame, canMerge, applyMove, type Grid } from '@threes/game-logic';

describe('shared game-logic (vitest)', () => {
  test('canMerge rules work', () => {
    expect(canMerge(1, 2)).toBe(true);
    expect(canMerge(3, 3)).toBe(true);
    expect(canMerge(1, 1)).toBe(false);
  });

  test('one-step movement', () => {
    const grid: Grid = [
      [0, 0, 0, 3],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([0, 0, 3, 0]);
  });

  test('fixture mode loads design board', () => {
    const game = new ThreesGame({ fixtureMode: true });
    expect(game.grid[0]).toEqual([3, 3, 0, 2]);
    expect(game.nextTile).toBe(2);
  });

  test('deterministic seed reproducibility', () => {
    const g1 = new ThreesGame({ seed: 42 });
    const g2 = new ThreesGame({ seed: 42 });
    expect(g1.grid).toEqual(g2.grid);
    expect(g1.nextTile).toBe(g2.nextTile);
  });
});
