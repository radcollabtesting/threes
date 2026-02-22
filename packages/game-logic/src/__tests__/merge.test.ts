import { canMerge, mergeResult, splitResult } from '../merge';
import {
  BLACK, WHITE,
  CYAN, MAGENTA, YELLOW,
  RED, GREEN, BLUE,
  tileColorIndex,
  BLACK_IDX, WHITE_IDX,
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
    expect(mergeResult(CYAN, CYAN)).toBe(0);
    expect(mergeResult(RED, RED)).toBe(0);
    expect(mergeResult(MAGENTA, MAGENTA)).toBe(0);
  });

  test('milestone split returns first output tile', () => {
    const bkResult = mergeResult(BLACK, BLACK);
    expect(bkResult).toBeGreaterThan(0);
    expect([CYAN_IDX, MAGENTA_IDX, YELLOW_IDX]).toContain(tileColorIndex(bkResult));

    const wResult = mergeResult(WHITE, WHITE);
    expect(wResult).toBeGreaterThan(0);
    expect([RED_IDX, GREEN_IDX, BLUE_IDX]).toContain(tileColorIndex(wResult));
  });
});

describe('splitResult — full split info', () => {
  test('Black milestone produces C,M,Y', () => {
    const result = splitResult(BLACK, BLACK)!;
    expect(result.outputs).toHaveLength(3);
    expect(result.isMilestone).toBe(true);
    const ci = result.outputs.map(tileColorIndex).sort();
    expect(ci).toEqual([CYAN_IDX, MAGENTA_IDX, YELLOW_IDX].sort());
  });

  test('White milestone produces R,G,B', () => {
    const result = splitResult(WHITE, WHITE)!;
    expect(result.outputs).toHaveLength(3);
    expect(result.isMilestone).toBe(true);
    const ci = result.outputs.map(tileColorIndex).sort();
    expect(ci).toEqual([RED_IDX, GREEN_IDX, BLUE_IDX].sort());
  });

  test('Cyan regular split produces 2 White', () => {
    const result = splitResult(CYAN, CYAN)!;
    expect(result.outputs).toHaveLength(2);
    expect(result.isMilestone).toBe(false);
    expect(result.outputs.every(o => tileColorIndex(o) === WHITE_IDX)).toBe(true);
  });

  test('Red regular split produces 2 Black', () => {
    const result = splitResult(RED, RED)!;
    expect(result.outputs).toHaveLength(2);
    expect(result.isMilestone).toBe(false);
    expect(result.outputs.every(o => tileColorIndex(o) === BLACK_IDX)).toBe(true);
  });

  test('splitResult returns null for empty cells', () => {
    expect(splitResult(0, 0)).toBeNull();
  });
});
