import type { Direction, Grid, MoveResult, MoveEvent, Position } from './types';
import { cloneGrid } from './board';
import { canMerge, mergeResult } from './merge';
import { isColorTransition } from './color';

/**
 * Applies a one-step move in the given direction.
 *
 * SWIPE MECHANICS (from spec):
 * - Each swipe moves all tiles by EXACTLY ONE GRID CELL (not "slide to edge").
 * - A tile attempts to move into its immediate neighbour in the swipe direction.
 * - If neighbour is empty → tile slides there.
 * - If neighbour is occupied and mergeable AND hasn't already merged this turn → merge.
 * - Otherwise → tile stays put.
 *
 * PROCESSING ORDER:
 * Tiles are processed starting from the side closest to the movement direction
 * so that a vacated cell is immediately available for the tile behind it.
 * Example for LEFT: process columns 1 → 2 → 3 (each row independently).
 *
 * COLOR-TRANSITION POP:
 * When a merge crosses a color boundary (R3+R3→G1 or G3+G3→B1), tiles
 * in the 4 cardinal directions around the merge point are pushed one cell
 * outward (if the destination is empty and in bounds).
 *
 * changedLines contains row indices for horizontal moves, column indices for vertical.
 */
export function applyMove(grid: Grid, direction: Direction): MoveResult {
  const size = grid.length;
  const newGrid = cloneGrid(grid);

  // merged[r][c] = true if cell (r,c) was the TARGET of a merge this turn.
  // A merged cell cannot be merged into again (spec: "at most once per move").
  const merged: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );

  let changed = false;
  const changedLines = new Set<number>();
  const events: MoveEvent[] = [];

  // Track color-transition merges for pop phase
  const colorTransitionMerges: Position[] = [];

  // Movement delta
  const [dr, dc] = directionDelta(direction);
  const isHorizontal = direction === 'left' || direction === 'right';

  // Iterate over each "line" (row for horizontal, col for vertical)
  for (let line = 0; line < size; line++) {
    const positions = getProcessingOrder(direction, line, size);

    for (const pos of positions) {
      const { row, col } = pos;
      const value = newGrid[row][col];
      if (value === 0) continue; // empty — nothing to do

      const destRow = row + dr;
      const destCol = col + dc;

      // Safety bounds check (shouldn't fire given our processing order)
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
        // ── Merge ──
        const result = mergeResult(value, destValue);
        newGrid[destRow][destCol] = result;
        newGrid[row][col] = 0;
        merged[destRow][destCol] = true;
        changed = true;
        changedLines.add(isHorizontal ? row : col);
        events.push({
          type: 'merge',
          from: { row, col },
          to: { row: destRow, col: destCol },
          value: result,
          mergedFrom: [value, destValue],
        });

        // Check for color-transition merge (R3+R3→G1 or G3+G3→B1)
        if (isColorTransition(value)) {
          colorTransitionMerges.push({ row: destRow, col: destCol });
        }
      }
      // else: blocked — tile stays
    }
  }

  // ── Color-transition pop phase ─────────────────────────
  // Push tiles adjacent to color-transition merge points outward.
  for (const mergePos of colorTransitionMerges) {
    const pushDirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [pdr, pdc] of pushDirs) {
      const adjRow = mergePos.row + pdr;
      const adjCol = mergePos.col + pdc;

      // Skip if adjacent cell is out of bounds or empty
      if (adjRow < 0 || adjRow >= size || adjCol < 0 || adjCol >= size) continue;
      const adjVal = newGrid[adjRow][adjCol];
      if (adjVal === 0) continue;

      // Skip the merge result tile itself (it's at mergePos, not adj)
      // Skip tiles that were just merged (don't push them)
      if (merged[adjRow][adjCol]) continue;

      // Destination: one more step outward
      const pushRow = adjRow + pdr;
      const pushCol = adjCol + pdc;

      // Skip if push destination is out of bounds or occupied
      if (pushRow < 0 || pushRow >= size || pushCol < 0 || pushCol >= size) continue;
      if (newGrid[pushRow][pushCol] !== 0) continue;

      // Push the tile outward
      newGrid[pushRow][pushCol] = adjVal;
      newGrid[adjRow][adjCol] = 0;
      changed = true;
      changedLines.add(isHorizontal ? adjRow : adjCol);
      events.push({
        type: 'move',
        from: { row: adjRow, col: adjCol },
        to: { row: pushRow, col: pushCol },
        value: adjVal,
      });
    }
  }

  return { newGrid, changed, changedLines, events };
}

/**
 * Returns [dRow, dCol] for the given direction.
 *   left  → [ 0, -1]   right → [ 0, +1]
 *   up    → [-1,  0]   down  → [+1,  0]
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
 *
 * We skip tiles on the leading edge (they can't move further) and process
 * front-to-back relative to the swipe direction so that vacated spaces
 * become available to trailing tiles.
 */
function getProcessingOrder(
  direction: Direction,
  line: number,
  size: number,
): Position[] {
  const positions: Position[] = [];

  switch (direction) {
    case 'left':
      // row = line, columns 1 → size-1 (left to right)
      for (let col = 1; col < size; col++) positions.push({ row: line, col });
      break;
    case 'right':
      // row = line, columns size-2 → 0 (right to left)
      for (let col = size - 2; col >= 0; col--) positions.push({ row: line, col });
      break;
    case 'up':
      // col = line, rows 1 → size-1 (top to bottom)
      for (let row = 1; row < size; row++) positions.push({ row, col: line });
      break;
    case 'down':
      // col = line, rows size-2 → 0 (bottom to top)
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
 * When false, the game is over.
 */
export function hasAnyValidMove(grid: Grid): boolean {
  const directions: Direction[] = ['left', 'right', 'up', 'down'];
  return directions.some(dir => isValidMove(grid, dir));
}
