import type { Grid, Position } from './types';

/** Creates a gridSize × gridSize grid filled with 0 (empty) */
export function createEmptyGrid(gridSize: number): Grid {
  return Array.from({ length: gridSize }, () => Array<number>(gridSize).fill(0));
}

/** Deep-clones a grid (each row is a new array) */
export function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

/** Returns positions of all empty (value === 0) cells */
export function getEmptyCells(grid: Grid): Position[] {
  const empty: Position[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === 0) {
        empty.push({ row, col });
      }
    }
  }
  return empty;
}

/** True when every cell is occupied */
export function isGridFull(grid: Grid): boolean {
  return getEmptyCells(grid).length === 0;
}

/**
 * The fixture board from the design reference (Screen 01 — "Intro").
 *   Row 0: [3, 3, _, 2]
 *   Row 1: [6, _, _, 1]
 *   Row 2: [_, _, _, _]
 *   Row 3: [_, _, _, _]
 */
export function getFixtureGrid(): Grid {
  return [
    [3, 3, 0, 2],
    [6, 0, 0, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
}

/** Pretty-prints a grid (useful for debugging / test output) */
export function gridToString(grid: Grid): string {
  return grid
    .map(row => row.map(v => String(v).padStart(3)).join(' '))
    .join('\n');
}
