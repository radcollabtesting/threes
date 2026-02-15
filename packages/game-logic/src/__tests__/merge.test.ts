import { canMerge, mergeResult } from '../merge';
import { CYAN, MAGENTA, YELLOW, mixColors, isSameColor, tileTier } from '../color';

describe('color merge rules', () => {
  test('different colors CAN merge: C + M', () => {
    expect(canMerge(CYAN, MAGENTA)).toBe(true);
  });

  test('different colors CAN merge: C + Y', () => {
    expect(canMerge(CYAN, YELLOW)).toBe(true);
  });

  test('different colors CAN merge: M + Y', () => {
    expect(canMerge(MAGENTA, YELLOW)).toBe(true);
  });

  test('same color CANNOT merge: C + C', () => {
    expect(canMerge(CYAN, CYAN)).toBe(false);
  });

  test('same color CANNOT merge: M + M', () => {
    expect(canMerge(MAGENTA, MAGENTA)).toBe(false);
  });

  test('same color CANNOT merge: Y + Y', () => {
    expect(canMerge(YELLOW, YELLOW)).toBe(false);
  });

  test('empty cells (0) never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, CYAN)).toBe(false);
    expect(canMerge(CYAN, 0)).toBe(false);
  });

  test('merged color can merge with a different color', () => {
    const blue = mergeResult(CYAN, MAGENTA);
    // Blue is different from Yellow
    expect(canMerge(blue, YELLOW)).toBe(true);
  });

  test('merged color CANNOT merge with itself', () => {
    const blue = mergeResult(CYAN, MAGENTA);
    expect(canMerge(blue, blue)).toBe(false);
  });

  test('base color can merge with a primary result', () => {
    const red = mergeResult(MAGENTA, YELLOW);
    expect(canMerge(red, CYAN)).toBe(true);
  });
});

describe('mergeResult', () => {
  test('C + M produces Blue (tier 1)', () => {
    const result = mergeResult(CYAN, MAGENTA);
    expect(tileTier(result)).toBe(1);
    expect(!isSameColor(result, CYAN)).toBe(true);
    expect(!isSameColor(result, MAGENTA)).toBe(true);
  });

  test('mergeResult is the same as mixColors', () => {
    expect(mergeResult(CYAN, YELLOW)).toBe(mixColors(CYAN, YELLOW));
    expect(mergeResult(MAGENTA, YELLOW)).toBe(mixColors(MAGENTA, YELLOW));
  });

  test('deeper merges increment tier', () => {
    const blue = mergeResult(CYAN, MAGENTA); // tier 1
    const deeper = mergeResult(blue, YELLOW); // tier 2
    expect(tileTier(deeper)).toBe(2);
  });
});
