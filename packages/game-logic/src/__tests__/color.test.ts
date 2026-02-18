import {
  encodeTile,
  tileColorIndex,
  tileDots,
  tileDisplayDots,
  tileTier,
  tileHex,
  tileTextColor,
  tileLabel,
  canMerge,
  mergeResult,
  getMergePartners,
  CYAN,
  MAGENTA,
  YELLOW,
  BASE_TILES,
  PRIMARY_TILES,
  SECONDARY_TILES,
  CYAN_IDX,
  MAGENTA_IDX,
  YELLOW_IDX,
  BLUE_IDX,
  RED_IDX,
  GREEN_IDX,
  ORANGE_IDX,
  VIOLET_IDX,
  TEAL_IDX,
  INDIGO_IDX,
  GRAY_IDX,
  BROWN_IDX,
  NUM_COLORS,
} from '../color';

describe('encoding / decoding', () => {
  test('encode then decode round-trips: colorIndex and dots', () => {
    const id = encodeTile(RED_IDX, 3);
    expect(tileColorIndex(id)).toBe(RED_IDX);
    expect(tileDots(id)).toBe(3);
  });

  test('different color indices produce different IDs', () => {
    const ids = new Set([
      encodeTile(CYAN_IDX, 0),
      encodeTile(MAGENTA_IDX, 0),
      encodeTile(YELLOW_IDX, 0),
    ]);
    expect(ids.size).toBe(3);
  });

  test('same color different dots produce different IDs', () => {
    expect(encodeTile(RED_IDX, 0)).not.toBe(encodeTile(RED_IDX, 1));
  });

  test('all encoded values are positive (0 reserved for empty)', () => {
    expect(encodeTile(0, 0)).toBeGreaterThan(0);
  });

  test('Gray index round-trips', () => {
    const id = encodeTile(GRAY_IDX, 2);
    expect(tileColorIndex(id)).toBe(GRAY_IDX);
    expect(tileDots(id)).toBe(2);
  });
});

describe('base tile constants', () => {
  test('CYAN = encodeTile(CYAN_IDX, 0)', () => {
    expect(CYAN).toBe(encodeTile(CYAN_IDX, 0));
    expect(tileColorIndex(CYAN)).toBe(CYAN_IDX);
    expect(tileDots(CYAN)).toBe(0);
  });

  test('MAGENTA = encodeTile(MAGENTA_IDX, 0)', () => {
    expect(MAGENTA).toBe(encodeTile(MAGENTA_IDX, 0));
  });

  test('YELLOW = encodeTile(YELLOW_IDX, 0)', () => {
    expect(YELLOW).toBe(encodeTile(YELLOW_IDX, 0));
  });

  test('BASE_TILES contains exactly C, M, Y', () => {
    expect(BASE_TILES).toEqual([CYAN, MAGENTA, YELLOW]);
  });
});

describe('tileTier', () => {
  test('base colors are tier 0', () => {
    expect(tileTier(CYAN)).toBe(0);
    expect(tileTier(MAGENTA)).toBe(0);
    expect(tileTier(YELLOW)).toBe(0);
  });

  test('primary colors are tier 1', () => {
    expect(tileTier(encodeTile(BLUE_IDX, 0))).toBe(1);
    expect(tileTier(encodeTile(RED_IDX, 0))).toBe(1);
    expect(tileTier(encodeTile(GREEN_IDX, 0))).toBe(1);
  });

  test('secondary colors are tier 2', () => {
    expect(tileTier(encodeTile(ORANGE_IDX, 0))).toBe(2);
    expect(tileTier(encodeTile(VIOLET_IDX, 0))).toBe(2);
    expect(tileTier(encodeTile(INDIGO_IDX, 0))).toBe(2);
    expect(tileTier(encodeTile(TEAL_IDX, 0))).toBe(2);
  });

  test('Gray is tier 3', () => {
    expect(tileTier(encodeTile(GRAY_IDX, 0))).toBe(3);
    expect(tileTier(encodeTile(GRAY_IDX, 5))).toBe(3);
  });
});

