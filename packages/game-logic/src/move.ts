import type { Direction, Grid, MoveResult, MoveEvent, Position, CellValue } from './types';
import { cloneGrid } from './board';
import { canMerge, mergeResult, splitResult } from './merge';

/**
 * Applies a one-step move in the given direction.
 *
 * SPLIT MECHANICS:
 * - Each swipe moves all tiles by EXACTLY ONE GRID CELL.
 * - If a tile encounters a matching tile: they SPLIT.
 *   - Regular split: both tiles removed, merge point empties, outputs go to queue.
 *   - Milestone split: both tiles removed, 1 output on merge point, rest to queue.
 * - The merge point (destination) behavior depends on isMilestone.
 *
 * splitOutputs contains all tiles that should be added to the queue.
 * splitScore contains the total points earned from splits this move.
 */
export function applyMove(grid: Grid, direction: Direction): MoveResult {
  const size = grid.length;
  const newGrid = cloneGrid(grid);

  const merged: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );

  let changed = false;
  const changedLines = new Set<number>();
  const events: MoveEvent[] = [];
  const splitOutputs: CellValue[] = [];
  let splitScore = 0;

  const [dr, dc] = directionDelta(direction);
  const isHorizontal = direction === 'left' || direction === 'right';

  for (let line = 0; line < size; line++) {
    const positions = getProcessingOrder(direction, line, size);

    for (const pos of positions) {
      const { row, col } = pos;
      const value = newGrid[row][col];
      if (value === 0) continue;

      const destRow = row + dr;
      const destCol = col + dc;

      if (destRow < 0 || destRow >= size || destCol < 0 || destCol >= size) continue;

      const destValue = newGrid[destRow][destCol];

      if (destValue === 0) {
        // ── Slide into empty cell ──
        newGrid[destRow][destCol] = value;
        newGrid[row][col] = 0;
        changed = true;
        changedLines.add(isHorizontal ? row : col);
        events.push({
          type: 'move',
          from: { row, col },
          to: { row: destRow, col: destCol },
          value,
        });
      } else if (canMerge(value, destValue) && !merged[destRow][destCol]) {
        // ── Split ──
        const result = splitResult(value, destValue);
        if (!result) continue;

        // Source tile is removed
        newGrid[row][col] = 0;

        if (result.isMilestone) {
          // Milestone: first output stays on merge point, rest to queue
          const mergePointValue = result.outputs[0];
          newGrid[destRow][destCol] = mergePointValue;
          // Remaining outputs go to queue
          for (let i = 1; i < result.outputs.length; i++) {
            splitOutputs.push(result.outputs[i]);
          }
        } else {
          // Regular split: merge point empties, all outputs to queue
          newGrid[destRow][destCol] = 0;
          for (const output of result.outputs) {
            splitOutputs.push(output);
          }
        }

        merged[destRow][destCol] = true;
        changed = true;
        changedLines.add(isHorizontal ? row : col);
        splitScore += result.score;

        events.push({
          type: 'merge',
          from: { row, col },
          to: { row: destRow, col: destCol },
          value: result.isMilestone ? result.outputs[0] : 0,
          mergedFrom: [value, destValue],
          isMilestone: result.isMilestone,
        });
      }
    }
  }

  return { newGrid, changed, changedLines, events, splitOutputs, splitScore };
}

/**
 * Returns [dRow, dCol] for the given direction.
 */
export function directionDelta(direction: Direction): [number, number] {
  switch (direction) {
    case 'left':  return [0, -1];
    case 'right': return [0, 1];
    case 'up':    return [-1, 0];
    case 'down':  return [1, 0];
  }
}

/**
 * Returns the ordered list of cell positions to process for one line.
 */
function getProcessingOrder(
  direction: Direction,
  line: number,
  size: number,
): Position[] {
  const positions: Position[] = [];

  switch (direction) {
    case 'left':
      for (let col = 1; col < size; col++) positions.push({ row: line, col });
      break;
    case 'right':
      for (let col = size - 2; col >= 0; col--) positions.push({ row: line, col });
      break;
    case 'up':
      for (let row = 1; row < size; row++) positions.push({ row, col: line });
      break;
    case 'down':
      for (let row = size - 2; row >= 0; row--) positions.push({ row, col: line });
      break;
  }

  return positions;
}

/**
 * Returns true if the given direction would cause at least one tile
 * to move or merge — i.e. the move is "valid".
 */
export function isValidMove(grid: Grid, direction: Direction): boolean {
  return applyMove(grid, direction).changed;
}

/**
 * Returns true if the board has at least one valid move in any direction.
 */
export function hasAnyValidMove(grid: Grid): boolean {
  const directions: Direction[] = ['left', 'right', 'up', 'down'];
  return directions.some(dir => isValidMove(grid, dir));
}
