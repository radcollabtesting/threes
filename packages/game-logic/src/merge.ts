import type { CellValue } from './types';

/**
 * Determines whether two tile values can merge according to Threes rules:
 *
 *   1 + 2 (either order) ⇒ 3
 *   n + n (for n ≥ 3)    ⇒ 2n
 *
 * Explicitly disallowed:
 *   1 + 1  — does NOT merge
 *   2 + 2  — does NOT merge
 *   Any unequal pair where both ≥ 3 — does NOT merge
 */
export function canMerge(a: CellValue, b: CellValue): boolean {
  if (a === 0 || b === 0) return false;
  if ((a === 1 && b === 2) || (a === 2 && b === 1)) return true;
  if (a >= 3 && b >= 3 && a === b) return true;
  return false;
}

/**
 * Returns the value produced by merging a and b.
 * Caller MUST verify canMerge(a, b) === true first.
 */
export function mergeResult(a: CellValue, b: CellValue): CellValue {
  if ((a === 1 && b === 2) || (a === 2 && b === 1)) return 3;
  // Both ≥ 3 and equal
  return a + b;
}
