import {
  encodeTile,
  tileColorIndex,
  tileDots,
  tileTier,
  tileHex,
  tileTextColor,
  tileLabel,
  canMerge,
  mergeResult,
  isBackwardMerge,
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
  CHARTREUSE_IDX,
  TEAL_IDX,
  TURQUOISE_IDX,
  INDIGO_IDX,
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
  });
});

describe('forward merges', () => {
  test('C + M → Blue', () => {
    const result = mergeResult(CYAN, MAGENTA);
    expect(tileColorIndex(result)).toBe(BLUE_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('M + Y → Red', () => {
    const result = mergeResult(MAGENTA, YELLOW);
    expect(tileColorIndex(result)).toBe(RED_IDX);
  });

  test('Y + C → Green', () => {
    const result = mergeResult(YELLOW, CYAN);
    expect(tileColorIndex(result)).toBe(GREEN_IDX);
  });

  test('R + Y → Orange', () => {
    const R = encodeTile(RED_IDX, 0);
    const result = mergeResult(R, YELLOW);
    expect(tileColorIndex(result)).toBe(ORANGE_IDX);
  });

  test('R + M → Violet', () => {
    const R = encodeTile(RED_IDX, 0);
    const result = mergeResult(R, MAGENTA);
    expect(tileColorIndex(result)).toBe(VIOLET_IDX);
  });

  test('R + B → Violet', () => {
    const R = encodeTile(RED_IDX, 0);
    const B = encodeTile(BLUE_IDX, 0);
    const result = mergeResult(R, B);
    expect(tileColorIndex(result)).toBe(VIOLET_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('B + G → Cyan with +1 dot (demotion merge)', () => {
    const B = encodeTile(BLUE_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    const result = mergeResult(B, G);
    expect(tileColorIndex(result)).toBe(CYAN_IDX);
    expect(tileDots(result)).toBe(1); // demotion bonus
  });

  test('B + G with dots → Cyan carries max dots + 1', () => {
    const B2 = encodeTile(BLUE_IDX, 2);
    const G1 = encodeTile(GREEN_IDX, 1);
    const result = mergeResult(B2, G1);
    expect(tileColorIndex(result)).toBe(CYAN_IDX);
    expect(tileDots(result)).toBe(3); // max(2,1) + 1 bonus
  });

  test('B + M → Indigo', () => {
    const B = encodeTile(BLUE_IDX, 0);
    const result = mergeResult(B, MAGENTA);
    expect(tileColorIndex(result)).toBe(INDIGO_IDX);
  });

  test('forward merges are commutative', () => {
    expect(mergeResult(CYAN, MAGENTA)).toBe(mergeResult(MAGENTA, CYAN));
    expect(mergeResult(CYAN, YELLOW)).toBe(mergeResult(YELLOW, CYAN));
  });
});

describe('backward merges', () => {
  test('Orange + Red → Red with +1 dot', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const R = encodeTile(RED_IDX, 0);
    const result = mergeResult(O, R);
    expect(tileColorIndex(result)).toBe(RED_IDX);
    expect(tileDots(result)).toBe(1);
  });

  test('Orange + Yellow → Yellow with +1 dot', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const result = mergeResult(O, YELLOW);
    expect(tileColorIndex(result)).toBe(YELLOW_IDX);
    expect(tileDots(result)).toBe(1);
  });

  test('backward merge stacks dots on parent', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const R1 = encodeTile(RED_IDX, 1);
    const result = mergeResult(O, R1);
    expect(tileColorIndex(result)).toBe(RED_IDX);
    expect(tileDots(result)).toBe(2);
  });

  test('isBackwardMerge detects backward merges', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const R = encodeTile(RED_IDX, 0);
    expect(isBackwardMerge(O, R)).toBe(true);
    expect(isBackwardMerge(R, O)).toBe(true);
  });

  test('isBackwardMerge returns false for forward merges', () => {
    expect(isBackwardMerge(CYAN, MAGENTA)).toBe(false);
  });

  test('Indigo + Blue → Blue with +1 dot', () => {
    const I = encodeTile(INDIGO_IDX, 0);
    const B = encodeTile(BLUE_IDX, 0);
    const result = mergeResult(I, B);
    expect(tileColorIndex(result)).toBe(BLUE_IDX);
    expect(tileDots(result)).toBe(1);
  });
});

describe('unlisted combos are blocked', () => {
  test('Red + Green cannot merge', () => {
    const R = encodeTile(RED_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    expect(canMerge(R, G)).toBe(false);
  });

  test('Orange + Violet cannot merge', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const V = encodeTile(VIOLET_IDX, 0);
    expect(canMerge(O, V)).toBe(false);
  });

  test('Orange + non-parent Blue cannot merge', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const B = encodeTile(BLUE_IDX, 0);
    expect(canMerge(O, B)).toBe(false);
  });

  test('secondary + unrelated base cannot merge', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    expect(canMerge(O, CYAN)).toBe(false);
  });
});

describe('new merge rules', () => {
  test('Red + Blue CAN merge (→ Violet)', () => {
    const R = encodeTile(RED_IDX, 0);
    const B = encodeTile(BLUE_IDX, 0);
    expect(canMerge(R, B)).toBe(true);
  });

  test('Blue + Green CAN merge (→ Cyan with dot)', () => {
    const B = encodeTile(BLUE_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    expect(canMerge(B, G)).toBe(true);
  });

  test('Violet can backward merge with Blue (new parent)', () => {
    const V = encodeTile(VIOLET_IDX, 0);
    const B = encodeTile(BLUE_IDX, 0);
    expect(canMerge(V, B)).toBe(true);
    const result = mergeResult(V, B);
    expect(tileColorIndex(result)).toBe(BLUE_IDX);
    expect(tileDots(result)).toBe(1);
  });
});

describe('canMerge', () => {
  test('same color cannot merge', () => {
    expect(canMerge(CYAN, CYAN)).toBe(false);
    expect(canMerge(MAGENTA, MAGENTA)).toBe(false);
  });

  test('empty cells never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, CYAN)).toBe(false);
  });

  test('listed forward pairs can merge', () => {
    expect(canMerge(CYAN, MAGENTA)).toBe(true);
    expect(canMerge(CYAN, YELLOW)).toBe(true);
    expect(canMerge(MAGENTA, YELLOW)).toBe(true);
  });

  test('backward merge pairs can merge', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const R = encodeTile(RED_IDX, 0);
    expect(canMerge(O, R)).toBe(true);
    expect(canMerge(O, YELLOW)).toBe(true);
  });
});

