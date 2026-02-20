import { describe, test, expect } from 'vitest';
import {
  R1, R2, R3,
  G1, G2, G3,
  B1, B2, B3,
  MAX_TILE,
  BASE_TILE,
  BASE_TILES,
  tileColorFamily,
  tileShade,
  isColorTransition,
  tileTier,
  tileHex,
  tileTextColor,
  tileLabel,
  tileDisplayDots,
  canMerge,
  mergeResult,
  getMergePartners,
} from '../color';

describe('tile constants', () => {
  test('R1–B3 are sequential integers 1–9', () => {
    expect(R1).toBe(1);
    expect(R2).toBe(2);
    expect(R3).toBe(3);
    expect(G1).toBe(4);
    expect(G2).toBe(5);
    expect(G3).toBe(6);
    expect(B1).toBe(7);
    expect(B2).toBe(8);
    expect(B3).toBe(9);
  });

  test('MAX_TILE is B3 (9)', () => {
    expect(MAX_TILE).toBe(9);
  });

  test('BASE_TILE is R1 (the only spawnable tile)', () => {
    expect(BASE_TILE).toBe(R1);
  });

  test('BASE_TILES contains only R1', () => {
    expect(BASE_TILES).toEqual([R1]);
  });
});

describe('tileColorFamily', () => {
  test('Red family: R1, R2, R3 → 0', () => {
    expect(tileColorFamily(R1)).toBe(0);
    expect(tileColorFamily(R2)).toBe(0);
    expect(tileColorFamily(R3)).toBe(0);
  });

  test('Green family: G1, G2, G3 → 1', () => {
    expect(tileColorFamily(G1)).toBe(1);
    expect(tileColorFamily(G2)).toBe(1);
    expect(tileColorFamily(G3)).toBe(1);
  });

  test('Blue family: B1, B2, B3 → 2', () => {
    expect(tileColorFamily(B1)).toBe(2);
    expect(tileColorFamily(B2)).toBe(2);
    expect(tileColorFamily(B3)).toBe(2);
  });

  test('invalid values return -1', () => {
    expect(tileColorFamily(0)).toBe(-1);
    expect(tileColorFamily(-1)).toBe(-1);
    expect(tileColorFamily(10)).toBe(-1);
  });
});

describe('tileShade', () => {
  test('shade 0 for first in each family (R1, G1, B1)', () => {
    expect(tileShade(R1)).toBe(0);
    expect(tileShade(G1)).toBe(0);
    expect(tileShade(B1)).toBe(0);
  });

  test('shade 1 for second in each family (R2, G2, B2)', () => {
    expect(tileShade(R2)).toBe(1);
    expect(tileShade(G2)).toBe(1);
    expect(tileShade(B2)).toBe(1);
  });

  test('shade 2 for third in each family (R3, G3, B3)', () => {
    expect(tileShade(R3)).toBe(2);
    expect(tileShade(G3)).toBe(2);
    expect(tileShade(B3)).toBe(2);
  });

  test('invalid values return -1', () => {
    expect(tileShade(0)).toBe(-1);
    expect(tileShade(10)).toBe(-1);
  });
});

describe('isColorTransition', () => {
  test('R3 is a color transition boundary', () => {
    expect(isColorTransition(R3)).toBe(true);
  });

  test('G3 is a color transition boundary', () => {
    expect(isColorTransition(G3)).toBe(true);
  });

  test('other values are NOT color transitions', () => {
    expect(isColorTransition(R1)).toBe(false);
    expect(isColorTransition(R2)).toBe(false);
    expect(isColorTransition(G1)).toBe(false);
    expect(isColorTransition(G2)).toBe(false);
    expect(isColorTransition(B1)).toBe(false);
    expect(isColorTransition(B2)).toBe(false);
    expect(isColorTransition(B3)).toBe(false);
  });
});

describe('tileTier', () => {
  test('tier = value - 1 for valid tiles', () => {
    expect(tileTier(R1)).toBe(0);
    expect(tileTier(R2)).toBe(1);
    expect(tileTier(R3)).toBe(2);
    expect(tileTier(G1)).toBe(3);
    expect(tileTier(G2)).toBe(4);
    expect(tileTier(G3)).toBe(5);
    expect(tileTier(B1)).toBe(6);
    expect(tileTier(B2)).toBe(7);
    expect(tileTier(B3)).toBe(8);
  });

  test('empty cell (0) returns -1', () => {
    expect(tileTier(0)).toBe(-1);
  });

  test('negative values return -1', () => {
    expect(tileTier(-5)).toBe(-1);
  });
});

describe('canMerge', () => {
  test('same value below MAX can merge', () => {
    expect(canMerge(R1, R1)).toBe(true);
    expect(canMerge(R2, R2)).toBe(true);
    expect(canMerge(R3, R3)).toBe(true);
    expect(canMerge(G1, G1)).toBe(true);
    expect(canMerge(G2, G2)).toBe(true);
    expect(canMerge(G3, G3)).toBe(true);
    expect(canMerge(B1, B1)).toBe(true);
    expect(canMerge(B2, B2)).toBe(true);
  });

  test('B3 (MAX_TILE) cannot merge — it is the ceiling', () => {
    expect(canMerge(B3, B3)).toBe(false);
  });

  test('different values cannot merge', () => {
    expect(canMerge(R1, R2)).toBe(false);
    expect(canMerge(R1, G1)).toBe(false);
    expect(canMerge(G2, B2)).toBe(false);
    expect(canMerge(R3, G3)).toBe(false);
  });

  test('empty cells (0) never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, R1)).toBe(false);
    expect(canMerge(R1, 0)).toBe(false);
  });
});

