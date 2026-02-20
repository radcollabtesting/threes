import { describe, test, expect } from 'vitest';
import {
  R1, R2, R3, R4, R5,
  G1, G2, G3, G4, G5,
  B1, B2, B3, B4, B5,
  MAX_TILE,
  BASE_TILES,
  SHADES_PER_COLOR,
  NUM_COLORS,
  tileColorFamily,
  tileShade,
  isMaxShade,
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
  test('Red family: R1=1, R2=2, R3=3, R4=4, R5=5', () => {
    expect(R1).toBe(1);
    expect(R2).toBe(2);
    expect(R3).toBe(3);
    expect(R4).toBe(4);
    expect(R5).toBe(5);
  });

  test('Green family: G1=6, G2=7, G3=8, G4=9, G5=10', () => {
    expect(G1).toBe(6);
    expect(G2).toBe(7);
    expect(G3).toBe(8);
    expect(G4).toBe(9);
    expect(G5).toBe(10);
  });

  test('Blue family: B1=11, B2=12, B3=13, B4=14, B5=15', () => {
    expect(B1).toBe(11);
    expect(B2).toBe(12);
    expect(B3).toBe(13);
    expect(B4).toBe(14);
    expect(B5).toBe(15);
  });

  test('MAX_TILE is 15', () => {
    expect(MAX_TILE).toBe(15);
  });

  test('SHADES_PER_COLOR is 5', () => {
    expect(SHADES_PER_COLOR).toBe(5);
  });

  test('NUM_COLORS is 3', () => {
    expect(NUM_COLORS).toBe(3);
  });

  test('BASE_TILES contains R1, G1, B1 (all 3 base colors spawn)', () => {
    expect(BASE_TILES).toEqual([R1, G1, B1]);
  });
});

