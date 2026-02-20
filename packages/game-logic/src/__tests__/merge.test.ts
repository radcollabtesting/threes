import { describe, test, expect } from 'vitest';
import { canMerge, mergeResult } from '../merge';
import {
  R1, R2, R3,
  G1, G2, G3,
  B1, B2, B3,
  MAX_TILE,
} from '../color';

describe('merge rules (via merge.ts delegation)', () => {
  test('same value CAN merge: R1 + R1', () => {
    expect(canMerge(R1, R1)).toBe(true);
  });

  test('same value CAN merge: G2 + G2', () => {
    expect(canMerge(G2, G2)).toBe(true);
  });

  test('same value CAN merge: B2 + B2', () => {
    expect(canMerge(B2, B2)).toBe(true);
  });

  test('different values CANNOT merge: R1 + R2', () => {
    expect(canMerge(R1, R2)).toBe(false);
  });

  test('different values CANNOT merge: R1 + G1', () => {
    expect(canMerge(R1, G1)).toBe(false);
  });

  test('empty cells (0) never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, R1)).toBe(false);
  });

  test('B3 (MAX_TILE) cannot merge with itself', () => {
    expect(canMerge(B3, B3)).toBe(false);
  });

  test('all values from R1 to B2 can self-merge', () => {
    for (let v = R1; v < MAX_TILE; v++) {
      expect(canMerge(v, v)).toBe(true);
    }
  });
});

describe('mergeResult — value + 1 merge table', () => {
  test('R1 + R1 → R2', () => {
    expect(mergeResult(R1, R1)).toBe(R2);
  });

  test('R2 + R2 → R3', () => {
    expect(mergeResult(R2, R2)).toBe(R3);
  });

  test('R3 + R3 → G1 (color transition: Red → Green)', () => {
    expect(mergeResult(R3, R3)).toBe(G1);
  });

  test('G1 + G1 → G2', () => {
    expect(mergeResult(G1, G1)).toBe(G2);
  });

  test('G2 + G2 → G3', () => {
    expect(mergeResult(G2, G2)).toBe(G3);
  });

  test('G3 + G3 → B1 (color transition: Green → Blue)', () => {
    expect(mergeResult(G3, G3)).toBe(B1);
  });

  test('B1 + B1 → B2', () => {
    expect(mergeResult(B1, B1)).toBe(B2);
  });

  test('B2 + B2 → B3', () => {
    expect(mergeResult(B2, B2)).toBe(B3);
  });

  test('full merge chain: R1 → R2 → R3 → G1 → G2 → G3 → B1 → B2 → B3', () => {
    let value = R1;
    const expected = [R2, R3, G1, G2, G3, B1, B2, B3];
    for (const next of expected) {
      value = mergeResult(value, value);
      expect(value).toBe(next);
    }
  });

  test('deterministic: same merge always produces the same result', () => {
    const r1 = mergeResult(G1, G1);
    const r2 = mergeResult(G1, G1);
    expect(r1).toBe(r2);
  });
});
