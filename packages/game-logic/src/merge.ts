import type { CellValue } from './types';
import {
  canMerge as colorCanMerge,
  mergeResult as colorMergeResult,
  splitResult as colorSplitResult,
  type SplitResult,
} from './color';

/**
 * Determines whether two tile values can merge (split).
 * Same color → can merge.
 */
export function canMerge(a: CellValue, b: CellValue): boolean {
  return colorCanMerge(a, b);
}

/**
 * Returns the value that appears at the merge point.
 * For regular splits: 0 (merge point empties).
 * For milestone splits: the first output tile.
 */
export function mergeResult(a: CellValue, b: CellValue): CellValue {
  return colorMergeResult(a, b);
}

/**
 * Returns the full split result including all output tiles and score.
 */
export function splitResult(a: CellValue, b: CellValue): SplitResult | null {
  return colorSplitResult(a, b);
}
