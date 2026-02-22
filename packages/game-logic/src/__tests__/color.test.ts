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
  splitResult,
  getMergePartners,
  isMilestoneSplit,
  SPLIT_MAP,
  BLACK,
  WHITE,
  CYAN,
  MAGENTA,
  YELLOW,
  RED,
  GREEN,
  BLUE,
  BASE_TILES,
  PRIMARY_TILES,
  SECONDARY_TILES,
  BLACK_IDX,
  WHITE_IDX,
  CYAN_IDX,
  MAGENTA_IDX,
  YELLOW_IDX,
  RED_IDX,
  GREEN_IDX,
  BLUE_IDX,
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
      encodeTile(BLACK_IDX, 0),
      encodeTile(CYAN_IDX, 0),
      encodeTile(RED_IDX, 0),
      encodeTile(WHITE_IDX, 0),
    ]);
    expect(ids.size).toBe(4);
  });

  test('all encoded values are positive (0 reserved for empty)', () => {
    expect(encodeTile(0, 0)).toBeGreaterThan(0);
  });

  test('all 8 colors round-trip', () => {
    for (let ci = 0; ci < NUM_COLORS; ci++) {
      const id = encodeTile(ci, 0);
      expect(tileColorIndex(id)).toBe(ci);
      expect(tileDots(id)).toBe(0);
    }
  });
});

describe('tile constants', () => {
  test('BLACK = encodeTile(BLACK_IDX, 0)', () => {
    expect(BLACK).toBe(encodeTile(BLACK_IDX, 0));
    expect(tileColorIndex(BLACK)).toBe(BLACK_IDX);
  });

  test('CYAN = encodeTile(CYAN_IDX, 0)', () => {
    expect(CYAN).toBe(encodeTile(CYAN_IDX, 0));
  });

  test('WHITE = encodeTile(WHITE_IDX, 0)', () => {
    expect(WHITE).toBe(encodeTile(WHITE_IDX, 0));
  });

  test('BASE_TILES contains only BLACK', () => {
    expect(BASE_TILES).toEqual([BLACK]);
  });

  test('PRIMARY_TILES has 6 elements', () => {
    expect(PRIMARY_TILES).toHaveLength(6);
    for (const t of PRIMARY_TILES) {
      expect(tileTier(t)).toBe(1);
    }
  });

  test('SECONDARY_TILES is empty (no tints)', () => {
    expect(SECONDARY_TILES).toHaveLength(0);
  });
});

describe('tileTier', () => {
  test('endpoint colors are tier 0', () => {
    expect(tileTier(BLACK)).toBe(0);
    expect(tileTier(WHITE)).toBe(0);
  });

  test('primary colors are tier 1', () => {
    expect(tileTier(CYAN)).toBe(1);
    expect(tileTier(MAGENTA)).toBe(1);
    expect(tileTier(YELLOW)).toBe(1);
    expect(tileTier(RED)).toBe(1);
    expect(tileTier(GREEN)).toBe(1);
    expect(tileTier(BLUE)).toBe(1);
  });
});

describe('canMerge — same color splits', () => {
  test('same color can merge', () => {
    expect(canMerge(BLACK, BLACK)).toBe(true);
    expect(canMerge(CYAN, CYAN)).toBe(true);
    expect(canMerge(WHITE, WHITE)).toBe(true);
    expect(canMerge(RED, RED)).toBe(true);
  });

  test('different colors cannot merge', () => {
    expect(canMerge(CYAN, MAGENTA)).toBe(false);
    expect(canMerge(BLACK, WHITE)).toBe(false);
    expect(canMerge(RED, BLUE)).toBe(false);
  });

  test('empty cells never merge', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(0, BLACK)).toBe(false);
  });
});

describe('splitResult — breakdown chain', () => {
  test('Black → C,M,Y (milestone)', () => {
    const result = splitResult(BLACK, BLACK)!;
    expect(result.isMilestone).toBe(true);
    expect(result.outputs).toHaveLength(3);
    const outputIndices = result.outputs.map(tileColorIndex).sort();
    expect(outputIndices).toEqual([CYAN_IDX, MAGENTA_IDX, YELLOW_IDX].sort());
  });

  test('Cyan → 2 White (regular)', () => {
    const result = splitResult(CYAN, CYAN)!;
    expect(result.isMilestone).toBe(false);
    expect(result.outputs).toHaveLength(2);
    expect(tileColorIndex(result.outputs[0])).toBe(WHITE_IDX);
    expect(tileColorIndex(result.outputs[1])).toBe(WHITE_IDX);
  });

  test('Magenta → 2 White', () => {
    const result = splitResult(MAGENTA, MAGENTA)!;
    expect(result.outputs).toHaveLength(2);
    expect(tileColorIndex(result.outputs[0])).toBe(WHITE_IDX);
  });

  test('Yellow → 2 White', () => {
    const result = splitResult(YELLOW, YELLOW)!;
    expect(result.outputs).toHaveLength(2);
    expect(tileColorIndex(result.outputs[0])).toBe(WHITE_IDX);
  });

  test('White → R,G,B (milestone)', () => {
    const result = splitResult(WHITE, WHITE)!;
    expect(result.isMilestone).toBe(true);
    expect(result.outputs).toHaveLength(3);
    const outputIndices = result.outputs.map(tileColorIndex).sort();
    expect(outputIndices).toEqual([RED_IDX, GREEN_IDX, BLUE_IDX].sort());
  });

  test('Red → 2 Black (cycle back)', () => {
    const result = splitResult(RED, RED)!;
    expect(result.isMilestone).toBe(false);
    expect(result.outputs).toHaveLength(2);
    expect(tileColorIndex(result.outputs[0])).toBe(BLACK_IDX);
  });

  test('Green → 2 Black (cycle back)', () => {
    const result = splitResult(GREEN, GREEN)!;
    expect(tileColorIndex(result.outputs[0])).toBe(BLACK_IDX);
  });

  test('Blue → 2 Black (cycle back)', () => {
    const result = splitResult(BLUE, BLUE)!;
    expect(tileColorIndex(result.outputs[0])).toBe(BLACK_IDX);
  });
});

