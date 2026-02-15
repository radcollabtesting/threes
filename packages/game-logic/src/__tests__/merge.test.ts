import { canMerge, mergeResult } from '../merge';
import {
  CYAN, MAGENTA, YELLOW,
  encodeTile, tileColorIndex, tileDots,
  BLUE_IDX, RED_IDX, GREEN_IDX, ORANGE_IDX,
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

  test('backward merge: Orange + Red → Red with dot', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const R = encodeTile(RED_IDX, 0);
    const result = mergeResult(O, R);
    expect(tileColorIndex(result)).toBe(RED_IDX);
    expect(tileDots(result)).toBe(1);
  });
});
