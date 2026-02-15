import { ThreesGame } from '../game';
import {
  CYAN, MAGENTA, YELLOW, BASE_TILES,
  tileColorIndex, tileTier,
  BLUE_IDX, RED_IDX, GREEN_IDX,
} from '../color';

describe('ThreesGame', () => {
  describe('initialization', () => {
    test('default config creates a playing game with 3-5 start tiles', () => {
      const game = new ThreesGame();
      expect(game.status).toBe('playing');
      expect(game.moveCount).toBe(0);
      expect(game.grid.length).toBe(4);
      expect(game.grid[0].length).toBe(4);

      const count = game.grid.flat().filter(v => v > 0).length;
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(5);

      for (const v of game.grid.flat()) {
        if (v > 0) expect(BASE_TILES).toContain(v);
      }
    });

    test('fixture mode loads color reference board', () => {
      const game = new ThreesGame({ fixtureMode: true });
      expect(game.grid).toEqual([
        [CYAN, MAGENTA, 0, YELLOW],
        [CYAN, 0, 0, YELLOW],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      expect(game.nextTile).toBe(MAGENTA);
    });
  });

  describe('move mechanics', () => {
    test('valid move returns true and increments moveCount', () => {
      const game = new ThreesGame({ fixtureMode: true });
      const result = game.move('up');
      expect(result).toBe(true);
      expect(game.moveCount).toBe(1);
    });

    test('valid move spawns a tile and draws new nextTile', () => {
      const game = new ThreesGame({ fixtureMode: true });
      expect(game.nextTile).toBe(MAGENTA);

      game.move('up');

      // After merge, primaries exist on board so progressive may return primary
      expect(game.nextTile).toBeGreaterThan(0);
    });

    test('fixture: swipe up merges adjacent same-color tiles', () => {
      const game = new ThreesGame({ fixtureMode: true });
      // Board: [C, M, _, Y]
      //        [C, _, _, Y]
      // Swipe up: C(1,0) + C(0,0) → primary, Y(1,3) + Y(0,3) → primary
      game.move('up');
      const g = game.grid;
      // Col 0: two Cyans merged → a primary (tier 1)
      expect(tileTier(g[0][0])).toBe(1);
      const ci0 = tileColorIndex(g[0][0]);
      expect([BLUE_IDX, RED_IDX, GREEN_IDX]).toContain(ci0);
      // Col 3: two Yellows merged → a primary (tier 1)
      expect(tileTier(g[0][3])).toBe(1);
      const ci3 = tileColorIndex(g[0][3]);
      expect([BLUE_IDX, RED_IDX, GREEN_IDX]).toContain(ci3);
      // Magenta stays
      expect(g[0][1]).toBe(MAGENTA);
    });
  });

  describe('invalid move — no side effects', () => {
    test('invalid move returns false, no spawn, no moveCount change', () => {
      const dirs = ['left', 'right', 'up', 'down'] as const;
      for (const dir of dirs) {
        const game = new ThreesGame({ seed: 999 });
        const gBefore = JSON.stringify(game.grid);
        const nBefore = game.nextTile;
        const result = game.move(dir);
        if (!result) {
          expect(JSON.stringify(game.grid)).toBe(gBefore);
          expect(game.nextTile).toBe(nBefore);
          expect(game.moveCount).toBe(0);
        }
      }
    });
  });

  describe('scoring', () => {
    test('scoring is enabled by default and produces non-zero scores', () => {
      const game = new ThreesGame();
      expect(game.score).toBeGreaterThan(0);
      const count = game.grid.flat().filter(v => v > 0).length;
      // All base tiles are tier 0 → 3 pts each
      expect(game.score).toBe(count * 3);
    });
  });

  describe('deterministic seed reproducibility', () => {
    test('same seed + moves => identical game states', () => {
      const seed = 12345;
      const game1 = new ThreesGame({ seed });
      const game2 = new ThreesGame({ seed });

      expect(game1.grid).toEqual(game2.grid);
      expect(game1.nextTile).toBe(game2.nextTile);

      const moves = ['up', 'left', 'right', 'down', 'left'] as const;
      for (const dir of moves) {
        game1.move(dir);
        game2.move(dir);
        expect(game1.grid).toEqual(game2.grid);
        expect(game1.nextTile).toBe(game2.nextTile);
      }
    });

    test('different seeds => different games', () => {
      const game1 = new ThreesGame({ seed: 1 });
      const game2 = new ThreesGame({ seed: 99999 });
      const same =
        JSON.stringify(game1.grid) === JSON.stringify(game2.grid) &&
        game1.nextTile === game2.nextTile;
      expect(same).toBe(false);
    });
  });

  describe('restart', () => {
    test('restart resets game state with a fresh random seed', () => {
      const game = new ThreesGame({ seed: 42 });

      game.move('up');
      game.move('left');

      game.restart();

      expect(game.moveCount).toBe(0);
      expect(game.status).toBe('playing');
      expect(game.score).toBeGreaterThanOrEqual(0);
      // Board should have between 2 and 5 tiles
      const tileCount = game.grid.flat().filter(c => c > 0).length;
      expect(tileCount).toBeGreaterThanOrEqual(2);
      expect(tileCount).toBeLessThanOrEqual(5);
    });
  });

  describe('score never decreases', () => {
    test('score is monotonically non-decreasing over moves', () => {
      const game = new ThreesGame({ seed: 42 });
      let prevScore = game.score;
      const dirs = ['up', 'left', 'down', 'right'] as const;
      for (let i = 0; i < 40; i++) {
        game.move(dirs[i % dirs.length]);
        expect(game.score).toBeGreaterThanOrEqual(prevScore);
        prevScore = game.score;
      }
    });
  });

  describe('progressive spawning', () => {
    test('default strategy is progressive', () => {
      const game = new ThreesGame({ seed: 1 });
      // With only base tiles on board, nextTile should be a base tile
      expect(BASE_TILES).toContain(game.nextTile);
    });

    test('initial nextTile is always a base tile (no primaries on board yet)', () => {
      // Before any merges, only base tiles should spawn
      for (let s = 1; s <= 5; s++) {
        const game = new ThreesGame({ seed: s });
        expect(BASE_TILES).toContain(game.nextTile);
      }
    });

    test('bag strategy still works when explicitly set', () => {
      const game = new ThreesGame({ seed: 42, nextTileStrategy: 'bag' });
      expect(BASE_TILES).toContain(game.nextTile);
      game.move('up');
      expect(BASE_TILES).toContain(game.nextTile);
    });
  });
});
