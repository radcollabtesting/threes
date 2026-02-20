import { describe, test, expect } from 'vitest';
import { applyMove, isValidMove, hasAnyValidMove } from '../move';
import { R1, R2, R3, G1, G2, G3, B1 } from '../color';
import type { Grid } from '../types';

describe('applyMove — one-step movement', () => {
  test('tile moves exactly one cell left into empty space', () => {
    const grid: Grid = [
      [0,  0,  R1, 0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([0, R1, 0, 0]);
  });

  test('tile does NOT slide multiple cells in one move', () => {
    const grid: Grid = [
      [0,  0,  0,  R1],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([0, 0, R1, 0]);
  });

  test('tile moves one cell right', () => {
    const grid: Grid = [
      [R1, 0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    const { newGrid } = applyMove(grid, 'right');
    expect(newGrid[0]).toEqual([0, R1, 0, 0]);
  });

  test('tile at leading edge stays put', () => {
    const grid: Grid = [
      [R1, 0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    const { changed } = applyMove(grid, 'left');
    expect(changed).toBe(false);
  });
});

describe('applyMove — merge during movement (same-value)', () => {
  test('R1 + R1 merge when moving left → R2', () => {
    const grid: Grid = [
      [R1, R1, 0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    expect(changed).toBe(true);
    expect(newGrid[0][0]).toBe(R2);
    expect(newGrid[0][1]).toBe(0);
  });

  test('different values do NOT merge: R1 + R2', () => {
    const grid: Grid = [
      [R2, R1, 0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    const { changed } = applyMove(grid, 'left');
    expect(changed).toBe(false);
  });

  test('merged tile cannot merge again in the same turn', () => {
    const grid: Grid = [
      [R1, R1, R1, 0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    // First two R1s merge at col 0 → R2, third R1 slides to col 1
    expect(newGrid[0][0]).toBe(R2);
    expect(newGrid[0][1]).toBe(R1);
    expect(newGrid[0][2]).toBe(0);
  });

  test('different values block merge — tiles just slide', () => {
    const grid: Grid = [
      [R2, R1, 0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    // R2 at leading edge, R1 can't merge with R2, so nothing moves
    expect(changed).toBe(false);
    expect(newGrid[0][0]).toBe(R2);
    expect(newGrid[0][1]).toBe(R1);
  });

  test('R3 + R3 merge → G1 (color transition)', () => {
    const grid: Grid = [
      [R3, R3, 0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    expect(changed).toBe(true);
    expect(newGrid[0][0]).toBe(G1);
    expect(newGrid[0][1]).toBe(0);
  });
});

describe('applyMove — color-transition pop mechanic', () => {
  test('R3 + R3 merge pushes adjacent tiles outward', () => {
    // Setup: R3 at (1,0) and R3 at (1,1), with a tile above at (0,1)
    // Merging left: R3 at (1,1) merges into R3 at (1,0) → G1 at (1,0)
    // Adjacent tile at (0,0) should be pushed to... let's construct a clearer case
    const grid: Grid = [
      [0,  R1, 0,  0],
      [R3, R3, 0,  0],
      [0,  R1, 0,  0],
      [0,  0,  0,  0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    expect(changed).toBe(true);
    // R3+R3 merge at (1,0) → G1
    expect(newGrid[1][0]).toBe(G1);
    // R1 at (0,1) was adjacent to merge point (1,1) but merge target is (1,0)
    // Adjacent to (1,0): (0,0) was empty, (2,0) was empty, (1,-1) out of bounds, (1,1) now empty
    // The tile at (0,1) slides left to (0,0) via normal movement first
    // Then pop pushes tiles adjacent to merge point (1,0) outward
  });

  test('G3 + G3 merge also triggers pop', () => {
    const grid: Grid = [
      [0,  0,  0,  0],
      [G3, G3, 0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    expect(changed).toBe(true);
    expect(newGrid[1][0]).toBe(B1);
  });

  test('non-transition merge does NOT trigger pop', () => {
    // R1+R1→R2 should not push adjacent tiles
    const grid: Grid = [
      [0,  R2, 0,  0],
      [R1, R1, 0,  0],
      [0,  R2, 0,  0],
      [0,  0,  0,  0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    // R1+R1 merge at (1,0) → R2
    expect(newGrid[1][0]).toBe(R2);
    // Adjacent R2 tiles should have slid left via normal movement, NOT popped
    expect(newGrid[0][0]).toBe(R2); // slid left normally
    expect(newGrid[0][1]).toBe(0);
    expect(newGrid[2][0]).toBe(R2); // slid left normally
    expect(newGrid[2][1]).toBe(0);
  });

  test('pop pushes tile outward into empty cell but not into occupied cell', () => {
    // R3 tiles merge at (1,0). Adjacent tile at (0,0) should push to (-1,0) — out of bounds, skip.
    // Adjacent tile at (2,0) pushes to (3,0) if empty.
    const grid: Grid = [
      [0,  0,  0,  0],
      [R3, R3, 0,  0],
      [R1, 0,  0,  0],
      [0,  0,  0,  0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    // Merge: R3+R3 at (1,0) → G1
    expect(newGrid[1][0]).toBe(G1);
    // Pop: R1 at (2,0) pushed outward (down) to (3,0)
    expect(newGrid[2][0]).toBe(0);
    expect(newGrid[3][0]).toBe(R1);
  });

  test('pop does not push tile if destination is occupied', () => {
    const grid: Grid = [
      [0,  0,  0,  0],
      [R3, R3, 0,  0],
      [R1, 0,  0,  0],
      [R2, 0,  0,  0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[1][0]).toBe(G1);
    // R1 at (2,0) can't push to (3,0) — occupied by R2
    expect(newGrid[2][0]).toBe(R1);
    expect(newGrid[3][0]).toBe(R2);
  });
});

describe('applyMove — changedLines', () => {
  test('horizontal move tracks changed rows', () => {
    const grid: Grid = [
      [0,  R1, 0,  0],
      [0,  0,  0,  0],
      [0,  R1, 0,  0],
      [0,  0,  0,  0],
    ];
    const { changedLines } = applyMove(grid, 'left');
    expect(changedLines).toEqual(new Set([0, 2]));
  });
});

describe('isValidMove', () => {
  test('returns false when nothing can move or merge', () => {
    const grid: Grid = [
      [R1, 0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    expect(isValidMove(grid, 'left')).toBe(false);
    expect(isValidMove(grid, 'up')).toBe(false);
  });

  test('returns true when a tile can slide', () => {
    const grid: Grid = [
      [0,  R1, 0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    expect(isValidMove(grid, 'left')).toBe(true);
  });
});

describe('hasAnyValidMove', () => {
  test('false for a full board with no same-value neighbors', () => {
    // Alternating R1, R2 so no two adjacent tiles are the same value
    const grid: Grid = [
      [R1, R2, R1, R2],
      [R2, R1, R2, R1],
      [R1, R2, R1, R2],
      [R2, R1, R2, R1],
    ];
    expect(hasAnyValidMove(grid)).toBe(false);
  });

  test('true if any empty cell exists', () => {
    const grid: Grid = [
      [R1, R2, R1, R2],
      [R2, R1, R2, R1],
      [R1, R2, R1, R2],
      [R2, R1, R2, 0],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });

  test('true if a same-value merge is possible on a full board', () => {
    // Two adjacent R1s can merge
    const grid: Grid = [
      [R1, R1, R2, R3],
      [R2, R3, R1, R2],
      [R3, R1, R2, R3],
      [R1, R2, R3, R1],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });
});
