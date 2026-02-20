import { describe, test, expect } from 'vitest';
import { applyMove, isValidMove, hasAnyValidMove } from '../move';
import { R1, R2, G1, B1 } from '../color';
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

  test('cross-color tiles do NOT merge: R1 blocked by G1', () => {
    const grid: Grid = [
      [G1, R1, 0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
      [0,  0,  0,  0],
    ];
    const { changed } = applyMove(grid, 'left');
    // R1 cannot merge with G1, and G1 is at the leading edge, so nothing moves
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
    // Alternating R1, G1, B1 pattern so no two adjacent tiles share the same value
    const grid: Grid = [
      [R1, G1, R1, G1],
      [G1, R1, G1, R1],
      [R1, G1, R1, G1],
      [G1, R1, G1, R1],
    ];
    expect(hasAnyValidMove(grid)).toBe(false);
  });

  test('true if any empty cell exists on a full board', () => {
    const grid: Grid = [
      [R1, G1, R1, G1],
      [G1, R1, G1, R1],
      [R1, G1, R1, G1],
      [G1, R1, G1, 0],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });

  test('true if a same-value merge is possible on a full board', () => {
    // Two adjacent R1s can merge
    const grid: Grid = [
      [R1, R1, G1, B1],
      [G1, B1, R1, G1],
      [B1, R1, G1, B1],
      [R1, G1, B1, R1],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });
});
