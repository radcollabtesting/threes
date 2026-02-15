import {
  encodeTile,
  decodeTile,
  tileRgb,
  tileTier,
  tileHex,
  tileTextColor,
  tileLabel,
  isSameColor,
  mixColors,
  CYAN,
  MAGENTA,
  YELLOW,
  BASE_TILES,
} from '../color';

describe('color encoding/decoding', () => {
  test('encode then decode round-trips correctly', () => {
    const data = decodeTile(encodeTile(3, 10, 9, 0));
    expect(data).toEqual({ r: 3, g: 10, b: 9, tier: 0 });
  });

  test('different RGB values produce different IDs', () => {
    const c = encodeTile(3, 10, 9, 0);
    const m = encodeTile(9, 3, 10, 0);
    const y = encodeTile(10, 8, 3, 0);
    expect(new Set([c, m, y]).size).toBe(3);
  });

  test('same RGB different tier produces different IDs', () => {
    const t0 = encodeTile(5, 5, 5, 0);
    const t1 = encodeTile(5, 5, 5, 1);
    expect(t0).not.toBe(t1);
  });

  test('all encoded values are positive (0 reserved for empty)', () => {
    expect(encodeTile(0, 0, 0, 0)).toBeGreaterThan(0);
  });
});

describe('base tile constants', () => {
  test('CYAN decodes to (3, 10, 9) tier 0', () => {
    expect(decodeTile(CYAN)).toEqual({ r: 3, g: 10, b: 9, tier: 0 });
  });

  test('MAGENTA decodes to (9, 3, 10) tier 0', () => {
    expect(decodeTile(MAGENTA)).toEqual({ r: 9, g: 3, b: 10, tier: 0 });
  });

  test('YELLOW decodes to (10, 8, 3) tier 0', () => {
    expect(decodeTile(YELLOW)).toEqual({ r: 10, g: 8, b: 3, tier: 0 });
  });

  test('BASE_TILES contains exactly C, M, Y', () => {
    expect(BASE_TILES).toEqual([CYAN, MAGENTA, YELLOW]);
  });
});

describe('tileRgb / tileTier', () => {
  test('tileRgb extracts only the color channels', () => {
    expect(tileRgb(CYAN)).toEqual({ r: 3, g: 10, b: 9 });
  });

  test('tileTier extracts the tier', () => {
    expect(tileTier(CYAN)).toBe(0);
    const t2 = encodeTile(5, 5, 5, 2);
    expect(tileTier(t2)).toBe(2);
  });
});

describe('isSameColor', () => {
  test('same color returns true', () => {
    expect(isSameColor(CYAN, CYAN)).toBe(true);
  });

  test('different color returns false', () => {
    expect(isSameColor(CYAN, MAGENTA)).toBe(false);
  });

  test('same RGB but different tier still counts as same color', () => {
    const a = encodeTile(5, 5, 5, 0);
    const b = encodeTile(5, 5, 5, 3);
    expect(isSameColor(a, b)).toBe(true);
  });

  test('empty (0) is never same color', () => {
    expect(isSameColor(0, 0)).toBe(false);
    expect(isSameColor(0, CYAN)).toBe(false);
  });
});

describe('mixColors', () => {
  test('C + M = Blue (6, 7, 10) tier 1', () => {
    const result = mixColors(CYAN, MAGENTA);
    const data = decodeTile(result);
    expect(data.r).toBe(6);
    expect(data.g).toBe(7);
    expect(data.b).toBe(10);
    expect(data.tier).toBe(1);
  });

  test('M + Y = Red (10, 6, 7) tier 1', () => {
    const result = mixColors(MAGENTA, YELLOW);
    const data = decodeTile(result);
    expect(data.r).toBe(10);
    expect(data.g).toBe(6);
    expect(data.b).toBe(7);
    expect(data.tier).toBe(1);
  });

  test('C + Y = Green (7, 9, 6) tier 1', () => {
    const result = mixColors(CYAN, YELLOW);
    const data = decodeTile(result);
    expect(data.r).toBe(7);
    expect(data.g).toBe(9);
    expect(data.b).toBe(6);
    expect(data.tier).toBe(1);
  });

  test('mixing is commutative', () => {
    expect(mixColors(CYAN, MAGENTA)).toBe(mixColors(MAGENTA, CYAN));
    expect(mixColors(CYAN, YELLOW)).toBe(mixColors(YELLOW, CYAN));
    expect(mixColors(MAGENTA, YELLOW)).toBe(mixColors(YELLOW, MAGENTA));
  });

  test('mixing different tiers produces max(tier)+1', () => {
    const blue = mixColors(CYAN, MAGENTA); // tier 1
    const result = mixColors(blue, YELLOW); // tier 0 + tier 1 = tier 2
    expect(tileTier(result)).toBe(2);
  });
});

describe('tileHex', () => {
  test('CYAN produces expected hex color', () => {
    // (3,10,9) → (77, 255, 230) → #4dffe6
    const hex = tileHex(CYAN);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(hex).toBe('#4dffe6');
  });

  test('MAGENTA produces expected hex color', () => {
    // (9,3,10) → (230, 77, 255) → #e64dff
    expect(tileHex(MAGENTA)).toBe('#e64dff');
  });

  test('YELLOW produces expected hex color', () => {
    // (10,8,3) → (255, 204, 77) → #ffcc4d
    expect(tileHex(YELLOW)).toBe('#ffcc4d');
  });
});

describe('tileTextColor', () => {
  test('returns white for dark colors', () => {
    // A tile with low luminance
    const dark = encodeTile(1, 1, 1, 0);
    expect(tileTextColor(dark)).toBe('#FFFFFF');
  });

  test('returns black for bright colors', () => {
    // Yellow is bright
    expect(tileTextColor(YELLOW)).toBe('#000000');
  });
});

describe('tileLabel', () => {
  test('base colors have labels', () => {
    expect(tileLabel(CYAN)).toBe('C');
    expect(tileLabel(MAGENTA)).toBe('M');
    expect(tileLabel(YELLOW)).toBe('Y');
  });

  test('primary mixes have labels', () => {
    const blue = mixColors(CYAN, MAGENTA);
    const red = mixColors(MAGENTA, YELLOW);
    const green = mixColors(CYAN, YELLOW);
    expect(tileLabel(blue)).toBe('B');
    expect(tileLabel(red)).toBe('R');
    expect(tileLabel(green)).toBe('G');
  });

  test('deeper mixes have no label', () => {
    const blue = mixColors(CYAN, MAGENTA);
    const deeper = mixColors(blue, YELLOW);
    expect(tileLabel(deeper)).toBeNull();
  });
});
