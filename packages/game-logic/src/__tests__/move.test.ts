import { applyMove, isValidMove, hasAnyValidMove } from '../move';
import {
  CYAN, MAGENTA, YELLOW, encodeTile, tileColorIndex,
  BLUE_IDX, BROWN_IDX, BLACK_IDX,
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

describe('applyMove — merge during movement', () => {
  test('C + M merge when moving left (forward merge → Blue)', () => {
    const grid: Grid = [
      [M, C, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid, changed } = applyMove(grid, 'left');
    expect(changed).toBe(true);
    const result = newGrid[0][0];
    expect(tileColorIndex(result)).toBe(BLUE_IDX);
    expect(newGrid[0][1]).toBe(0);
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

  test('merged tile cannot merge again in the same turn', () => {
    const grid: Grid = [
      [M, C, Y, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(tileColorIndex(newGrid[0][0])).toBe(BLUE_IDX);
    expect(newGrid[0][1]).toBe(Y);
    expect(newGrid[0][2]).toBe(0);
  });

  test('unlisted merge produces Brown', () => {
    const R = encodeTile(4, 0); // RED_IDX
    const B = encodeTile(3, 0); // BLUE_IDX
    const grid: Grid = [
      [B, R, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(tileColorIndex(newGrid[0][0])).toBe(BROWN_IDX);
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
  test('false for a fully stuck board (all same color)', () => {
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
    const grid: Grid = [
      [C, M, C, C],
      [C, C, C, C],
      [C, C, C, C],
      [C, C, C, C],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });

  test('false for full board of Black tiles (all dead)', () => {
    const BL = encodeTile(BLACK_IDX, 0);
    const grid: Grid = [
      [BL, BL, BL, BL],
      [BL, BL, BL, BL],
      [BL, BL, BL, BL],
      [BL, BL, BL, BL],
    ];
    expect(hasAnyValidMove(grid)).toBe(false);
  });
});