describe('mergeResult', () => {
  test('same-value merge produces value + 1', () => {
    expect(mergeResult(R1, R1)).toBe(R2);
    expect(mergeResult(R2, R2)).toBe(R3);
    expect(mergeResult(R3, R3)).toBe(G1);
    expect(mergeResult(G1, G1)).toBe(G2);
    expect(mergeResult(G2, G2)).toBe(G3);
    expect(mergeResult(G3, G3)).toBe(B1);
    expect(mergeResult(B1, B1)).toBe(B2);
    expect(mergeResult(B2, B2)).toBe(B3);
  });

  test('color-transition merges: R3+R3→G1, G3+G3→B1', () => {
    expect(mergeResult(R3, R3)).toBe(G1);
    expect(mergeResult(G3, G3)).toBe(B1);
  });

  test('deterministic: same merge always produces the same result', () => {
    const r1 = mergeResult(R2, R2);
    const r2 = mergeResult(R2, R2);
    expect(r1).toBe(r2);
  });
});

describe('getMergePartners', () => {
  test('empty cell has no partners', () => {
    expect(getMergePartners(0)).toEqual([]);
  });

  test('each tile value below MAX returns itself as partner', () => {
    expect(getMergePartners(R1)).toEqual([R1]);
    expect(getMergePartners(R2)).toEqual([R2]);
    expect(getMergePartners(G1)).toEqual([G1]);
    expect(getMergePartners(B2)).toEqual([B2]);
  });

  test('B3 (MAX_TILE) has no merge partners', () => {
    expect(getMergePartners(B3)).toEqual([]);
  });
});

describe('tileHex', () => {
  test('light mode: R1 is dark red', () => {
    expect(tileHex(R1)).toBe('#8B1A1A');
  });

  test('light mode: G2 is green', () => {
    expect(tileHex(G2)).toBe('#43A047');
  });

  test('light mode: B3 is light blue', () => {
    expect(tileHex(B3)).toBe('#90CAF9');
  });

  test('dark mode reverses shade direction within each family', () => {
    // In dark mode, R1 gets the lightest red shade
    expect(tileHex(R1, true)).toBe('#FF6B8A');
    // In dark mode, R3 gets the darkest red shade
    expect(tileHex(R3, true)).toBe('#8B1A1A');
  });

  test('invalid value returns black', () => {
    expect(tileHex(0)).toBe('#000000');
    expect(tileHex(10)).toBe('#000000');
  });

  test('each tile value has a distinct color in light mode', () => {
    const hexes = new Set<string>();
    for (let v = 1; v <= 9; v++) {
      hexes.add(tileHex(v));
    }
    expect(hexes.size).toBe(9);
  });
});

describe('tileTextColor', () => {
  test('dark background tiles get white text', () => {
    // R1 is dark red → white text
    expect(tileTextColor(R1)).toBe('#FFFFFF');
    // B1 is dark blue → white text
    expect(tileTextColor(B1)).toBe('#FFFFFF');
  });

  test('light background tiles get black text', () => {
    // B3 is light blue → black text
    expect(tileTextColor(B3)).toBe('#000000');
    // G3 is light green → black text
    expect(tileTextColor(G3)).toBe('#000000');
  });
});

describe('tileLabel', () => {
  test('each tile has the correct label', () => {
    expect(tileLabel(R1)).toBe('R1');
    expect(tileLabel(R2)).toBe('R2');
    expect(tileLabel(R3)).toBe('R3');
    expect(tileLabel(G1)).toBe('G1');
    expect(tileLabel(G2)).toBe('G2');
    expect(tileLabel(G3)).toBe('G3');
    expect(tileLabel(B1)).toBe('B1');
    expect(tileLabel(B2)).toBe('B2');
    expect(tileLabel(B3)).toBe('B3');
  });

  test('invalid values return null', () => {
    expect(tileLabel(0)).toBeNull();
    expect(tileLabel(10)).toBeNull();
    expect(tileLabel(-1)).toBeNull();
  });
});

describe('tileDisplayDots', () => {
  test('empty cell has 0 display dots', () => {
    expect(tileDisplayDots(0)).toBe(0);
  });

  test('display dots equals shade within color family', () => {
    // Shade 0: first in family
    expect(tileDisplayDots(R1)).toBe(0);
    expect(tileDisplayDots(G1)).toBe(0);
    expect(tileDisplayDots(B1)).toBe(0);
    // Shade 1: second in family
    expect(tileDisplayDots(R2)).toBe(1);
    expect(tileDisplayDots(G2)).toBe(1);
    expect(tileDisplayDots(B2)).toBe(1);
    // Shade 2: third in family
    expect(tileDisplayDots(R3)).toBe(2);
    expect(tileDisplayDots(G3)).toBe(2);
    expect(tileDisplayDots(B3)).toBe(2);
  });

  test('invalid value returns 0', () => {
    expect(tileDisplayDots(10)).toBe(0);
  });
});
