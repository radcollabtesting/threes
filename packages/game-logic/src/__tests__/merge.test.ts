import { canMerge, mergeResult, splitResult } from '../merge';
import {
  BLACK, LIGHT_GRAY, DARK_GRAY, WHITE,
  CYAN, MAGENTA, YELLOW,
  RED, GREEN, BLUE,
  DARK_RED,
  tileColorIndex,
  BLACK_IDX, LIGHT_GRAY_IDX, DARK_GRAY_IDX,
  CYAN_IDX, MAGENTA_IDX, YELLOW_IDX,
  RED_IDX, GREEN_IDX, BLUE_IDX,
} from '../color';

describe('merge rules (via merge.ts delegation)', () => {
  test('same color CAN merge: BLACK + BLACK', () => {
    expect(canMerge(BLACK, BLACK)).toBe(true);
  });

  test('same color CAN merge: CYAN + CYAN', () => {
    expect(canMerge(CYAN, CYAN)).toBe(true);
  });

  test('different colors CANNOT merge: BLACK + CYAN', () => {
    expect(canMerge(BLACK, CYAN)).toBe(false);
  });

  test('different colors CANNOT merge: RED + BLUE', () => {
    expect(canMerge(RED, BLUE)).toBe(false);
  });

  test('empty cells (0) never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, BLACK)).toBe(false);
  });
});

describe('mergeResult — split system', () => {
  test('regular split returns 0 (merge point empties)', () => {
    expect(mergeResult(BLACK, BLACK)).toBe(0);
    expect(mergeResult(CYAN, CYAN)).toBe(0);
    expect(mergeResult(WHITE, WHITE)).toBe(0);
  });

  test('milestone split returns first output tile', () => {
    const lgResult = mergeResult(LIGHT_GRAY, LIGHT_GRAY);
    expect(lgResult).toBeGreaterThan(0);
    expect([CYAN_IDX, MAGENTA_IDX, YELLOW_IDX]).toContain(tileColorIndex(lgResult));

    const dgResult = mergeResult(DARK_GRAY, DARK_GRAY);
    expect(dgResult).toBeGreaterThan(0);
    expect([RED_IDX, GREEN_IDX, BLUE_IDX]).toContain(tileColorIndex(dgResult));
  });
});

describe('splitResult — full split info', () => {
  test('Black split produces 2 Light Gray', () => {
    const result = splitResult(BLACK, BLACK)!;
    expect(result).not.toBeNull();
    expect(result.outputs).toHaveLength(2);
    expect(result.isMilestone).toBe(false);
    expect(result.outputs.every(o => tileColorIndex(o) === LIGHT_GRAY_IDX)).toBe(true);
  });

  test('Light Gray milestone produces C,M,Y', () => {
    const result = splitResult(LIGHT_GRAY, LIGHT_GRAY)!;
    expect(result.outputs).toHaveLength(3);
    expect(result.isMilestone).toBe(true);
    const ci = result.outputs.map(tileColorIndex).sort();
    expect(ci).toEqual([CYAN_IDX, MAGENTA_IDX, YELLOW_IDX].sort());
  });

  test('Dark Gray milestone produces R,G,B', () => {
    const result = splitResult(DARK_GRAY, DARK_GRAY)!;
    expect(result.outputs).toHaveLength(3);
    expect(result.isMilestone).toBe(true);
    const ci = result.outputs.map(tileColorIndex).sort();
    expect(ci).toEqual([RED_IDX, GREEN_IDX, BLUE_IDX].sort());
  });

  test('splitResult returns null for empty cells', () => {
    expect(splitResult(0, 0)).toBeNull();
  });
});