describe('mergeResult — legacy compatibility', () => {
  test('regular split returns 0 (merge point empties)', () => {
    expect(mergeResult(CYAN, CYAN)).toBe(0);
    expect(mergeResult(RED, RED)).toBe(0);
  });

  test('milestone split returns first output (on merge point)', () => {
    const bkResult = mergeResult(BLACK, BLACK);
    expect(bkResult).toBeGreaterThan(0);
    expect([CYAN_IDX, MAGENTA_IDX, YELLOW_IDX]).toContain(tileColorIndex(bkResult));

    const wResult = mergeResult(WHITE, WHITE);
    expect(wResult).toBeGreaterThan(0);
    expect([RED_IDX, GREEN_IDX, BLUE_IDX]).toContain(tileColorIndex(wResult));
  });
});

describe('isMilestoneSplit', () => {
  test('Black and White are milestones', () => {
    expect(isMilestoneSplit(BLACK_IDX)).toBe(true);
    expect(isMilestoneSplit(WHITE_IDX)).toBe(true);
  });

  test('primary colors are not milestones', () => {
    expect(isMilestoneSplit(CYAN_IDX)).toBe(false);
    expect(isMilestoneSplit(RED_IDX)).toBe(false);
  });
});

describe('SPLIT_MAP coverage', () => {
  test('all 8 colors have split entries', () => {
    for (let ci = 0; ci < NUM_COLORS; ci++) {
      expect(SPLIT_MAP[ci]).toBeDefined();
      expect(SPLIT_MAP[ci].length).toBeGreaterThanOrEqual(2);
    }
  });

  test('milestone entries have 3 outputs, regular have 2', () => {
    for (const [key, outputs] of Object.entries(SPLIT_MAP)) {
      const ci = Number(key);
      if (ci === BLACK_IDX || ci === WHITE_IDX) {
        expect(outputs).toHaveLength(3);
      } else {
        expect(outputs).toHaveLength(2);
      }
    }
  });
});

describe('split scoring', () => {
  test('milestone splits score 27', () => {
    expect(splitResult(BLACK, BLACK)!.score).toBe(27);
    expect(splitResult(WHITE, WHITE)!.score).toBe(27);
  });

  test('regular splits score 3', () => {
    expect(splitResult(CYAN, CYAN)!.score).toBe(3);
    expect(splitResult(RED, RED)!.score).toBe(3);
    expect(splitResult(MAGENTA, MAGENTA)!.score).toBe(3);
    expect(splitResult(GREEN, GREEN)!.score).toBe(3);
  });
});

describe('tileHex', () => {
  test('all 8 colors return a hex string', () => {
    for (let ci = 0; ci < NUM_COLORS; ci++) {
      const hex = tileHex(encodeTile(ci, 0));
      expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('empty cell returns #000000', () => {
    expect(tileHex(0)).toBe('#000000');
  });
});

describe('tileTextColor', () => {
  test('returns black for bright colors (White, Yellow)', () => {
    expect(tileTextColor(WHITE)).toBe('#000000');
    expect(tileTextColor(YELLOW)).toBe('#000000');
  });

  test('returns white for dark colors (Black, Blue)', () => {
    expect(tileTextColor(BLACK)).toBe('#FFFFFF');
    expect(tileTextColor(BLUE)).toBe('#FFFFFF');
  });
});

describe('tileLabel', () => {
  test('Black label is BK', () => {
    expect(tileLabel(BLACK)).toBe('BK');
  });

  test('White label is W', () => {
    expect(tileLabel(WHITE)).toBe('W');
  });

  test('Cyan label is C', () => {
    expect(tileLabel(CYAN)).toBe('C');
  });

  test('Red label is R', () => {
    expect(tileLabel(RED)).toBe('R');
  });

  test('empty cell returns null', () => {
    expect(tileLabel(0)).toBeNull();
  });
});

describe('getMergePartners', () => {
  test('empty cell has no partners', () => {
    expect(getMergePartners(0)).toEqual([]);
  });

  test('each tile merges with its own color', () => {
    expect(getMergePartners(BLACK)).toEqual([BLACK_IDX]);
    expect(getMergePartners(CYAN)).toEqual([CYAN_IDX]);
    expect(getMergePartners(RED)).toEqual([RED_IDX]);
  });
});

describe('tileDisplayDots', () => {
  test('empty cell has 0 display dots', () => {
    expect(tileDisplayDots(0)).toBe(0);
  });

  test('Black and White have 0 display dots', () => {
    expect(tileDisplayDots(BLACK)).toBe(0);
    expect(tileDisplayDots(WHITE)).toBe(0);
  });

  test('primary colors have 1 dot', () => {
    expect(tileDisplayDots(CYAN)).toBe(1);
    expect(tileDisplayDots(RED)).toBe(1);
    expect(tileDisplayDots(MAGENTA)).toBe(1);
  });
});

describe('deterministic consistency', () => {
  test('same split always produces the same result', () => {
    const r1 = splitResult(CYAN, CYAN);
    const r2 = splitResult(CYAN, CYAN);
    expect(r1).toEqual(r2);
  });
});
