import { describe, test, expect } from 'vitest';
import { ThreesGame, canMerge, applyMove, BASE_TILES, type Grid } from '@threes/game-logic';

describe('shared game-logic (vitest)', () => {
  test('canMerge rules work (same-value matching)', () => {
    expect(canMerge(1, 1)).toBe(true);   // R1 + R1 → can merge
    expect(canMerge(6, 6)).toBe(true);   // G1 + G1 → can merge
    expect(canMerge(1, 6)).toBe(false);  // R1 + G1 → blocked (different values/colors)
    expect(canMerge(1, 2)).toBe(false);  // R1 + R2 → blocked (different shades)
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
    // Fixture: [R1, G1, _, B1] / [G1, _, _, R1]
    expect(game.grid[0]).toEqual([1, 6, 0, 11]);
    expect(game.grid[1]).toEqual([6, 0, 0, 1]);
    expect(BASE_TILES).toContain(game.nextTile);
  });

  test('deterministic seed reproducibility', () => {
    const g1 = new ThreesGame({ seed: 42 });
    const g2 = new ThreesGame({ seed: 42 });
    expect(g1.grid).toEqual(g2.grid);
    expect(g1.nextTile).toBe(g2.nextTile);
  });
});