describe('tileHex', () => {
  test('CYAN produces #53ffec', () => {
    expect(tileHex(CYAN)).toBe('#53ffec');
  });

  test('MAGENTA produces #e854ff', () => {
    expect(tileHex(MAGENTA)).toBe('#e854ff');
  });

  test('YELLOW produces #ffd654', () => {
    expect(tileHex(YELLOW)).toBe('#ffd654');
  });

  test('dotted tiles have same hex as undotted', () => {
    const r0 = encodeTile(RED_IDX, 0);
    const r3 = encodeTile(RED_IDX, 3);
    expect(tileHex(r0)).toBe(tileHex(r3));
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

  test('secondary colors have no label', () => {
    expect(tileLabel(encodeTile(ORANGE_IDX, 0))).toBeNull();
    expect(tileLabel(encodeTile(VIOLET_IDX, 0))).toBeNull();
  });

  test('dotted tiles still show label', () => {
    const r2 = encodeTile(RED_IDX, 2);
    expect(tileLabel(r2)).toBe('R');
  });
});

describe('forward merges carry dots', () => {
  test('dotted primary + base → secondary carries dots', () => {
    const R1 = encodeTile(RED_IDX, 1);
    const result = mergeResult(R1, YELLOW);
    expect(tileColorIndex(result)).toBe(ORANGE_IDX);
    expect(tileDots(result)).toBe(1);
  });

  test('two dotted tiles → result gets max dots', () => {
    const R2 = encodeTile(RED_IDX, 2);
    const Y1 = encodeTile(YELLOW_IDX, 1);
    const result = mergeResult(R2, Y1);
    expect(tileColorIndex(result)).toBe(ORANGE_IDX);
    expect(tileDots(result)).toBe(2);
  });

  test('base + base with 0 dots → secondary with 0 dots', () => {
    const result = mergeResult(CYAN, MAGENTA);
    expect(tileColorIndex(result)).toBe(BLUE_IDX);
    expect(tileDots(result)).toBe(0);
  });
});

describe('backward merges carry max dots', () => {
  test('dotted secondary + undotted parent → max(sec,parent) + 1', () => {
    const O1 = encodeTile(ORANGE_IDX, 1);
    const R0 = encodeTile(RED_IDX, 0);
    const result = mergeResult(O1, R0);
    expect(tileColorIndex(result)).toBe(RED_IDX);
    expect(tileDots(result)).toBe(2); // max(1,0)+1
  });

  test('undotted secondary + dotted parent → max(sec,parent) + 1', () => {
    const O0 = encodeTile(ORANGE_IDX, 0);
    const R2 = encodeTile(RED_IDX, 2);
    const result = mergeResult(O0, R2);
    expect(tileColorIndex(result)).toBe(RED_IDX);
    expect(tileDots(result)).toBe(3); // max(0,2)+1
  });

  test('full cycle: base→primary→secondary→primary→secondary accumulates dots', () => {
    // R(0) + Y(0) → O(0)
    const O0 = mergeResult(encodeTile(RED_IDX, 0), YELLOW);
    expect(tileColorIndex(O0)).toBe(ORANGE_IDX);
    expect(tileDots(O0)).toBe(0);

    // O(0) + R(0) → R(1)
    const R1 = mergeResult(O0, encodeTile(RED_IDX, 0));
    expect(tileColorIndex(R1)).toBe(RED_IDX);
    expect(tileDots(R1)).toBe(1);

    // R(1) + Y(0) → O(1) — dots carry!
    const O1 = mergeResult(R1, YELLOW);
    expect(tileColorIndex(O1)).toBe(ORANGE_IDX);
    expect(tileDots(O1)).toBe(1);

    // O(1) + R(0) → R(2) — max(1,0)+1
    const R2 = mergeResult(O1, encodeTile(RED_IDX, 0));
    expect(tileColorIndex(R2)).toBe(RED_IDX);
    expect(tileDots(R2)).toBe(2);

    // R(2) + Y(0) → O(2) — dots carry!
    const O2 = mergeResult(R2, YELLOW);
    expect(tileColorIndex(O2)).toBe(ORANGE_IDX);
    expect(tileDots(O2)).toBe(2);
  });
});

describe('getMergePartners', () => {
  test('empty cell has no partners', () => {
    expect(getMergePartners(0)).toEqual([]);
  });

  test('base color Cyan has 2 forward partners', () => {
    const partners = getMergePartners(CYAN);
    expect(partners).toContain(MAGENTA_IDX);   // forward C+M → Blue
    expect(partners).toContain(YELLOW_IDX);    // forward Y+C → Green
    expect(partners).toHaveLength(2);
  });

  test('secondary Orange has 2 partners (its parents)', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const partners = getMergePartners(O);
    expect(partners).toContain(RED_IDX);
    expect(partners).toContain(YELLOW_IDX);
    expect(partners).toHaveLength(2);
  });

  test('dotted tiles have same partners as undotted', () => {
    const R0 = encodeTile(RED_IDX, 0);
    const R3 = encodeTile(RED_IDX, 3);
    expect(getMergePartners(R0)).toEqual(getMergePartners(R3));
  });
});

describe('tile arrays', () => {
  test('PRIMARY_TILES has 3 elements', () => {
    expect(PRIMARY_TILES).toHaveLength(3);
    for (const t of PRIMARY_TILES) {
      expect(tileTier(t)).toBe(1);
    }
  });

  test('SECONDARY_TILES has 3 elements', () => {
    expect(SECONDARY_TILES).toHaveLength(3);
    for (const t of SECONDARY_TILES) {
      expect(tileTier(t)).toBe(2);
    }
  });
});
