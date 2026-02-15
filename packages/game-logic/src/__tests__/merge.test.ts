import { canMerge, mergeResult } from '../merge';
import {
  CYAN, MAGENTA, YELLOW,
  encodeTile, tileColorIndex, tileDots,
  BLUE_IDX, RED_IDX, GREEN_IDX, ORANGE_IDX, VIOLET_IDX, INDIGO_IDX, TEAL_IDX, GRAY_IDX,
} from '../color';

describe('merge rules (via merge.ts delegation)', () => {
  test('different colors CAN merge: C + M', () => {
    expect(canMerge(CYAN, MAGENTA)).toBe(true);
  });

  test('different colors CAN merge: C + Y', () => {
    expect(canMerge(CYAN, YELLOW)).toBe(true);
  });

  test('same color CANNOT merge: C + C', () => {
    expect(canMerge(CYAN, CYAN)).toBe(false);
  });

  test('empty cells (0) never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, CYAN)).toBe(false);
  });

  test('unlisted combo cannot merge', () => {
    const R = encodeTile(RED_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    expect(canMerge(R, G)).toBe(false);
  });
});

describe('mergeResult (via merge.ts delegation)', () => {
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

  test('B + G → Teal', () => {
    const B = encodeTile(BLUE_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    const result = mergeResult(B, G);
    expect(tileColorIndex(result)).toBe(TEAL_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('two different secondaries → Gray', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const V = encodeTile(VIOLET_IDX, 0);
    const result = mergeResult(O, V);
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
