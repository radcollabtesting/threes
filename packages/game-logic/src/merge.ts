import type { CellValue } from './types';
import { canMerge as colorCanMerge, mergeResult as colorMergeResult } from './color';

/**
 * Determines whether two tile values can merge.
 *
 * Delegates to the color system's same-color matching rule.
 */
export function canMerge(a: CellValue, b: CellValue): boolean {
  return colorCanMerge(a, b);
}

/**
 * Returns the value produced by merging a and b.
 * Caller MUST verify canMerge(a, b) === true first.
 *
 * @param rng  Optional RNG for picking a random next-tier color.
 *             If omitted, picks the first color in the pool (for validity checks).
 */
export function mergeResult(a: CellValue, b: CellValue, rng?: () => number): CellValue {
  return colorMergeResult(a, b, rng);
}
