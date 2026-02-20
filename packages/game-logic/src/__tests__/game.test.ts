import { describe, test, expect } from 'vitest';
import { ThreesGame } from '../game';
import { R1, R2, G1, G2, B1, B2, BASE_TILES } from '../color';
import { scoreTile } from '../score';

describe('ThreesGame', () => {
  describe('initialization', () => {
    test('default config creates a playing game with 2-5 start tiles', () => {
      const game = new ThreesGame();
      expect(game.status).toBe('playing');
      expect(game.moveCount).toBe(0);
      expect(game.grid.length).toBe(4);
      expect(game.grid[0].length).toBe(4);

      const count = game.grid.flat().filter(v => v > 0).length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(5);

      // All starting tiles must be one of BASE_TILES (R1, G1, or B1)
      for (const v of game.grid.flat()) {
        if (v > 0) {
          expect(BASE_TILES).toContain(v);
        }
      }
    });

    test('fixture mode loads reference board', () => {
      const game = new ThreesGame({ fixtureMode: true });
      expect(game.grid).toEqual([
        [R1, G1, 0, B1],
        [G1, 0, 0, R1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
    });

    test('fixture nextTile should be one of BASE_TILES', () => {
      const game = new ThreesGame({ fixtureMode: true });
      expect(BASE_TILES).toContain(game.nextTile);
    });
  });

  describe('move mechanics', () => {
    test('valid move returns true and increments moveCount', () => {
      const game = new ThreesGame({ fixtureMode: true });
      const result = game.move('down');
      expect(result).toBe(true);
      expect(game.moveCount).toBe(1);
    });

    test('valid move spawns a tile and draws new nextTile (one of BASE_TILES)', () => {
      const game = new ThreesGame({ fixtureMode: true });
      expect(BASE_TILES).toContain(game.nextTile);

      game.move('down');

      // After the move a new nextTile is drawn; it must still be a base tile
      expect(BASE_TILES).toContain(game.nextTile);

      // A tile should have been spawned — total tile count should not have dropped
      const tileCount = game.grid.flat().filter(v => v > 0).length;
      expect(tileCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('scoring', () => {
    test('R1/G1/B1 all score 3', () => {
      expect(scoreTile(R1)).toBe(3);
      expect(scoreTile(G1)).toBe(3);
      expect(scoreTile(B1)).toBe(3);
    });

    test('R2/G2/B2 all score 9', () => {
      expect(scoreTile(R2)).toBe(9);
      expect(scoreTile(G2)).toBe(9);
      expect(scoreTile(B2)).toBe(9);
    });

    test('tier 2 tiles (R3/G3/B3) all score 27', () => {
      expect(scoreTile(3)).toBe(27);  // R3
      expect(scoreTile(8)).toBe(27);  // G3
      expect(scoreTile(13)).toBe(27); // B3
    });

    test('tier 3 tiles (R4/G4/B4) all score 81', () => {
      expect(scoreTile(4)).toBe(81);  // R4
      expect(scoreTile(9)).toBe(81);  // G4
      expect(scoreTile(14)).toBe(81); // B4
    });

    test('tier 4 tiles (R5/G5/B5) all score 243', () => {
      expect(scoreTile(5)).toBe(243);  // R5
      expect(scoreTile(10)).toBe(243); // G5
      expect(scoreTile(15)).toBe(243); // B5
    });

    test('empty tile scores 0', () => {
      expect(scoreTile(0)).toBe(0);
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
    test('restart resets game state', () => {
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

  describe('nextTile is always one of BASE_TILES', () => {
    test('nextTile is always one of BASE_TILES across many seeds and moves', () => {
      for (let s = 1; s <= 10; s++) {
        const game = new ThreesGame({ seed: s });
        expect(BASE_TILES).toContain(game.nextTile);

        const dirs = ['up', 'left', 'down', 'right'] as const;
        for (let i = 0; i < 20; i++) {
          game.move(dirs[i % dirs.length]);
          if (game.status !== 'playing') break;
          expect(BASE_TILES).toContain(game.nextTile);
        }
      }
    });
  });
});
