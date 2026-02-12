import { applyMove, isValidMove, hasAnyValidMove } from '../move';
import type { Grid } from '../types';

describe('applyMove — one-step movement', () => {
  test('tile moves exactly one cell left into empty space', () => {
    const grid: Grid = [
      [0, 0, 3, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([0, 3, 0, 0]);
  });

  test('tile does NOT slide multiple cells in one move', () => {
    const grid: Grid = [
      [0, 0, 0, 3],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    // 3 at col 3 → col 2 only, NOT col 0
    expect(newGrid[0]).toEqual([0, 0, 3, 0]);
  });

  test('cascading one-step: trailing tiles fill vacated cells', () => {
    const grid: Grid = [
      [0, 0, 3, 6],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    // 3→col1, 6→col2
    expect(newGrid[0]).toEqual([0, 3, 6, 0]);
  });

  test('tile moves one cell right', () => {
    const grid: Grid = [
      [3, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'right');
    expect(newGrid[0]).toEqual([0, 3, 0, 0]);
  });

  test('tile moves one cell up', () => {
    const grid: Grid = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [3, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'up');
    expect(newGrid[1][0]).toBe(3);
    expect(newGrid[2][0]).toBe(0);
  });

  test('tile moves one cell down', () => {
    const grid: Grid = [
      [0, 0, 0, 0],
      [3, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'down');
    expect(newGrid[2][0]).toBe(3);
    expect(newGrid[1][0]).toBe(0);
  });

  test('tile at leading edge stays put', () => {
    const grid: Grid = [
      [3, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    expect(newGrid[0][0]).toBe(3);
    expect(changed).toBe(false);
  });
});

describe('applyMove — merge during movement', () => {
  test('1 + 2 merge when moving left', () => {
    const grid: Grid = [
      [2, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([3, 0, 0, 0]);
    expect(changed).toBe(true);
  });

  test('3 + 3 merge into 6', () => {
    const grid: Grid = [
      [3, 3, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([6, 0, 0, 0]);
  });

  test('merged tile cannot merge again in the same turn', () => {
    // [3, 3, 3, 0] → left:
    //   col1 merges into col0 → [6, _, 3, 0]
    //   col2 slides into col1 → [6, 3, _, 0]
    //   6 already merged, so 3 cannot merge with it
    const grid: Grid = [
      [3, 3, 3, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([6, 3, 0, 0]);
  });

  test('two independent merges in same row', () => {
    // [3, 3, 1, 2] → left:
    //   col1(3) merges with col0(3) → 6, col1 empty
    //   col2(1) slides into col1 (now empty)
    //   col3(2) slides into col2 (now empty)
    // Result: [6, 1, 2, 0]
    const grid: Grid = [
      [3, 3, 1, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([6, 1, 2, 0]);
  });

  test('sequential one-step: trailing tiles fill gaps, no double-merge', () => {
    // [1, 2, 1, 2] → left:
    //   col1(2) merges with col0(1) → col0=3, col1=empty
    //   col2(1) slides into col1 (vacated) → col1=1, col2=empty
    //   col3(2) slides into col2 (vacated) → col2=2, col3=empty
    // Result: [3, 1, 2, 0] — the trailing 1,2 don't merge because
    // each tile only moves one step and isn't re-evaluated.
    const grid: Grid = [
      [1, 2, 1, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([3, 1, 2, 0]);
  });

  test('1+1 does NOT merge', () => {
    const grid: Grid = [
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changed } = applyMove(grid, 'left');
    expect(changed).toBe(false);
  });

  test('2+2 does NOT merge', () => {
    const grid: Grid = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changed } = applyMove(grid, 'left');
    expect(changed).toBe(false);
  });
});

describe('applyMove — changedLines', () => {
  test('horizontal move tracks changed rows', () => {
    const grid: Grid = [
      [0, 3, 0, 0],
      [0, 0, 0, 0],
      [0, 6, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changedLines } = applyMove(grid, 'left');
    expect(changedLines).toEqual(new Set([0, 2]));
  });

  test('vertical move tracks changed columns', () => {
    const grid: Grid = [
      [0, 0, 0, 0],
      [3, 0, 6, 0],
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
      [3, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(isValidMove(grid, 'left')).toBe(false);
    expect(isValidMove(grid, 'up')).toBe(false);
  });

  test('returns true when a tile can slide', () => {
    const grid: Grid = [
      [0, 3, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(isValidMove(grid, 'left')).toBe(true);
  });

  test('returns true when a merge is possible', () => {
    const grid: Grid = [
      [1, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(isValidMove(grid, 'right')).toBe(true);
  });
});

describe('hasAnyValidMove', () => {
  test('false for a fully stuck board', () => {
    // Checkerboard pattern with no possible merges
    const grid: Grid = [
      [1, 3, 1, 3],
      [3, 1, 3, 1],
      [1, 3, 1, 3],
      [3, 1, 3, 1],
    ];
    expect(hasAnyValidMove(grid)).toBe(false);
  });

  test('true if any empty cell exists', () => {
    const grid: Grid = [
      [1, 3, 1, 3],
      [3, 1, 3, 1],
      [1, 3, 1, 3],
      [3, 1, 3, 0],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });

  test('true if a merge is possible on a full board', () => {
    const grid: Grid = [
      [1, 2, 1, 3],
      [3, 1, 3, 1],
      [1, 3, 1, 3],
      [3, 1, 3, 1],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });
});
