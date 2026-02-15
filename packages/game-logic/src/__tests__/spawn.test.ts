import { selectSpawnPosition, getSpawnEdgeCells } from '../spawn';
import { resolveConfig } from '../config';
import { createRng } from '@threes/rng';
import { CYAN, MAGENTA, YELLOW } from '../color';
import type { Grid } from '../types';

const C = CYAN;
const M = MAGENTA;
const Y = YELLOW;

describe('getSpawnEdgeCells', () => {
  test('swipe left => right edge (col 3)', () => {
    const cells = getSpawnEdgeCells('left', 4);
    expect(cells.every(c => c.col === 3)).toBe(true);
    expect(cells).toHaveLength(4);
  });

  test('swipe right => left edge (col 0)', () => {
    const cells = getSpawnEdgeCells('right', 4);
    expect(cells.every(c => c.col === 0)).toBe(true);
    expect(cells).toHaveLength(4);
  });

  test('swipe up => bottom edge (row 3)', () => {
    const cells = getSpawnEdgeCells('up', 4);
    expect(cells.every(c => c.row === 3)).toBe(true);
    expect(cells).toHaveLength(4);
  });

  test('swipe down => top edge (row 0)', () => {
    const cells = getSpawnEdgeCells('down', 4);
    expect(cells.every(c => c.row === 0)).toBe(true);
    expect(cells).toHaveLength(4);
  });
});

describe('selectSpawnPosition', () => {
  const config = resolveConfig({ spawnOnlyOnChangedLine: true });

  test('picks from changed-line candidates on spawn edge', () => {
    const grid: Grid = [
      [C, 0, 0, 0],
      [0, 0, 0, M],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const changedLines = new Set([0]);
    const rng = createRng(42);
    const pos = selectSpawnPosition(grid, 'left', changedLines, config, rng);
    expect(pos).not.toBeNull();
    expect(pos!.col).toBe(3);
    expect(pos!.row).toBe(0);
  });

  test('falls back to any empty edge cell when no changed-line candidates', () => {
    const grid: Grid = [
      [0, 0, 0, C],
      [0, 0, 0, M],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const changedLines = new Set([0, 1]);
    const rng = createRng(42);
    const pos = selectSpawnPosition(grid, 'left', changedLines, config, rng);
    expect(pos).not.toBeNull();
    expect(pos!.col).toBe(3);
    expect([2, 3]).toContain(pos!.row);
  });

  test('returns null when board is completely full', () => {
    const grid: Grid = [
      [C, M, Y, C],
      [Y, C, M, Y],
      [M, Y, C, M],
      [C, M, Y, C],
    ];
    const changedLines = new Set([0]);
    const rng = createRng(42);
    const pos = selectSpawnPosition(grid, 'left', changedLines, config, rng);
    expect(pos).toBeNull();
  });
});
