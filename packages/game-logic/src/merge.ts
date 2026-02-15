import type { CellValue } from './types';
import { isSameColor, mixColors } from './color';

/**
 * Determines whether two tile values can merge.
 *
 * Color mixing rules (opposite of Threes):
 *   - Two tiles with DIFFERENT colors can merge.
 *   - Two tiles with the SAME color cannot merge.
 *   - Empty cells (0) never merge.
 */
export function canMerge(a: CellValue, b: CellValue): boolean {
  if (a === 0 || b === 0) return false;
  return !isSameColor(a, b);
}

/**
 * Returns the value produced by merging a and b.
 * Caller MUST verify canMerge(a, b) === true first.
 *
 * Result: average the two RGB vectors (rounded to nearest 0.1),
 * tier = max(tier_a, tier_b) + 1.
 */
export function mergeResult(a: CellValue, b: CellValue): CellValue {
  return mixColors(a, b);
}