describe('base cross-color merges: canMerge', () => {
  test('different base colors with same dots can merge', () => {
    expect(canMerge(CYAN, MAGENTA)).toBe(true);
    expect(canMerge(MAGENTA, YELLOW)).toBe(true);
    expect(canMerge(YELLOW, CYAN)).toBe(true);
  });

  test('same base color cannot merge', () => {
    expect(canMerge(CYAN, CYAN)).toBe(false);
    expect(canMerge(MAGENTA, MAGENTA)).toBe(false);
    expect(canMerge(YELLOW, YELLOW)).toBe(false);
  });

  test('base colors with different dots cannot merge', () => {
    const C0 = encodeTile(CYAN_IDX, 0);
    const M1 = encodeTile(MAGENTA_IDX, 1);
    expect(canMerge(C0, M1)).toBe(false);
  });

  test('empty cells never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, CYAN)).toBe(false);
  });

  test('different primary tiles can merge (cross-color)', () => {
    const B = encodeTile(BLUE_IDX, 0);
    const R = encodeTile(RED_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    expect(canMerge(B, R)).toBe(true);
    expect(canMerge(R, G)).toBe(true);
    expect(canMerge(B, G)).toBe(true);
    // Same primary cannot merge
    expect(canMerge(B, B)).toBe(false);
    expect(canMerge(R, R)).toBe(false);
    expect(canMerge(G, G)).toBe(false);
  });

  test('different secondary tiles can merge (cross-color → Gray)', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const I = encodeTile(INDIGO_IDX, 0);
    const T = encodeTile(TEAL_IDX, 0);
    expect(canMerge(I, O)).toBe(true);
    expect(canMerge(O, T)).toBe(true);
    expect(canMerge(I, T)).toBe(true);
    // Same secondary cannot merge
    expect(canMerge(O, O)).toBe(false);
    expect(canMerge(I, I)).toBe(false);
  });

  test('Gray + Gray (same dots) can merge', () => {
    const G0 = encodeTile(GRAY_IDX, 0);
    const G1 = encodeTile(GRAY_IDX, 1);
    expect(canMerge(G0, G0)).toBe(true);
    expect(canMerge(G1, G1)).toBe(true);
    // Different dots cannot
    expect(canMerge(G0, G1)).toBe(false);
  });
});