describe('tileColorFamily', () => {
  test('Red family: R1–R5 all return 0', () => {
    expect(tileColorFamily(R1)).toBe(0);
    expect(tileColorFamily(R2)).toBe(0);
    expect(tileColorFamily(R3)).toBe(0);
    expect(tileColorFamily(R4)).toBe(0);
    expect(tileColorFamily(R5)).toBe(0);
  });

  test('Green family: G1–G5 all return 1', () => {
    expect(tileColorFamily(G1)).toBe(1);
    expect(tileColorFamily(G2)).toBe(1);
    expect(tileColorFamily(G3)).toBe(1);
    expect(tileColorFamily(G4)).toBe(1);
    expect(tileColorFamily(G5)).toBe(1);
  });

  test('Blue family: B1–B5 all return 2', () => {
    expect(tileColorFamily(B1)).toBe(2);
    expect(tileColorFamily(B2)).toBe(2);
    expect(tileColorFamily(B3)).toBe(2);
    expect(tileColorFamily(B4)).toBe(2);
    expect(tileColorFamily(B5)).toBe(2);
  });

  test('computed via Math.floor((id-1)/5)', () => {
    for (let id = 1; id <= 15; id++) {
      expect(tileColorFamily(id)).toBe(Math.floor((id - 1) / 5));
    }
  });

  test('invalid values return -1', () => {
    expect(tileColorFamily(0)).toBe(-1);
    expect(tileColorFamily(-1)).toBe(-1);
    expect(tileColorFamily(16)).toBe(-1);
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

  test('shade 3 for fourth in each family (R4, G4, B4)', () => {
    expect(tileShade(R4)).toBe(3);
    expect(tileShade(G4)).toBe(3);
    expect(tileShade(B4)).toBe(3);
  });

  test('shade 4 for fifth in each family (R5, G5, B5)', () => {
    expect(tileShade(R5)).toBe(4);
    expect(tileShade(G5)).toBe(4);
    expect(tileShade(B5)).toBe(4);
  });

  test('computed via (id-1)%5', () => {
    for (let id = 1; id <= 15; id++) {
      expect(tileShade(id)).toBe((id - 1) % 5);
    }
  });

  test('invalid values return -1', () => {
    expect(tileShade(0)).toBe(-1);
    expect(tileShade(-1)).toBe(-1);
    expect(tileShade(16)).toBe(-1);
  });
});

describe('isMaxShade', () => {
  test('R5, G5, B5 are max shades', () => {
    expect(isMaxShade(R5)).toBe(true);
    expect(isMaxShade(G5)).toBe(true);
    expect(isMaxShade(B5)).toBe(true);
  });

  test('all other tiles are NOT max shade', () => {
    const nonMax = [R1, R2, R3, R4, G1, G2, G3, G4, B1, B2, B3, B4];
    for (const tile of nonMax) {
      expect(isMaxShade(tile)).toBe(false);
    }
  });

  test('invalid values are not max shade', () => {
    expect(isMaxShade(0)).toBe(false);
    expect(isMaxShade(16)).toBe(false);
  });
});

describe('tileTier', () => {
  test('tier equals shade index (0–4) for all valid tiles', () => {
    // Red family
    expect(tileTier(R1)).toBe(0);
    expect(tileTier(R2)).toBe(1);
    expect(tileTier(R3)).toBe(2);
    expect(tileTier(R4)).toBe(3);
    expect(tileTier(R5)).toBe(4);
    // Green family
    expect(tileTier(G1)).toBe(0);
    expect(tileTier(G2)).toBe(1);
    expect(tileTier(G3)).toBe(2);
    expect(tileTier(G4)).toBe(3);
    expect(tileTier(G5)).toBe(4);
    // Blue family
    expect(tileTier(B1)).toBe(0);
    expect(tileTier(B2)).toBe(1);
    expect(tileTier(B3)).toBe(2);
    expect(tileTier(B4)).toBe(3);
    expect(tileTier(B5)).toBe(4);
  });

  test('same shade across colors has the same tier', () => {
    expect(tileTier(R1)).toBe(tileTier(G1));
    expect(tileTier(G1)).toBe(tileTier(B1));
    expect(tileTier(R5)).toBe(tileTier(G5));
    expect(tileTier(G5)).toBe(tileTier(B5));
  });

  test('empty cell (0) returns -1', () => {
    expect(tileTier(0)).toBe(-1);
  });

  test('negative values return -1', () => {
    expect(tileTier(-5)).toBe(-1);
  });
});

describe('canMerge', () => {
  test('same value below max shade can merge within Red family', () => {
    expect(canMerge(R1, R1)).toBe(true);
    expect(canMerge(R2, R2)).toBe(true);
    expect(canMerge(R3, R3)).toBe(true);
    expect(canMerge(R4, R4)).toBe(true);
  });

  test('same value below max shade can merge within Green family', () => {
    expect(canMerge(G1, G1)).toBe(true);
    expect(canMerge(G2, G2)).toBe(true);
    expect(canMerge(G3, G3)).toBe(true);
    expect(canMerge(G4, G4)).toBe(true);
  });

  test('same value below max shade can merge within Blue family', () => {
    expect(canMerge(B1, B1)).toBe(true);
    expect(canMerge(B2, B2)).toBe(true);
    expect(canMerge(B3, B3)).toBe(true);
    expect(canMerge(B4, B4)).toBe(true);
  });

  test('max shade tiles cannot merge (R5, G5, B5)', () => {
    expect(canMerge(R5, R5)).toBe(false);
    expect(canMerge(G5, G5)).toBe(false);
    expect(canMerge(B5, B5)).toBe(false);
  });

  test('different values cannot merge', () => {
    expect(canMerge(R1, R2)).toBe(false);
    expect(canMerge(G1, G2)).toBe(false);
    expect(canMerge(B3, B4)).toBe(false);
  });

  test('cross-color tiles cannot merge (even at same shade)', () => {
    expect(canMerge(R1, G1)).toBe(false);
    expect(canMerge(R1, B1)).toBe(false);
    expect(canMerge(G1, B1)).toBe(false);
    expect(canMerge(R3, G3)).toBe(false);
    expect(canMerge(G2, B2)).toBe(false);
  });

  test('empty cells (0) never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, R1)).toBe(false);
    expect(canMerge(R1, 0)).toBe(false);
  });
});

describe('mergeResult', () => {
  test('merge produces value + 1 within Red family', () => {
    expect(mergeResult(R1, R1)).toBe(R2);
    expect(mergeResult(R2, R2)).toBe(R3);
    expect(mergeResult(R3, R3)).toBe(R4);
    expect(mergeResult(R4, R4)).toBe(R5);
  });

  test('merge produces value + 1 within Green family', () => {
    expect(mergeResult(G1, G1)).toBe(G2);
    expect(mergeResult(G2, G2)).toBe(G3);
    expect(mergeResult(G3, G3)).toBe(G4);
    expect(mergeResult(G4, G4)).toBe(G5);
  });

  test('merge produces value + 1 within Blue family', () => {
    expect(mergeResult(B1, B1)).toBe(B2);
    expect(mergeResult(B2, B2)).toBe(B3);
    expect(mergeResult(B3, B3)).toBe(B4);
    expect(mergeResult(B4, B4)).toBe(B5);
  });

  test('merges stay within the same color family', () => {
    // R4+R4 → R5 (stays Red, does not jump to G1)
    expect(mergeResult(R4, R4)).toBe(R5);
    expect(tileColorFamily(mergeResult(R4, R4))).toBe(0);

    // G4+G4 → G5 (stays Green, does not jump to B1)
    expect(mergeResult(G4, G4)).toBe(G5);
    expect(tileColorFamily(mergeResult(G4, G4))).toBe(1);

    // B4+B4 → B5 (stays Blue)
    expect(mergeResult(B4, B4)).toBe(B5);
    expect(tileColorFamily(mergeResult(B4, B4))).toBe(2);
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

  test('each tile below max shade returns itself as partner', () => {
    expect(getMergePartners(R1)).toEqual([R1]);
    expect(getMergePartners(R2)).toEqual([R2]);
    expect(getMergePartners(R3)).toEqual([R3]);
    expect(getMergePartners(R4)).toEqual([R4]);
    expect(getMergePartners(G1)).toEqual([G1]);
    expect(getMergePartners(G2)).toEqual([G2]);
    expect(getMergePartners(G3)).toEqual([G3]);
    expect(getMergePartners(G4)).toEqual([G4]);
    expect(getMergePartners(B1)).toEqual([B1]);
    expect(getMergePartners(B2)).toEqual([B2]);
    expect(getMergePartners(B3)).toEqual([B3]);
    expect(getMergePartners(B4)).toEqual([B4]);
  });

  test('max shade tiles have no merge partners (R5, G5, B5)', () => {
    expect(getMergePartners(R5)).toEqual([]);
    expect(getMergePartners(G5)).toEqual([]);
    expect(getMergePartners(B5)).toEqual([]);
  });
});

describe('tileHex', () => {
  test('light mode: Red family has correct hex values', () => {
    expect(tileHex(R1)).toBe('#8B1A1A');
    expect(tileHex(R2)).toBe('#C62828');
    expect(tileHex(R3)).toBe('#DC3545');
    expect(tileHex(R4)).toBe('#EF5350');
    expect(tileHex(R5)).toBe('#FF6B8A');
  });

  test('light mode: Green family has correct hex values', () => {
    expect(tileHex(G1)).toBe('#1B5E20');
    expect(tileHex(G5)).toBe('#81C784');
  });

  test('light mode: Blue family has correct hex values', () => {
    expect(tileHex(B1)).toBe('#1A237E');
    expect(tileHex(B5)).toBe('#90CAF9');
  });

  test('dark mode reverses shade direction within each family', () => {
    // In dark mode, R1 gets the lightest red shade
    expect(tileHex(R1, true)).toBe('#FF6B8A');
    // In dark mode, R5 gets the darkest red shade
    expect(tileHex(R5, true)).toBe('#8B1A1A');
  });

  test('invalid value returns black', () => {
    expect(tileHex(0)).toBe('#000000');
    expect(tileHex(16)).toBe('#000000');
    expect(tileHex(-1)).toBe('#000000');
  });

  test('each tile value has a distinct color in light mode', () => {
    const hexes = new Set<string>();
    for (let v = 1; v <= 15; v++) {
      hexes.add(tileHex(v));
    }
    expect(hexes.size).toBe(15);
  });

  test('each tile value has a distinct color in dark mode', () => {
    const hexes = new Set<string>();
    for (let v = 1; v <= 15; v++) {
      hexes.add(tileHex(v, true));
    }
    expect(hexes.size).toBe(15);
  });
});

describe('tileTextColor', () => {
  test('dark background tiles get white text', () => {
    // R1 is dark red -> white text
    expect(tileTextColor(R1)).toBe('#FFFFFF');
    // G1 is dark green -> white text
    expect(tileTextColor(G1)).toBe('#FFFFFF');
    // B1 is dark blue -> white text
    expect(tileTextColor(B1)).toBe('#FFFFFF');
  });

  test('light background tiles get black text', () => {
    // R5 is pink -> black text
    expect(tileTextColor(R5)).toBe('#000000');
    // G5 is pale green -> black text
    expect(tileTextColor(G5)).toBe('#000000');
    // B5 is pale blue -> black text
    expect(tileTextColor(B5)).toBe('#000000');
  });
});

describe('tileLabel', () => {
  test('Red family labels', () => {
    expect(tileLabel(R1)).toBe('R1');
    expect(tileLabel(R2)).toBe('R2');
    expect(tileLabel(R3)).toBe('R3');
    expect(tileLabel(R4)).toBe('R4');
    expect(tileLabel(R5)).toBe('R5');
  });

  test('Green family labels', () => {
    expect(tileLabel(G1)).toBe('G1');
    expect(tileLabel(G2)).toBe('G2');
    expect(tileLabel(G3)).toBe('G3');
    expect(tileLabel(G4)).toBe('G4');
    expect(tileLabel(G5)).toBe('G5');
  });

  test('Blue family labels', () => {
    expect(tileLabel(B1)).toBe('B1');
    expect(tileLabel(B2)).toBe('B2');
    expect(tileLabel(B3)).toBe('B3');
    expect(tileLabel(B4)).toBe('B4');
    expect(tileLabel(B5)).toBe('B5');
  });

  test('invalid values return null', () => {
    expect(tileLabel(0)).toBeNull();
    expect(tileLabel(16)).toBeNull();
    expect(tileLabel(-1)).toBeNull();
  });
});

describe('tileDisplayDots', () => {
  test('empty cell has 0 display dots', () => {
    expect(tileDisplayDots(0)).toBe(0);
  });

  test('display dots equals shade within color family (0–4)', () => {
    // Shade 0
    expect(tileDisplayDots(R1)).toBe(0);
    expect(tileDisplayDots(G1)).toBe(0);
    expect(tileDisplayDots(B1)).toBe(0);
    // Shade 1
    expect(tileDisplayDots(R2)).toBe(1);
    expect(tileDisplayDots(G2)).toBe(1);
    expect(tileDisplayDots(B2)).toBe(1);
    // Shade 2
    expect(tileDisplayDots(R3)).toBe(2);
    expect(tileDisplayDots(G3)).toBe(2);
    expect(tileDisplayDots(B3)).toBe(2);
    // Shade 3
    expect(tileDisplayDots(R4)).toBe(3);
    expect(tileDisplayDots(G4)).toBe(3);
    expect(tileDisplayDots(B4)).toBe(3);
    // Shade 4
    expect(tileDisplayDots(R5)).toBe(4);
    expect(tileDisplayDots(G5)).toBe(4);
    expect(tileDisplayDots(B5)).toBe(4);
  });

  test('invalid value returns 0', () => {
    expect(tileDisplayDots(16)).toBe(0);
    expect(tileDisplayDots(-1)).toBe(0);
  });
});
