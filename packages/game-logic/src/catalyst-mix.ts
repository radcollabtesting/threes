/**
 * Catalyst mix module — DEPRECATED.
 *
 * The color breakdown system no longer uses catalyst mixing.
 * This module is kept as a stub for backwards compatibility.
 */

import type { Grid, Position, MoveEvent, CellValue } from './types';

/** Returns the 4 orthogonal neighbors (clamped to grid bounds). */
export function getAdjacentPositions(pos: Position, gridSize: number): Position[] {
  const result: Position[] = [];
  if (pos.row > 0)            result.push({ row: pos.row - 1, col: pos.col });
  if (pos.row < gridSize - 1) result.push({ row: pos.row + 1, col: pos.col });
  if (pos.col > 0)            result.push({ row: pos.row, col: pos.col - 1 });
  if (pos.col < gridSize - 1) result.push({ row: pos.row, col: pos.col + 1 });
  return result;
}

/** @deprecated Always returns -1 */
export function catalystMixColorResult(_ci1: number, _ci2: number): number {
  return -1;
}

/** @deprecated Always returns empty */
export function getValidMixTargets(_grid: Grid, _grayPos: Position): Position[] {
  return [];
}

/** @deprecated Always returns false */
export function canCatalystMix(
  _grid: Grid, _grayPos: Position, _src1: Position, _src2: Position,
): boolean {
  return false;
}

/** @deprecated Always returns false */
export function hasValidCatalystMix(_grid: Grid): boolean {
  return false;
}

/** @deprecated Always returns false */
export function grayHasValidMix(_grid: Grid, _grayPos: Position): boolean {
  return false;
}

/** @deprecated Always returns null */
export function applyCatalystMix(
  _grid: Grid, _grayPos: Position, _src1: Position, _src2: Position,
): { resultValue: CellValue; events: MoveEvent[] } | null {
  return null;
}
