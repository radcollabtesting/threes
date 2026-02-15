import { applyMove, isValidMove, hasAnyValidMove } from '../move';
import {
  CYAN, MAGENTA, YELLOW, encodeTile, tileColorIndex, tileTier,
  BLUE_IDX, RED_IDX, GREEN_IDX,
} from '../color';
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
    expect(newGrid[0]).toEqual([0, 0, C, 0]);
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

  test('tile at leading edge stays put', () => {
    const grid: Grid = [
      [C, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changed } = applyMove(grid, 'left');
    expect(changed).toBe(false);
  });
});

describe('applyMove — merge during movement (same-color)', () => {
  test('C + C merge when moving left → primary', () => {
    const grid: Grid = [
      [C, C, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    expect(changed).toBe(true);
    const result = newGrid[0][0];
    expect(tileTier(result)).toBe(1);
    expect([BLUE_IDX, RED_IDX, GREEN_IDX]).toContain(tileColorIndex(result));
    expect(newGrid[0][1]).toBe(0);
  });

  test('different colors do NOT merge: C + M', () => {
    const grid: Grid = [
      [M, C, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changed } = applyMove(grid, 'left');
    expect(changed).toBe(false);
  });

  test('merged tile cannot merge again in the same turn', () => {
    const grid: Grid = [
      [C, C, C, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    // First two Cs merge at col 0, third C slides to col 1 (can't merge with result)
    expect(tileTier(newGrid[0][0])).toBe(1); // merged → primary
    expect(newGrid[0][1]).toBe(C); // third C slid but couldn't merge
    expect(newGrid[0][2]).toBe(0);
  });

  test('different colors block merge — tiles just slide', () => {
    const R = encodeTile(RED_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    // R + G are different colors, can't merge
    const grid: Grid = [
      [G, R, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    // G is at leading edge (col 0), R can't merge with G, so nothing moves
    expect(changed).toBe(false);
    expect(newGrid[0][0]).toBe(G);
    expect(newGrid[0][1]).toBe(R);
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
});

describe('hasAnyValidMove', () => {
  test('false for a full board with no same-color neighbors', () => {
    // Alternating C, M so no two adjacent tiles are the same color
    const grid: Grid = [
      [C, M, C, M],
      [M, C, M, C],
      [C, M, C, M],
      [M, C, M, C],
    ];
    expect(hasAnyValidMove(grid)).toBe(false);
  });

  test('true if any empty cell exists', () => {
    const grid: Grid = [
      [C, M, C, M],
      [M, C, M, C],
      [C, M, C, M],
      [M, C, M, 0],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });

  test('true if a same-color merge is possible on a full board', () => {
    // Two adjacent Cs can merge
    const grid: Grid = [
      [C, C, M, Y],
      [M, Y, C, M],
      [Y, C, M, Y],
      [C, M, Y, C],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });
});