describe('mergeResult: base cross-color → primary', () => {
  test('C + M → Blue', () => {
    const result = mergeResult(CYAN, MAGENTA);
    expect(tileColorIndex(result)).toBe(BLUE_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('M + C → Blue (order independent)', () => {
    const result = mergeResult(MAGENTA, CYAN);
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
});

describe('mergeResult: primary cross-color → secondary', () => {
  test('B + R → Indigo', () => {
    const B = encodeTile(BLUE_IDX, 0);
    const R = encodeTile(RED_IDX, 0);
    const result = mergeResult(B, R);
    expect(tileColorIndex(result)).toBe(INDIGO_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('R + G → Orange', () => {
    const R = encodeTile(RED_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    const result = mergeResult(R, G);
    expect(tileColorIndex(result)).toBe(ORANGE_IDX);
  });

  test('B + G → Teal', () => {
    const B = encodeTile(BLUE_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    const result = mergeResult(B, G);
    expect(tileColorIndex(result)).toBe(TEAL_IDX);
  });
});

describe('mergeResult: secondary cross-color → Gray', () => {
  test('I + O → Gray(0)', () => {
    const I = encodeTile(INDIGO_IDX, 0);
    const O = encodeTile(ORANGE_IDX, 0);
    const result = mergeResult(I, O);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('O + T → Gray(0)', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const T = encodeTile(TEAL_IDX, 0);
    const result = mergeResult(O, T);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('I + T → Gray(0)', () => {
    const I = encodeTile(INDIGO_IDX, 0);
    const T = encodeTile(TEAL_IDX, 0);
    const result = mergeResult(I, T);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(0);
  });
});

describe('Gray + Gray merges', () => {
  test('Gray(0) + Gray(0) → Gray(1)', () => {
    const G0 = encodeTile(GRAY_IDX, 0);
    expect(canMerge(G0, G0)).toBe(true);
    const result = mergeResult(G0, G0);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(1);
  });

  test('Gray(1) + Gray(1) → Gray(2)', () => {
    const G1 = encodeTile(GRAY_IDX, 1);
    expect(canMerge(G1, G1)).toBe(true);
    const result = mergeResult(G1, G1);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(2);
  });

  test('Gray(3) + Gray(3) → Gray(4)', () => {
    const G3 = encodeTile(GRAY_IDX, 3);
    expect(canMerge(G3, G3)).toBe(true);
    const result = mergeResult(G3, G3);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(4);
  });

  test('Gray with different dots cannot merge', () => {
    const G0 = encodeTile(GRAY_IDX, 0);
    const G1 = encodeTile(GRAY_IDX, 1);
    expect(canMerge(G0, G1)).toBe(false);
  });
});

describe('deterministic merge consistency', () => {
  test('same merge always produces the same result', () => {
    // Verify determinism: calling mergeResult multiple times gives same answer
    const r1 = mergeResult(CYAN, MAGENTA);
    const r2 = mergeResult(CYAN, MAGENTA);
    expect(r1).toBe(r2);
  });

  test('dots are preserved through cross-color merges', () => {
    const C1 = encodeTile(CYAN_IDX, 1);
    const M1 = encodeTile(MAGENTA_IDX, 1);
    const result = mergeResult(C1, M1);
    expect(tileColorIndex(result)).toBe(BLUE_IDX);
    expect(tileDots(result)).toBe(1);
  });
});

describe('cross-tier merges are blocked', () => {
  test('base + primary cannot merge', () => {
    const B = encodeTile(BLUE_IDX, 0);
    expect(canMerge(CYAN, B)).toBe(false);
  });

  test('primary + secondary cannot merge', () => {
    const R = encodeTile(RED_IDX, 0);
    const O = encodeTile(ORANGE_IDX, 0);
    expect(canMerge(R, O)).toBe(false);
  });

  test('secondary + Gray cannot merge', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const G = encodeTile(GRAY_IDX, 0);
    expect(canMerge(O, G)).toBe(false);
  });

  test('Gray + non-Gray cannot merge', () => {
    const G = encodeTile(GRAY_IDX, 0);
    expect(canMerge(G, CYAN)).toBe(false);
    expect(canMerge(G, encodeTile(RED_IDX, 0))).toBe(false);
    expect(canMerge(G, encodeTile(ORANGE_IDX, 0))).toBe(false);
  });
});

describe('tileHex', () => {
  test('CYAN produces #87FBE9', () => {
    expect(tileHex(CYAN)).toBe('#87FBE9');
  });

  test('MAGENTA produces #CA4DF2', () => {
    expect(tileHex(MAGENTA)).toBe('#CA4DF2');
  });

  test('YELLOW produces #F4CF5F', () => {
    expect(tileHex(YELLOW)).toBe('#F4CF5F');
  });

  test('dotted tiles have same hex as undotted', () => {
    const r0 = encodeTile(RED_IDX, 0);
    const r3 = encodeTile(RED_IDX, 3);
    expect(tileHex(r0)).toBe(tileHex(r3));
  });

  test('Gray hex lightens with each merge (dark → mid → white)', () => {
    // Fresh gray (0 dots) is dark
    expect(tileHex(encodeTile(GRAY_IDX, 0))).toBe('#616161');
    // Each merge gets lighter
    expect(tileHex(encodeTile(GRAY_IDX, 1))).toBe('#b1b1b1');
    // dots 2 = white (mix unlocked)
    expect(tileHex(encodeTile(GRAY_IDX, 2))).toBe('#FFFFFF');
    // Clamps at white
    expect(tileHex(encodeTile(GRAY_IDX, 3))).toBe('#FFFFFF');
    expect(tileHex(encodeTile(GRAY_IDX, 10))).toBe('#FFFFFF');
  });
});

describe('tileTextColor', () => {
  test('returns white for dark colors (Blue)', () => {
    expect(tileTextColor(encodeTile(BLUE_IDX, 0))).toBe('#FFFFFF');
  });

  test('returns black for bright colors (Yellow)', () => {
    expect(tileTextColor(YELLOW)).toBe('#000000');
  });
});

describe('tileLabel', () => {
  test('base colors have labels', () => {
    expect(tileLabel(CYAN)).toBe('C');
    expect(tileLabel(MAGENTA)).toBe('M');
    expect(tileLabel(YELLOW)).toBe('Y');
  });

  test('primary colors have labels', () => {
    expect(tileLabel(encodeTile(BLUE_IDX, 0))).toBe('B');
    expect(tileLabel(encodeTile(RED_IDX, 0))).toBe('R');
    expect(tileLabel(encodeTile(GREEN_IDX, 0))).toBe('G');
  });

  test('secondary colors have labels', () => {
    expect(tileLabel(encodeTile(ORANGE_IDX, 0))).toBe('O');
    expect(tileLabel(encodeTile(VIOLET_IDX, 0))).toBe('V');
    expect(tileLabel(encodeTile(INDIGO_IDX, 0))).toBe('I');
    expect(tileLabel(encodeTile(TEAL_IDX, 0))).toBe('T');
  });

  test('dotted tiles still show label', () => {
    const r2 = encodeTile(RED_IDX, 2);
    expect(tileLabel(r2)).toBe('R');
  });

  test('Gray labels by level: Dk, Md, then null for white', () => {
    expect(tileLabel(encodeTile(GRAY_IDX, 0))).toBe('Dk');
    expect(tileLabel(encodeTile(GRAY_IDX, 1))).toBe('Md');
    expect(tileLabel(encodeTile(GRAY_IDX, 2))).toBeNull();
  });

  test('Brown label is Br', () => {
    expect(tileLabel(encodeTile(BROWN_IDX, 0))).toBe('Br');
  });
});

describe('getMergePartners', () => {
  test('empty cell has no partners', () => {
    expect(getMergePartners(0)).toEqual([]);
  });

  test('base tiles merge with the other two base colors', () => {
    expect(getMergePartners(CYAN)).toEqual([MAGENTA_IDX, YELLOW_IDX]);
    expect(getMergePartners(MAGENTA)).toEqual([CYAN_IDX, YELLOW_IDX]);
    expect(getMergePartners(YELLOW)).toEqual([CYAN_IDX, MAGENTA_IDX]);
  });

  test('primary tiles merge with the other two primaries', () => {
    const B = encodeTile(BLUE_IDX, 0);
    const R = encodeTile(RED_IDX, 0);
    expect(getMergePartners(B)).toEqual(expect.arrayContaining([RED_IDX, GREEN_IDX]));
    expect(getMergePartners(R)).toEqual(expect.arrayContaining([BLUE_IDX, GREEN_IDX]));
  });

  test('secondary tiles merge with the other secondaries', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const partners = getMergePartners(O);
    expect(partners.length).toBeGreaterThanOrEqual(2);
    expect(partners).not.toContain(ORANGE_IDX);
  });

  test('Gray merges with Gray', () => {
    const G = encodeTile(GRAY_IDX, 0);
    expect(getMergePartners(G)).toEqual([GRAY_IDX]);
  });

  test('dotted tiles have same partners as undotted', () => {
    const R0 = encodeTile(RED_IDX, 0);
    const R3 = encodeTile(RED_IDX, 3);
    expect(getMergePartners(R0)).toEqual(getMergePartners(R3));
  });
});

describe('tileDisplayDots', () => {
  test('empty cell has 0 display dots', () => {
    expect(tileDisplayDots(0)).toBe(0);
  });

  test('base colors have 0 display dots', () => {
    expect(tileDisplayDots(CYAN)).toBe(0);
    expect(tileDisplayDots(MAGENTA)).toBe(0);
    expect(tileDisplayDots(YELLOW)).toBe(0);
  });

  test('primary colors have 1 display dot', () => {
    expect(tileDisplayDots(encodeTile(BLUE_IDX, 0))).toBe(1);
    expect(tileDisplayDots(encodeTile(RED_IDX, 0))).toBe(1);
    expect(tileDisplayDots(encodeTile(GREEN_IDX, 0))).toBe(1);
  });

  test('secondary colors have 2 display dots', () => {
    expect(tileDisplayDots(encodeTile(ORANGE_IDX, 0))).toBe(2);
    expect(tileDisplayDots(encodeTile(VIOLET_IDX, 0))).toBe(2);
    expect(tileDisplayDots(encodeTile(INDIGO_IDX, 0))).toBe(2);
    expect(tileDisplayDots(encodeTile(TEAL_IDX, 0))).toBe(2);
  });

  test('fresh Gray has 2 display dots', () => {
    expect(tileDisplayDots(encodeTile(GRAY_IDX, 0))).toBe(2);
  });

  test('Gray after 1 merge has 3 display dots', () => {
    expect(tileDisplayDots(encodeTile(GRAY_IDX, 1))).toBe(3);
  });

  test('Gray after 2 merges has 4 display dots', () => {
    expect(tileDisplayDots(encodeTile(GRAY_IDX, 2))).toBe(4);
  });

  test('Gray display dots = 2 + encoded dots', () => {
    for (let d = 0; d <= 5; d++) {
      expect(tileDisplayDots(encodeTile(GRAY_IDX, d))).toBe(2 + d);
    }
  });
});

describe('tile arrays', () => {
  test('PRIMARY_TILES has 3 elements', () => {
    expect(PRIMARY_TILES).toHaveLength(3);
    for (const t of PRIMARY_TILES) {
      expect(tileTier(t)).toBe(1);
    }
  });

  test('SECONDARY_TILES has 4 elements (includes Teal)', () => {
    expect(SECONDARY_TILES).toHaveLength(4);
    for (const t of SECONDARY_TILES) {
      expect(tileTier(t)).toBe(2);
    }
  });
});
