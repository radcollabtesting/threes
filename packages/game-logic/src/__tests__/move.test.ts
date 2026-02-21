import { applyMove, isValidMove, hasAnyValidMove } from '../move';
import {
  BLACK, CYAN, MAGENTA, WHITE, LIGHT_GRAY,
  tileColorIndex,
  LIGHT_GRAY_IDX, CYAN_IDX, MAGENTA_IDX, YELLOW_IDX,
} from '../color';
import type { Grid } from '../types';

const BK = BLACK;
const C = CYAN;
const M = MAGENTA;
const W = WHITE;

describe('applyMove — one-step movement', () => {
  test('tile moves exactly one cell left into empty space', () => {
    const grid: Grid = [
      [0, 0, BK, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([0, BK, 0, 0]);
  });

  test('tile does NOT slide multiple cells in one move', () => {
    const grid: Grid = [
      [0, 0, 0, BK],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'left');
    expect(newGrid[0]).toEqual([0, 0, BK, 0]);
  });

  test('tile moves one cell right', () => {
    const grid: Grid = [
      [BK, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid } = applyMove(grid, 'right');
    expect(newGrid[0]).toEqual([0, BK, 0, 0]);
  });

  test('tile at leading edge stays put', () => {
    const grid: Grid = [
      [BK, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changed } = applyMove(grid, 'left');
    expect(changed).toBe(false);
  });
});

describe('applyMove — split during movement', () => {
  test('BK + BK merge when moving left → merge point empties (regular split)', () => {
    const grid: Grid = [
      [BK, BK, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid, changed, splitOutputs } = applyMove(grid, 'left');
    expect(changed).toBe(true);
    // Regular split: merge point empties
    expect(newGrid[0][0]).toBe(0);
    expect(newGrid[0][1]).toBe(0);
    // Outputs go to queue
    expect(splitOutputs).toHaveLength(2);
    expect(tileColorIndex(splitOutputs[0])).toBe(LIGHT_GRAY_IDX);
    expect(tileColorIndex(splitOutputs[1])).toBe(LIGHT_GRAY_IDX);
  });

  test('different colors do NOT merge: BK + C', () => {
    const grid: Grid = [
      [C, BK, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changed } = applyMove(grid, 'left');
    expect(changed).toBe(false);
  });

  test('merged tile cannot merge again in the same turn', () => {
    const grid: Grid = [
      [BK, BK, BK, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid, splitOutputs } = applyMove(grid, 'left');
    // First two BKs merge at col 0 (regular split → empties), third BK slides to col 1
    // But col 0 is empty now, so third BK slides into col 1, which is also empty
    // Only one split happens (the merged flag prevents another)
    expect(splitOutputs).toHaveLength(2);
    // Third BK should still be on the board
    const nonEmpty = newGrid[0].filter(v => v > 0);
    expect(nonEmpty).toHaveLength(1);
    expect(nonEmpty[0]).toBe(BK);
  });

  test('milestone split: Light Gray + Light Gray → first output on merge point', () => {
    const LG = LIGHT_GRAY;
    const grid: Grid = [
      [LG, LG, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { newGrid, splitOutputs, events } = applyMove(grid, 'left');
    // Milestone: first output stays on merge point
    expect(newGrid[0][0]).toBeGreaterThan(0);
    const mergePointCI = tileColorIndex(newGrid[0][0]);
    expect([CYAN_IDX, MAGENTA_IDX, YELLOW_IDX]).toContain(mergePointCI);
    // Other 2 go to queue
    expect(splitOutputs).toHaveLength(2);
    // Merge event should have isMilestone
    const mergeEvent = events.find(e => e.type === 'merge');
    expect(mergeEvent?.isMilestone).toBe(true);
  });

  test('splitScore is accumulated from splits', () => {
    const grid: Grid = [
      [BK, BK, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { splitScore } = applyMove(grid, 'left');
    expect(splitScore).toBe(3); // Black splits score 3
  });
});

describe('applyMove — changedLines', () => {
  test('horizontal move tracks changed rows', () => {
    const grid: Grid = [
      [0, BK, 0, 0],
      [0, 0, 0, 0],
      [0, C, 0, 0],
      [0, 0, 0, 0],
    ];
    const { changedLines } = applyMove(grid, 'left');
    expect(changedLines).toEqual(new Set([0, 2]));
  });
});

describe('isValidMove', () => {
  test('returns false when nothing can move or merge', () => {
    const grid: Grid = [
      [BK, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(isValidMove(grid, 'left')).toBe(false);
    expect(isValidMove(grid, 'up')).toBe(false);
  });

  test('returns true when a tile can slide', () => {
    const grid: Grid = [
      [0, BK, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(isValidMove(grid, 'left')).toBe(true);
  });
});

describe('hasAnyValidMove', () => {
  test('false for a full board with no same-color neighbors', () => {
    const grid: Grid = [
      [BK, C, BK, C],
      [C, BK, C, BK],
      [BK, C, BK, C],
      [C, BK, C, BK],
    ];
    expect(hasAnyValidMove(grid)).toBe(false);
  });

  test('true if any empty cell exists', () => {
    const grid: Grid = [
      [BK, C, BK, C],
      [C, BK, C, BK],
      [BK, C, BK, C],
      [C, BK, C, 0],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });

  test('true if a same-color merge is possible on a full board', () => {
    const grid: Grid = [
      [BK, BK, C, M],
      [C, M, BK, C],
      [M, BK, C, M],
      [BK, C, M, BK],
    ];
    expect(hasAnyValidMove(grid)).toBe(true);
  });
});
