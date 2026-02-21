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
  LIGHT_GRAY,
  DARK_GRAY,
  WHITE,
  CYAN,
  MAGENTA,
  YELLOW,
  LIGHT_CYAN,
  LIGHT_MAGENTA,
  LIGHT_YELLOW,
  RED,
  GREEN,
  BLUE,
  DARK_RED,
  DARK_GREEN,
  DARK_BLUE,
  BASE_TILES,
  PRIMARY_TILES,
  SECONDARY_TILES,
  BLACK_IDX,
  LIGHT_GRAY_IDX,
  DARK_GRAY_IDX,
  WHITE_IDX,
  CYAN_IDX,
  MAGENTA_IDX,
  YELLOW_IDX,
  LIGHT_CYAN_IDX,
  LIGHT_MAGENTA_IDX,
  LIGHT_YELLOW_IDX,
  RED_IDX,
  GREEN_IDX,
  BLUE_IDX,
  DARK_RED_IDX,
  DARK_GREEN_IDX,
  DARK_BLUE_IDX,
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

  test('all 16 colors round-trip', () => {
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

  test('SECONDARY_TILES has 6 elements', () => {
    expect(SECONDARY_TILES).toHaveLength(6);
    for (const t of SECONDARY_TILES) {
      expect(tileTier(t)).toBe(2);
    }
  });
});

