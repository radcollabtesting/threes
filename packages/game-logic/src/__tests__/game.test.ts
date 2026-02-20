import { describe, test, expect } from 'vitest';
import { ThreesGame } from '../game';
import { R1, R2, BASE_TILES } from '../color';
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

      // All starting tiles should be R1 (the only spawnable tile)
      for (const v of game.grid.flat()) {
        if (v > 0) expect(v).toBe(R1);
      }
    });

    test('fixture mode loads reference board', () => {
      const game = new ThreesGame({ fixtureMode: true });
      expect(game.grid).toEqual([
        [R1, R1, 0, R1],
        [R1, 0, 0, R1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      expect(game.nextTile).toBe(R1);
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
      expect(game.nextTile).toBe(R1);

      game.move('up');

      // nextTile is always R1 in the simplified system
      expect(game.nextTile).toBe(R1);
    });

    test('fixture: swipe up merges adjacent R1 pairs into R2', () => {
      const game = new ThreesGame({ fixtureMode: true });
      // Board: [R1, R1, _,  R1]
      //        [R1, _,  _,  R1]
      // Swipe up: R1(1,0) + R1(0,0) → R2, R1(1,3) + R1(0,3) → R2
      game.move('up');
      const g = game.grid;
      // Col 0: two R1s merged → R2
      expect(g[0][0]).toBe(R2);
      // Col 3: two R1s merged → R2
      expect(g[0][3]).toBe(R2);
      // R1 at (0,1) stays (nothing to merge with above)
      expect(g[0][1]).toBe(R1);
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
      // All starting tiles are R1 → score = 3^(0+1) = 3 each
      expect(game.score).toBe(count * scoreTile(R1));
    });

    test('R1 scores 3, R2 scores 9, R3 scores 27', () => {
      expect(scoreTile(R1)).toBe(3);
      expect(scoreTile(R2)).toBe(9);
      expect(scoreTile(3)).toBe(27);  // R3
      expect(scoreTile(4)).toBe(81);  // G1
      expect(scoreTile(5)).toBe(243); // G2
      expect(scoreTile(6)).toBe(729); // G3
      expect(scoreTile(7)).toBe(2187);  // B1
      expect(scoreTile(8)).toBe(6561);  // B2
      expect(scoreTile(9)).toBe(19683); // B3
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

  describe('spawning', () => {
    test('only R1 tiles spawn (all strategies produce R1)', () => {
      const game = new ThreesGame({ seed: 1 });
      expect(game.nextTile).toBe(R1);
    });

    test('nextTile is always R1 regardless of board state', () => {
      for (let s = 1; s <= 5; s++) {
        const game = new ThreesGame({ seed: s });
        expect(game.nextTile).toBe(R1);
      }
    });

    test('bag strategy still works when explicitly set (always R1)', () => {
      const game = new ThreesGame({ seed: 42, nextTileStrategy: 'bag' });
      expect(game.nextTile).toBe(R1);
      game.move('up');
      expect(game.nextTile).toBe(R1);
    });
  });
});
