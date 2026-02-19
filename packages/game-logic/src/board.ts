import type { Grid, Position } from './types';
import { BLUE, RED, GREEN, tileLabel, tileHex } from './color';

/** Creates a gridSize x gridSize grid filled with 0 (empty) */
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

const B = BLUE;
const R = RED;
const G = GREEN;

/**
 * Fixture board for the color mixing game.
 *   Row 0: [B, R, _, G]
 *   Row 1: [R, _, _, B]
 *   Row 2: [_, _, _, _]
 *   Row 3: [_, _, _, _]
 *
 * Swipe up merges B+R (col 0) → Indigo, G+B (col 3) → Teal.
 */
export function getFixtureGrid(): Grid {
  return [
    [B, R, 0, G],
    [R, 0, 0, B],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
}

/** Pretty-prints a grid (useful for debugging / test output) */
export function gridToString(grid: Grid): string {
  return grid
    .map(row =>
      row
        .map(v => {
          if (v === 0) return '  .  ';
          const label = tileLabel(v);
          if (label) return `  ${label}  `;
          return tileHex(v).slice(0, 5);
        })
        .join(' '),
    )
    .join('\n');
}
