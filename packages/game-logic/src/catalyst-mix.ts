/**
 * Catalyst mix system — REMOVED in the simplified shade-based game.
 *
 * These exports are kept as stubs so that any remaining references
 * compile without errors. They all return "no-op" / "not available".
 */

import type { CellValue, Grid, Position, MoveEvent } from './types';

/** Returns the 4 orthogonal neighbors (clamped to grid bounds). */
export function getAdjacentPositions(pos: Position, gridSize: number): Position[] {
  const result: Position[] = [];
  if (pos.row > 0)            result.push({ row: pos.row - 1, col: pos.col });
  if (pos.row < gridSize - 1) result.push({ row: pos.row + 1, col: pos.col });
  if (pos.col > 0)            result.push({ row: pos.row, col: pos.col - 1 });
  if (pos.col < gridSize - 1) result.push({ row: pos.row, col: pos.col + 1 });
  return result;
}

export function catalystMixColorResult(_ci1: number, _ci2: number): number {
  return -1;
}

export function getValidMixTargets(_grid: Grid, _grayPos: Position): Position[] {
  return [];
}

export function canCatalystMix(
  _grid: Grid, _grayPos: Position, _src1: Position, _src2: Position,
): boolean {
  return false;
}

export function hasValidCatalystMix(_grid: Grid): boolean {
  return false;
}

export function grayHasValidMix(_grid: Grid, _grayPos: Position): boolean {
  return false;
}

export function applyCatalystMix(
  _grid: Grid, _grayPos: Position, _src1: Position, _src2: Position,
): { resultValue: CellValue; events: MoveEvent[] } | null {
  return null;
}