describe('tileTier', () => {
  test('transition colors are tier 0', () => {
    expect(tileTier(BLACK)).toBe(0);
    expect(tileTier(WHITE)).toBe(0);
    expect(tileTier(LIGHT_GRAY)).toBe(0);
    expect(tileTier(DARK_GRAY)).toBe(0);
  });

  test('primary colors are tier 1', () => {
    expect(tileTier(CYAN)).toBe(1);
    expect(tileTier(MAGENTA)).toBe(1);
    expect(tileTier(YELLOW)).toBe(1);
    expect(tileTier(RED)).toBe(1);
    expect(tileTier(GREEN)).toBe(1);
    expect(tileTier(BLUE)).toBe(1);
  });

  test('variant colors are tier 2', () => {
    expect(tileTier(LIGHT_CYAN)).toBe(2);
    expect(tileTier(LIGHT_MAGENTA)).toBe(2);
    expect(tileTier(LIGHT_YELLOW)).toBe(2);
    expect(tileTier(DARK_RED)).toBe(2);
    expect(tileTier(DARK_GREEN)).toBe(2);
    expect(tileTier(DARK_BLUE)).toBe(2);
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
  test('Black → 2 Light Gray (regular)', () => {
    const result = splitResult(BLACK, BLACK)!;
    expect(result.isMilestone).toBe(false);
    expect(result.outputs).toHaveLength(2);
    expect(tileColorIndex(result.outputs[0])).toBe(LIGHT_GRAY_IDX);
    expect(tileColorIndex(result.outputs[1])).toBe(LIGHT_GRAY_IDX);
  });

  test('Light Gray → C,M,Y (milestone)', () => {
    const result = splitResult(LIGHT_GRAY, LIGHT_GRAY)!;
    expect(result.isMilestone).toBe(true);
    expect(result.outputs).toHaveLength(3);
    const outputIndices = result.outputs.map(tileColorIndex).sort();
    expect(outputIndices).toEqual([CYAN_IDX, MAGENTA_IDX, YELLOW_IDX].sort());
  });

  test('Cyan → 2 Light Cyan (regular)', () => {
    const result = splitResult(CYAN, CYAN)!;
    expect(result.isMilestone).toBe(false);
    expect(result.outputs).toHaveLength(2);
    expect(tileColorIndex(result.outputs[0])).toBe(LIGHT_CYAN_IDX);
  });

  test('Light Cyan → 2 White', () => {
    const result = splitResult(LIGHT_CYAN, LIGHT_CYAN)!;
    expect(result.outputs).toHaveLength(2);
    expect(tileColorIndex(result.outputs[0])).toBe(WHITE_IDX);
  });

  test('White → 2 Dark Gray', () => {
    const result = splitResult(WHITE, WHITE)!;
    expect(result.isMilestone).toBe(false);
    expect(result.outputs).toHaveLength(2);
    expect(tileColorIndex(result.outputs[0])).toBe(DARK_GRAY_IDX);
  });

  test('Dark Gray → R,G,B (milestone)', () => {
    const result = splitResult(DARK_GRAY, DARK_GRAY)!;
    expect(result.isMilestone).toBe(true);
    expect(result.outputs).toHaveLength(3);
    const outputIndices = result.outputs.map(tileColorIndex).sort();
    expect(outputIndices).toEqual([RED_IDX, GREEN_IDX, BLUE_IDX].sort());
  });

  test('Red → 2 Dark Red', () => {
    const result = splitResult(RED, RED)!;
    expect(result.outputs).toHaveLength(2);
    expect(tileColorIndex(result.outputs[0])).toBe(DARK_RED_IDX);
  });

  test('Dark Red → 2 Black (cycle back)', () => {
    const result = splitResult(DARK_RED, DARK_RED)!;
    expect(result.outputs).toHaveLength(2);
    expect(tileColorIndex(result.outputs[0])).toBe(BLACK_IDX);
  });

  test('Dark Green → 2 Black (cycle back)', () => {
    const result = splitResult(DARK_GREEN, DARK_GREEN)!;
    expect(tileColorIndex(result.outputs[0])).toBe(BLACK_IDX);
  });

  test('Dark Blue → 2 Black (cycle back)', () => {
    const result = splitResult(DARK_BLUE, DARK_BLUE)!;
    expect(tileColorIndex(result.outputs[0])).toBe(BLACK_IDX);
  });
});

describe('mergeResult — legacy compatibility', () => {
  test('regular split returns 0 (merge point empties)', () => {
    expect(mergeResult(BLACK, BLACK)).toBe(0);
    expect(mergeResult(CYAN, CYAN)).toBe(0);
    expect(mergeResult(DARK_RED, DARK_RED)).toBe(0);
  });

  test('milestone split returns first output (on merge point)', () => {
    const lgResult = mergeResult(LIGHT_GRAY, LIGHT_GRAY);
    expect(lgResult).toBeGreaterThan(0);
    const outputIndices = [CYAN_IDX, MAGENTA_IDX, YELLOW_IDX];
    expect(outputIndices).toContain(tileColorIndex(lgResult));

    const dgResult = mergeResult(DARK_GRAY, DARK_GRAY);
    expect(dgResult).toBeGreaterThan(0);
    const rgbIndices = [RED_IDX, GREEN_IDX, BLUE_IDX];
    expect(rgbIndices).toContain(tileColorIndex(dgResult));
  });
});

describe('isMilestoneSplit', () => {
  test('Light Gray and Dark Gray are milestones', () => {
    expect(isMilestoneSplit(LIGHT_GRAY_IDX)).toBe(true);
    expect(isMilestoneSplit(DARK_GRAY_IDX)).toBe(true);
  });

  test('all other colors are not milestones', () => {
    expect(isMilestoneSplit(BLACK_IDX)).toBe(false);
    expect(isMilestoneSplit(WHITE_IDX)).toBe(false);
    expect(isMilestoneSplit(CYAN_IDX)).toBe(false);
    expect(isMilestoneSplit(RED_IDX)).toBe(false);
  });
});

describe('SPLIT_MAP coverage', () => {
  test('all 16 colors have split entries', () => {
    for (let ci = 0; ci < NUM_COLORS; ci++) {
      expect(SPLIT_MAP[ci]).toBeDefined();
      expect(SPLIT_MAP[ci].length).toBeGreaterThanOrEqual(2);
    }
  });

  test('milestone entries have 3 outputs, regular have 2', () => {
    for (const [key, outputs] of Object.entries(SPLIT_MAP)) {
      const ci = Number(key);
      if (ci === LIGHT_GRAY_IDX || ci === DARK_GRAY_IDX) {
        expect(outputs).toHaveLength(3);
      } else {
        expect(outputs).toHaveLength(2);
      }
    }
  });
});

describe('split scoring', () => {
  test('milestone splits score 81', () => {
    expect(splitResult(LIGHT_GRAY, LIGHT_GRAY)!.score).toBe(81);
    expect(splitResult(DARK_GRAY, DARK_GRAY)!.score).toBe(81);
  });

  test('primary splits score 27', () => {
    expect(splitResult(CYAN, CYAN)!.score).toBe(27);
    expect(splitResult(RED, RED)!.score).toBe(27);
  });

  test('variant splits score 9', () => {
    expect(splitResult(LIGHT_CYAN, LIGHT_CYAN)!.score).toBe(9);
    expect(splitResult(DARK_RED, DARK_RED)!.score).toBe(9);
  });

  test('transition splits score 3', () => {
    expect(splitResult(BLACK, BLACK)!.score).toBe(3);
    expect(splitResult(WHITE, WHITE)!.score).toBe(3);
  });
});

describe('tileHex', () => {
  test('all 16 colors return a hex string', () => {
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

  test('returns white for dark colors (Black, Dark Blue)', () => {
    expect(tileTextColor(BLACK)).toBe('#FFFFFF');
    expect(tileTextColor(DARK_BLUE)).toBe('#FFFFFF');
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

  test('Dark Red label is DR', () => {
    expect(tileLabel(DARK_RED)).toBe('DR');
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

  test('milestone colors (grays) have 1 dot', () => {
    expect(tileDisplayDots(LIGHT_GRAY)).toBe(1);
    expect(tileDisplayDots(DARK_GRAY)).toBe(1);
  });

  test('primary colors have 2 dots', () => {
    expect(tileDisplayDots(CYAN)).toBe(2);
    expect(tileDisplayDots(RED)).toBe(2);
  });

  test('variant colors have 1 dot', () => {
    expect(tileDisplayDots(LIGHT_CYAN)).toBe(1);
    expect(tileDisplayDots(DARK_RED)).toBe(1);
  });
});

describe('deterministic consistency', () => {
  test('same split always produces the same result', () => {
    const r1 = splitResult(CYAN, CYAN);
    const r2 = splitResult(CYAN, CYAN);
    expect(r1).toEqual(r2);
  });
});
