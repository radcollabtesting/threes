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

describe('forward merges: tier 0 → tier 1', () => {
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

  test('forward merges are commutative', () => {
    expect(mergeResult(CYAN, MAGENTA)).toBe(mergeResult(MAGENTA, CYAN));
    expect(mergeResult(CYAN, YELLOW)).toBe(mergeResult(YELLOW, CYAN));
  });
});

describe('forward merges: tier 1 → tier 2', () => {
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

  test('B + M → Indigo', () => {
    const B = encodeTile(BLUE_IDX, 0);
    const result = mergeResult(B, MAGENTA);
    expect(tileColorIndex(result)).toBe(INDIGO_IDX);
  });

  test('B + G → Teal', () => {
    const B = encodeTile(BLUE_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    const result = mergeResult(B, G);
    expect(tileColorIndex(result)).toBe(TEAL_IDX);
    expect(tileDots(result)).toBe(0);
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

  test('base + base with 0 dots → primary with 0 dots', () => {
    const result = mergeResult(CYAN, MAGENTA);
    expect(tileColorIndex(result)).toBe(BLUE_IDX);
    expect(tileDots(result)).toBe(0);
  });
});

describe('tier 2 cross-merge → Gray', () => {
  test('Orange + Violet → Gray', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const V = encodeTile(VIOLET_IDX, 0);
    expect(canMerge(O, V)).toBe(true);
    const result = mergeResult(O, V);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('Orange + Indigo → Gray', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const I = encodeTile(INDIGO_IDX, 0);
    expect(canMerge(O, I)).toBe(true);
    const result = mergeResult(O, I);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('Orange + Teal → Gray', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const T = encodeTile(TEAL_IDX, 0);
    expect(canMerge(O, T)).toBe(true);
    const result = mergeResult(O, T);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(0);
  });

  test('Violet + Indigo → Gray', () => {
    const V = encodeTile(VIOLET_IDX, 0);
    const I = encodeTile(INDIGO_IDX, 0);
    expect(canMerge(V, I)).toBe(true);
    const result = mergeResult(V, I);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
  });

  test('Violet + Teal → Gray', () => {
    const V = encodeTile(VIOLET_IDX, 0);
    const T = encodeTile(TEAL_IDX, 0);
    expect(canMerge(V, T)).toBe(true);
    const result = mergeResult(V, T);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
  });

  test('Indigo + Teal → Gray', () => {
    const I = encodeTile(INDIGO_IDX, 0);
    const T = encodeTile(TEAL_IDX, 0);
    expect(canMerge(I, T)).toBe(true);
    const result = mergeResult(I, T);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
  });

  test('all 6 secondary pairs produce Gray', () => {
    const secs = [ORANGE_IDX, VIOLET_IDX, INDIGO_IDX, TEAL_IDX];
    for (let i = 0; i < secs.length; i++) {
      for (let j = i + 1; j < secs.length; j++) {
        const a = encodeTile(secs[i], 0);
        const b = encodeTile(secs[j], 0);
        expect(canMerge(a, b)).toBe(true);
        const result = mergeResult(a, b);
        expect(tileColorIndex(result)).toBe(GRAY_IDX);
        expect(tileDots(result)).toBe(0);
      }
    }
  });
});

describe('Gray + Gray merges', () => {
  test('Gray(0) + Gray(0) → Gray(1)', () => {
    const G0a = encodeTile(GRAY_IDX, 0);
    const G0b = encodeTile(GRAY_IDX, 0);
    expect(canMerge(G0a, G0b)).toBe(true);
    const result = mergeResult(G0a, G0b);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(1);
  });

  test('Gray(1) + Gray(1) → Gray(2)', () => {
    const G1a = encodeTile(GRAY_IDX, 1);
    const G1b = encodeTile(GRAY_IDX, 1);
    expect(canMerge(G1a, G1b)).toBe(true);
    const result = mergeResult(G1a, G1b);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(2);
  });

  test('Gray(3) + Gray(3) → Gray(4)', () => {
    const G3a = encodeTile(GRAY_IDX, 3);
    const G3b = encodeTile(GRAY_IDX, 3);
    expect(canMerge(G3a, G3b)).toBe(true);
    const result = mergeResult(G3a, G3b);
    expect(tileColorIndex(result)).toBe(GRAY_IDX);
    expect(tileDots(result)).toBe(4);
  });

  test('Gray with different dots cannot merge', () => {
    const G0 = encodeTile(GRAY_IDX, 0);
    const G1 = encodeTile(GRAY_IDX, 1);
    expect(canMerge(G0, G1)).toBe(false);
  });
});

describe('no backward merges', () => {
  test('Orange + Red cannot merge (backward merge removed)', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const R = encodeTile(RED_IDX, 0);
    expect(canMerge(O, R)).toBe(false);
  });

  test('Orange + Yellow cannot merge (backward merge removed)', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    expect(canMerge(O, YELLOW)).toBe(false);
  });

  test('Violet + Blue cannot merge (backward merge removed)', () => {
    const V = encodeTile(VIOLET_IDX, 0);
    const B = encodeTile(BLUE_IDX, 0);
    expect(canMerge(V, B)).toBe(false);
  });

  test('Indigo + Blue cannot merge (backward merge removed)', () => {
    const I = encodeTile(INDIGO_IDX, 0);
    const B = encodeTile(BLUE_IDX, 0);
    expect(canMerge(I, B)).toBe(false);
  });
});

describe('unlisted combos are blocked', () => {
  test('Red + Green cannot merge', () => {
    const R = encodeTile(RED_IDX, 0);
    const G = encodeTile(GREEN_IDX, 0);
    expect(canMerge(R, G)).toBe(false);
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

  test('Gray + non-Gray cannot merge', () => {
    const G = encodeTile(GRAY_IDX, 0);
    const R = encodeTile(RED_IDX, 0);
    expect(canMerge(G, R)).toBe(false);
    expect(canMerge(G, CYAN)).toBe(false);
    expect(canMerge(G, encodeTile(ORANGE_IDX, 0))).toBe(false);
  });
});

describe('canMerge', () => {
  test('same color cannot merge (except Gray with matching dots)', () => {
    expect(canMerge(CYAN, CYAN)).toBe(false);
    expect(canMerge(MAGENTA, MAGENTA)).toBe(false);
    const O = encodeTile(ORANGE_IDX, 0);
    expect(canMerge(O, O)).toBe(false);
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

  test('Gray has hex color', () => {
    expect(tileHex(encodeTile(GRAY_IDX, 0))).toBe('#888888');
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

  test('Gray has no label', () => {
    expect(tileLabel(encodeTile(GRAY_IDX, 0))).toBeNull();
  });
});

describe('getMergePartners', () => {
  test('empty cell has no partners', () => {
    expect(getMergePartners(0)).toEqual([]);
  });

  test('base color Cyan has 2 forward partners', () => {
    const partners = getMergePartners(CYAN);
    expect(partners).toContain(MAGENTA_IDX);
    expect(partners).toContain(YELLOW_IDX);
    expect(partners).toHaveLength(2);
  });

  test('secondary Orange has 3 partners (other secondaries)', () => {
    const O = encodeTile(ORANGE_IDX, 0);
    const partners = getMergePartners(O);
    expect(partners).toContain(VIOLET_IDX);
    expect(partners).toContain(INDIGO_IDX);
    expect(partners).toContain(TEAL_IDX);
    expect(partners).toHaveLength(3);
  });

  test('Gray merges with Gray', () => {
    const G = encodeTile(GRAY_IDX, 0);
    const partners = getMergePartners(G);
    expect(partners).toEqual([GRAY_IDX]);
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

  test('SECONDARY_TILES has 4 elements (includes Teal)', () => {
    expect(SECONDARY_TILES).toHaveLength(4);
    for (const t of SECONDARY_TILES) {
      expect(tileTier(t)).toBe(2);
    }
  });
});
