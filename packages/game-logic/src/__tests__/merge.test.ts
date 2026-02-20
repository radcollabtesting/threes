import { describe, test, expect } from 'vitest';
import { canMerge, mergeResult } from '../merge';
import {
  R1, R2, R3, R4, R5,
  G1, G2, G3, G4, G5,
  B1, B2, B3, B4, B5,
  MAX_TILE,
  tileColorFamily,
} from '../color';

describe('canMerge — same-value merging within each color family', () => {
  test('Red family: R1+R1 through R4+R4 can merge', () => {
    expect(canMerge(R1, R1)).toBe(true);
    expect(canMerge(R2, R2)).toBe(true);
    expect(canMerge(R3, R3)).toBe(true);
    expect(canMerge(R4, R4)).toBe(true);
  });

  test('Green family: G1+G1 through G4+G4 can merge', () => {
    expect(canMerge(G1, G1)).toBe(true);
    expect(canMerge(G2, G2)).toBe(true);
    expect(canMerge(G3, G3)).toBe(true);
    expect(canMerge(G4, G4)).toBe(true);
  });

  test('Blue family: B1+B1 through B4+B4 can merge', () => {
    expect(canMerge(B1, B1)).toBe(true);
    expect(canMerge(B2, B2)).toBe(true);
    expect(canMerge(B3, B3)).toBe(true);
    expect(canMerge(B4, B4)).toBe(true);
  });

  test('all non-max tiles can self-merge', () => {
    const nonMax = [R1, R2, R3, R4, G1, G2, G3, G4, B1, B2, B3, B4];
    for (const v of nonMax) {
      expect(canMerge(v, v)).toBe(true);
    }
  });
});

describe('canMerge — max shade blocking', () => {
  test('R5 (max Red shade) cannot merge with itself', () => {
    expect(canMerge(R5, R5)).toBe(false);
  });

  test('G5 (max Green shade) cannot merge with itself', () => {
    expect(canMerge(G5, G5)).toBe(false);
  });

  test('B5 (max Blue shade) cannot merge with itself', () => {
    expect(canMerge(B5, B5)).toBe(false);
  });

  test('no max shade tile can merge', () => {
    expect(canMerge(R5, R5)).toBe(false);
    expect(canMerge(G5, G5)).toBe(false);
    expect(canMerge(B5, B5)).toBe(false);
  });
});

describe('canMerge — different values cannot merge', () => {
  test('different shades within the same color cannot merge', () => {
    expect(canMerge(R1, R2)).toBe(false);
    expect(canMerge(R2, R3)).toBe(false);
    expect(canMerge(R3, R4)).toBe(false);
    expect(canMerge(R4, R5)).toBe(false);
    expect(canMerge(G1, G3)).toBe(false);
    expect(canMerge(B2, B4)).toBe(false);
  });

  test('cross-color merging is blocked (R1 != G1, etc.)', () => {
    expect(canMerge(R1, G1)).toBe(false);
    expect(canMerge(R1, B1)).toBe(false);
    expect(canMerge(G1, B1)).toBe(false);
    expect(canMerge(R2, G2)).toBe(false);
    expect(canMerge(R2, B2)).toBe(false);
    expect(canMerge(G3, B3)).toBe(false);
    expect(canMerge(R4, G4)).toBe(false);
    expect(canMerge(R5, G5)).toBe(false);
    expect(canMerge(G5, B5)).toBe(false);
  });
});

describe('canMerge — edge cases', () => {
  test('empty cells (0) never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, R1)).toBe(false);
    expect(canMerge(G1, 0)).toBe(false);
  });
});

describe('mergeResult — value + 1 within each color family', () => {
  test('Red family: R1+R1=R2, R2+R2=R3, R3+R3=R4, R4+R4=R5', () => {
    expect(mergeResult(R1, R1)).toBe(R2);
    expect(mergeResult(R2, R2)).toBe(R3);
    expect(mergeResult(R3, R3)).toBe(R4);
    expect(mergeResult(R4, R4)).toBe(R5);
  });

  test('Green family: G1+G1=G2, G2+G2=G3, G3+G3=G4, G4+G4=G5', () => {
    expect(mergeResult(G1, G1)).toBe(G2);
    expect(mergeResult(G2, G2)).toBe(G3);
    expect(mergeResult(G3, G3)).toBe(G4);
    expect(mergeResult(G4, G4)).toBe(G5);
  });

  test('Blue family: B1+B1=B2, B2+B2=B3, B3+B3=B4, B4+B4=B5', () => {
    expect(mergeResult(B1, B1)).toBe(B2);
    expect(mergeResult(B2, B2)).toBe(B3);
    expect(mergeResult(B3, B3)).toBe(B4);
    expect(mergeResult(B4, B4)).toBe(B5);
  });

  test('merges stay within the same color family (no cross-color jump)', () => {
    // R4+R4 stays Red (R5), does NOT become G1
    expect(mergeResult(R4, R4)).toBe(R5);
    expect(tileColorFamily(mergeResult(R4, R4))).toBe(0);

    // G4+G4 stays Green (G5), does NOT become B1
    expect(mergeResult(G4, G4)).toBe(G5);
    expect(tileColorFamily(mergeResult(G4, G4))).toBe(1);

    // B4+B4 stays Blue (B5)
    expect(mergeResult(B4, B4)).toBe(B5);
    expect(tileColorFamily(mergeResult(B4, B4))).toBe(2);
  });

  test('deterministic: same merge always produces the same result', () => {
    expect(mergeResult(G2, G2)).toBe(mergeResult(G2, G2));
    expect(mergeResult(B3, B3)).toBe(mergeResult(B3, B3));
  });
});

describe('full merge chain within each color', () => {
  test('Red chain: R1 → R2 → R3 → R4 → R5', () => {
    let value = R1;
    const expected = [R2, R3, R4, R5];
    for (const next of expected) {
      value = mergeResult(value, value);
      expect(value).toBe(next);
    }
    // R5 is the end of the Red chain — cannot merge further
    expect(canMerge(value, value)).toBe(false);
  });

  test('Green chain: G1 → G2 → G3 → G4 → G5', () => {
    let value = G1;
    const expected = [G2, G3, G4, G5];
    for (const next of expected) {
      value = mergeResult(value, value);
      expect(value).toBe(next);
    }
    expect(canMerge(value, value)).toBe(false);
  });

  test('Blue chain: B1 → B2 → B3 → B4 → B5', () => {
    let value = B1;
    const expected = [B2, B3, B4, B5];
    for (const next of expected) {
      value = mergeResult(value, value);
      expect(value).toBe(next);
    }
    expect(canMerge(value, value)).toBe(false);
  });

  test('each chain stays within its own color family throughout', () => {
    // Red chain: all intermediate values are in family 0
    let r = R1;
    for (let i = 0; i < 4; i++) {
      expect(tileColorFamily(r)).toBe(0);
      r = mergeResult(r, r);
    }
    expect(tileColorFamily(r)).toBe(0); // R5 is still Red

    // Green chain: all intermediate values are in family 1
    let g = G1;
    for (let i = 0; i < 4; i++) {
      expect(tileColorFamily(g)).toBe(1);
      g = mergeResult(g, g);
    }
    expect(tileColorFamily(g)).toBe(1); // G5 is still Green

    // Blue chain: all intermediate values are in family 2
    let b = B1;
    for (let i = 0; i < 4; i++) {
      expect(tileColorFamily(b)).toBe(2);
      b = mergeResult(b, b);
    }
    expect(tileColorFamily(b)).toBe(2); // B5 is still Blue
  });
});
