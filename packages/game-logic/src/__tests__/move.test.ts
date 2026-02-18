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

describe('applyMove — merge during movement (cross-color base)', () => {
  test('C + M merge when moving left → Blue', () => {
    const grid: Grid = [
      [C, M, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    expect(changed).toBe(true);
    const result = newGrid[0][0];
    expect(tileTier(result)).toBe(1);
    expect(tileColorIndex(result)).toBe(BLUE_IDX);
    expect(newGrid[0][1]).toBe(0);
  });

  test('same base color does NOT merge: C + C', () => {
    const grid: Grid = [
      [C, C, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changed } = applyMove(grid, 'left');
    expect(changed).toBe(false);
  });

  test('merged tile cannot merge again in the same turn', () => {
    const grid: Grid = [
      [C, M, Y, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    // C+M merge → Blue at col 0, Y slides to col 1 (can't merge with Blue)
    expect(tileTier(newGrid[0][0])).toBe(1); // merged → Blue
    expect(tileColorIndex(newGrid[0][0])).toBe(BLUE_IDX);
    expect(newGrid[0][1]).toBe(Y); // Y slid but couldn't merge
    expect(newGrid[0][2]).toBe(0);
  });

  test('different primary colors block merge — tiles just slide', () => {
    const R = encodeTile(RED_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    // R + G are different primaries, can't merge
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
  test('false for a full board with no mergeable neighbors', () => {
    // Use primary tiles alternating — different primaries can't merge
    const R = encodeTile(RED_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    const grid: Grid = [
      [R, G, R, G],
      [G, R, G, R],
      [R, G, R, G],
      [G, R, G, R],
    ];
    expect(hasAnyValidMove(grid)).toBe(false);
  });

  test('true if any empty cell exists', () => {
    const R = encodeTile(RED_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    const grid: Grid = [
      [R, G, R, G],
      [G, R, G, R],
      [R, G, R, G],
      [G, R, G, 0],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });

  test('true if a cross-color merge is possible on a full board', () => {
    // Adjacent C + M can merge
    const R = encodeTile(RED_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    const grid: Grid = [
      [C, M, R, G],
      [R, G, R, G],
      [G, R, G, R],
      [R, G, R, G],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });
});
