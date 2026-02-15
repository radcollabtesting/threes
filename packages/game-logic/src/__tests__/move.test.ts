import { applyMove, isValidMove, hasAnyValidMove } from '../move';
import { CYAN, MAGENTA, YELLOW, mixColors } from '../color';
import type { Grid } from '../types';

const C = CYAN;
const M = MAGENTA;
const Y = YELLOW;

describe('applyMove — one-step movement', () => {
  test('tile moves exactly one cell left into empty space', () => {
    const grid: Grid = [
      [0, 0, C, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([0, C, 0, 0]);
  });

  test('tile does NOT slide multiple cells in one move', () => {
    const grid: Grid = [
      [0, 0, 0, C],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    // C at col 3 → col 2 only, NOT col 0
    expect(newGrid[0]).toEqual([0, 0, C, 0]);
  });

  test('cascading one-step: trailing tiles fill vacated cells', () => {
    const grid: Grid = [
      [0, 0, C, M],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    // C and M are different colors, so C slides left, M slides into C's old spot
    // But C at col 2 → col 1 (empty), M at col 3 → col 2 (now empty) BUT wait
    // C and M can merge! So M moves into C's position and merges
    // Actually: processing order for left is col 1,2,3.
    // col 2 (C): destination is col 1 (empty) → slide: grid[0] = [0, C, 0, M]
    // col 3 (M): destination is col 2 (empty) → slide: grid[0] = [0, C, M, 0]
    // Wait, they don't merge here because C moved to col 1 and M moves to col 2
    expect(newGrid[0]).toEqual([0, C, M, 0]);
  });

  test('tile moves one cell right', () => {
    const grid: Grid = [
      [C, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'right');
    expect(newGrid[0]).toEqual([0, C, 0, 0]);
  });

  test('tile moves one cell up', () => {
    const grid: Grid = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [C, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'up');
    expect(newGrid[1][0]).toBe(C);
    expect(newGrid[2][0]).toBe(0);
  });

  test('tile moves one cell down', () => {
    const grid: Grid = [
      [0, 0, 0, 0],
      [C, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'down');
    expect(newGrid[2][0]).toBe(C);
    expect(newGrid[1][0]).toBe(0);
  });

  test('tile at leading edge stays put', () => {
    const grid: Grid = [
      [C, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    expect(newGrid[0][0]).toBe(C);
    expect(changed).toBe(false);
  });
});

describe('applyMove — merge during movement', () => {
  test('C + M merge when moving left (different colors)', () => {
    const grid: Grid = [
      [M, C, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    const expected = mixColors(C, M);
    expect(newGrid[0][0]).toBe(expected);
    expect(newGrid[0][1]).toBe(0);
    expect(changed).toBe(true);
  });

  test('same colors do NOT merge: C + C', () => {
    const grid: Grid = [
      [C, C, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changed } = applyMove(grid, 'left');
    expect(changed).toBe(false);
  });

  test('same colors do NOT merge: M + M', () => {
    const grid: Grid = [
      [M, M, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changed } = applyMove(grid, 'left');
    expect(changed).toBe(false);
  });

  test('merged tile cannot merge again in the same turn', () => {
    // [M, C, Y, 0] → left:
    //   col1 (C) merges with col0 (M) → [Blue, _, Y, 0]
    //   col2 (Y) slides into col1 → [Blue, Y, _, 0]
    //   Blue and Y can merge, but Blue was already a merge target
    const grid: Grid = [
      [M, C, Y, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    const blue = mixColors(C, M);
    expect(newGrid[0][0]).toBe(blue);
    expect(newGrid[0][1]).toBe(Y);
    expect(newGrid[0][2]).toBe(0);
  });

  test('two independent merges in same row', () => {
    // [C, M, M, Y] → left:
    //   col1 (M) merges with col0 (C) → Blue at col0
    //   col2 (M) slides into col1 (now empty)
    //   col3 (Y) slides into col2 (now empty)
    // Result: [Blue, M, Y, 0]
    const grid: Grid = [
      [C, M, M, Y],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    const blue = mixColors(C, M);
    expect(newGrid[0]).toEqual([blue, M, Y, 0]);
  });
});

describe('applyMove — changedLines', () => {
  test('horizontal move tracks changed rows', () => {
    const grid: Grid = [
      [0, C, 0, 0],
      [0, 0, 0, 0],
      [0, M, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changedLines } = applyMove(grid, 'left');
    expect(changedLines).toEqual(new Set([0, 2]));
  });

  test('vertical move tracks changed columns', () => {
    const grid: Grid = [
      [0, 0, 0, 0],
      [C, 0, M, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changedLines } = applyMove(grid, 'up');
    expect(changedLines).toEqual(new Set([0, 2]));
  });
});

describe('isValidMove', () => {
  test('returns false when nothing can move or merge', () => {
    const grid: Grid = [
      [C, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(isValidMove(grid, 'left')).toBe(false);
    expect(isValidMove(grid, 'up')).toBe(false);
  });

  test('returns true when a tile can slide', () => {
    const grid: Grid = [
      [0, C, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(isValidMove(grid, 'left')).toBe(true);
  });

  test('returns true when a merge is possible', () => {
    const grid: Grid = [
      [C, M, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    // C and M can merge right (M moves into C... wait, right means M at col1 tries to go to col2 which is empty)
    // Actually for right, C at col0 tries to go to col1 where M is — C and M are different, so they merge
    expect(isValidMove(grid, 'right')).toBe(true);
  });
});

describe('hasAnyValidMove', () => {
  test('false for a fully stuck board (all same color)', () => {
    // All same color — nothing can merge, all cells occupied
    const grid: Grid = [
      [C, C, C, C],
      [C, C, C, C],
      [C, C, C, C],
      [C, C, C, C],
    ];
    expect(hasAnyValidMove(grid)).toBe(false);
  });

  test('true if any empty cell exists', () => {
    const grid: Grid = [
      [C, C, C, C],
      [C, C, C, C],
      [C, C, C, C],
      [C, C, C, 0],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });

  test('true if a merge is possible on a full board', () => {
    // Full board but C and M are adjacent — they can merge
    const grid: Grid = [
      [C, M, C, C],
      [C, C, C, C],
      [C, C, C, C],
      [C, C, C, C],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });
});
