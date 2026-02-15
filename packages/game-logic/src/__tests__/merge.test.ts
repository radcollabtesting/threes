import { canMerge, mergeResult } from '../merge';
import {
  CYAN, MAGENTA, YELLOW,
  encodeTile, tileColorIndex, tileDots,
  BLUE_IDX, RED_IDX, GREEN_IDX, ORANGE_IDX, VIOLET_IDX, INDIGO_IDX, TEAL_IDX, GRAY_IDX,
} from '../color';
import { createRng } from '@threes/rng';

describe('merge rules (via merge.ts delegation)', () => {
  test('same color CAN merge: C + C', () => {
    expect(canMerge(CYAN, CYAN)).toBe(true);
  });

  test('same color CAN merge: M + M', () => {
    expect(canMerge(MAGENTA, MAGENTA)).toBe(true);
  });

  test('different colors CANNOT merge: C + M', () => {
    expect(canMerge(CYAN, MAGENTA)).toBe(false);
  });

  test('empty cells (0) never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, CYAN)).toBe(false);
  });

  test('different colors at same tier cannot merge', () => {
    const R = encodeTile(RED_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    expect(canMerge(R, G)).toBe(false);
  });
});

describe('mergeResult (via merge.ts delegation)', () => {
  test('C + C → random primary', () => {
    const rng = createRng(42);
    const result = mergeResult(CYAN, CYAN, rng);
    expect([BLUE_IDX, RED_IDX, GREEN_IDX]).toContain(tileColorIndex(result));
  });

  test('M + M → random primary', () => {
    const rng = createRng(99);
    const result = mergeResult(MAGENTA, MAGENTA, rng);
    expect([BLUE_IDX, RED_IDX, GREEN_IDX]).toContain(tileColorIndex(result));
  });

  test('Y + Y → random primary', () => {
    const rng = createRng(7);
    const result = mergeResult(YELLOW, YELLOW, rng);
    expect([BLUE_IDX, RED_IDX, GREEN_IDX]).toContain(tileColorIndex(result));
  });

  test('B + B → random secondary', () => {
    const rng = createRng(42);
    const B = encodeTile(BLUE_IDX, 0);
    const result = mergeResult(B, B, rng);
    expect([ORANGE_IDX, VIOLET_IDX, INDIGO_IDX, TEAL_IDX]).toContain(tileColorIndex(result));
    expect(tileDots(result)).toBe(0);
  });

  test('O + O → Gray', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const result = mergeResult(O, O);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('Gray + Gray (same dots) → Gray with +1 dot', () => {
    const G0 = encodeTile(GRAY_IDX, 0);
    const result = mergeResult(G0, G0);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(1);
  });
});
