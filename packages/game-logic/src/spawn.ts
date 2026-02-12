import type { Direction, Grid, Position, GameConfig } from './types';
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
 * Selects where to spawn a new tile after a valid move.
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
    // Prefer cells on changed lines
    const candidates = emptyEdgeCells.filter(p => {
      const lineIdx = isHorizontal ? p.row : p.col;
      return changedLines.has(lineIdx);
    });
    if (candidates.length > 0) return pickRandom(candidates, rng);
  }

  // Fallback 1: any empty cell on spawn edge
  if (emptyEdgeCells.length > 0) return pickRandom(emptyEdgeCells, rng);

  // Fallback 2: any empty cell on the board
  const allEmpty = getEmptyCells(grid);
  if (allEmpty.length > 0) return pickRandom(allEmpty, rng);

  // Board is completely full — no valid spawn position
  return null;
}
