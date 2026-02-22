import { selectSpawnPosition, getSpawnEdgeCells, spawnFromQueue } from '../spawn';
import { resolveConfig } from '../config';
import { createRng } from '@threes/rng';
import { BLACK, CYAN, MAGENTA, WHITE } from '../color';
import type { Grid } from '../types';

const BK = BLACK;
const C = CYAN;
const M = MAGENTA;
const W = WHITE;

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
      [BK, 0, 0, 0],
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
      [0, 0, 0, BK],
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
      [BK, M, C, BK],
      [C, BK, M, C],
      [M, C, BK, M],
      [BK, M, C, BK],
    ];
    const changedLines = new Set([0]);
    const rng = createRng(42);
    const pos = selectSpawnPosition(grid, 'left', changedLines, config, rng);
    expect(pos).toBeNull();
  });
});

describe('spawnFromQueue', () => {
  const config = resolveConfig({ spawnOnlyOnChangedLine: true });

  test('spawns up to count tiles from queue', () => {
    const grid: Grid = [
      [BK, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const queue = [W, C, M];
    const rng = createRng(42);
    const { spawned, consumed } = spawnFromQueue(
      grid, queue, 'left', new Set([0]), config, rng, 2,
    );
    expect(consumed).toBe(2);
    expect(spawned).toHaveLength(2);
    // Tiles should be placed on the right edge
    for (const s of spawned) {
      expect(s.pos.col).toBe(3);
    }
  });

  test('spawns only as many as queue has', () => {
    const grid: Grid = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const queue = [W];
    const rng = createRng(42);
    const { consumed } = spawnFromQueue(
      grid, queue, 'left', new Set([0, 1, 2, 3]), config, rng, 2,
    );
    expect(consumed).toBe(1);
  });

  test('returns 0 consumed when board is full', () => {
    const grid: Grid = [
      [BK, M, C, BK],
      [C, BK, M, C],
      [M, C, BK, M],
      [BK, M, C, BK],
    ];
    const queue = [W, C];
    const rng = createRng(42);
    const { consumed } = spawnFromQueue(
      grid, queue, 'left', new Set([0]), config, rng, 2,
    );
    expect(consumed).toBe(0);
  });
});
