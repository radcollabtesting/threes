import type { Direction, Grid, Position, GameConfig, CellValue } from './types';
import { getEmptyCells } from './board';
import { pickRandom } from '@threes/rng';

/**
 * Returns all cells on the spawn edge for the given swipe direction.
 *
 * The new tile spawns on the edge OPPOSITE to the swipe:
 *   swipe Left  → right edge  (col = gridSize - 1)
 *   swipe Right → left edge   (col = 0)
 *   swipe Up    → bottom edge (row = gridSize - 1)
 *   swipe Down  → top edge    (row = 0)
 */
export function getSpawnEdgeCells(
  direction: Direction,
  gridSize: number,
): Position[] {
  const cells: Position[] = [];
  switch (direction) {
    case 'left':
      for (let row = 0; row < gridSize; row++) cells.push({ row, col: gridSize - 1 });
      break;
    case 'right':
      for (let row = 0; row < gridSize; row++) cells.push({ row, col: 0 });
      break;
    case 'up':
      for (let col = 0; col < gridSize; col++) cells.push({ row: gridSize - 1, col });
      break;
    case 'down':
      for (let col = 0; col < gridSize; col++) cells.push({ row: 0, col });
      break;
  }
  return cells;
}

/**
 * Selects where to spawn a new tile from the queue after a valid move.
 *
 * Cascade (config.spawnOnlyOnChangedLine = true):
 *   1. Empty cells on spawn edge whose row/col is in changedLines.
 *   2. (fallback) Any empty cell on spawn edge.
 *   3. (fallback) Any empty cell on the entire board.
 *   4. null — board is completely full (game over).
 */
export function selectSpawnPosition(
  grid: Grid,
  direction: Direction,
  changedLines: Set<number>,
  config: GameConfig,
  rng: () => number,
): Position | null {
  const gridSize = config.gridSize;
  const isHorizontal = direction === 'left' || direction === 'right';

  const edgeCells = getSpawnEdgeCells(direction, gridSize);
  const emptyEdgeCells = edgeCells.filter(p => grid[p.row][p.col] === 0);

  if (config.spawnOnlyOnChangedLine) {
    const candidates = emptyEdgeCells.filter(p => {
      const lineIdx = isHorizontal ? p.row : p.col;
      return changedLines.has(lineIdx);
    });
    if (candidates.length > 0) return pickRandom(candidates, rng);
  }

  if (emptyEdgeCells.length > 0) return pickRandom(emptyEdgeCells, rng);

  const allEmpty = getEmptyCells(grid);
  if (allEmpty.length > 0) return pickRandom(allEmpty, rng);

  return null;
}

/**
 * Spawns tiles from the queue onto the grid.
 * Spawns up to `count` tiles, limited by queue length and available space.
 *
 * @returns Array of spawn events and the number of tiles consumed from queue.
 */
export function spawnFromQueue(
  grid: Grid,
  queue: CellValue[],
  direction: Direction,
  changedLines: Set<number>,
  config: GameConfig,
  rng: () => number,
  count: number,
): { spawned: { pos: Position; value: CellValue }[]; consumed: number } {
  const spawned: { pos: Position; value: CellValue }[] = [];
  let consumed = 0;

  for (let i = 0; i < count && consumed < queue.length; i++) {
    const pos = selectSpawnPosition(grid, direction, changedLines, config, rng);
    if (!pos) break; // no space

    const value = queue[consumed];
    grid[pos.row][pos.col] = value;
    spawned.push({ pos, value });
    consumed++;
  }

  return { spawned, consumed };
}
