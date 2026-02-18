import { canMerge, mergeResult } from '../merge';
import {
  CYAN, MAGENTA, YELLOW,
  encodeTile, tileColorIndex, tileDots,
  CYAN_IDX, MAGENTA_IDX,
  BLUE_IDX, RED_IDX, GREEN_IDX, ORANGE_IDX, INDIGO_IDX, TEAL_IDX, GRAY_IDX,
} from '../color';

describe('merge rules (via merge.ts delegation)', () => {
  test('base cross-color CAN merge: C + M', () => {
    expect(canMerge(CYAN, MAGENTA)).toBe(true);
  });

  test('base cross-color CAN merge: M + Y', () => {
    expect(canMerge(MAGENTA, YELLOW)).toBe(true);
  });

  test('base cross-color CAN merge: Y + C', () => {
    expect(canMerge(YELLOW, CYAN)).toBe(true);
  });

  test('same base color CANNOT merge: C + C', () => {
    expect(canMerge(CYAN, CYAN)).toBe(false);
  });

  test('empty cells (0) never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, CYAN)).toBe(false);
  });

  test('different primary colors at same tier cannot merge', () => {
    const R = encodeTile(RED_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    expect(canMerge(R, G)).toBe(false);
  });
});

describe('mergeResult — deterministic merge table', () => {
  test('C + M → Blue', () => {
    const result = mergeResult(CYAN, MAGENTA);
    expect(tileColorIndex(result)).toBe(BLUE_IDX);
  });

  test('M + Y → Red', () => {
    const result = mergeResult(MAGENTA, YELLOW);
    expect(tileColorIndex(result)).toBe(RED_IDX);
  });

  test('Y + C → Green', () => {
    const result = mergeResult(YELLOW, CYAN);
    expect(tileColorIndex(result)).toBe(GREEN_IDX);
  });

  test('B + B → Indigo', () => {
    const B = encodeTile(BLUE_IDX, 0);
    const result = mergeResult(B, B);
    expect(tileColorIndex(result)).toBe(INDIGO_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('R + R → Orange', () => {
    const R = encodeTile(RED_IDX, 0);
    const result = mergeResult(R, R);
    expect(tileColorIndex(result)).toBe(ORANGE_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('G + G → Teal', () => {
    const G = encodeTile(GREEN_IDX, 0);
    const result = mergeResult(G, G);
    expect(tileColorIndex(result)).toBe(TEAL_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('I + I → Gray', () => {
    const I = encodeTile(INDIGO_IDX, 0);
    const result = mergeResult(I, I);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('O + O → Gray', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const result = mergeResult(O, O);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('T + T → Gray', () => {
    const T = encodeTile(TEAL_IDX, 0);
    const result = mergeResult(T, T);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('Gray + Gray (same dots) → Gray with +1 dot', () => {
    const G0 = encodeTile(GRAY_IDX, 0);
    const result = mergeResult(G0, G0);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(1);
  });

  test('dots are preserved through cross-color merges', () => {
    const C1 = encodeTile(CYAN_IDX, 1);
    const M1 = encodeTile(MAGENTA_IDX, 1);
    const result = mergeResult(C1, M1);
    expect(tileColorIndex(result)).toBe(BLUE_IDX);
    expect(tileDots(result)).toBe(1);
  });
});
