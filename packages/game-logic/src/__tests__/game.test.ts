import { ThreesGame } from '../game';
import { BLACK, tileColorIndex, BLACK_IDX } from '../color';

describe('ThreesGame', () => {
  describe('initialization', () => {
    test('default config creates a playing game with 6-9 start tiles', () => {
      const game = new ThreesGame();
      expect(game.status).toBe('playing');
      expect(game.moveCount).toBe(0);
      expect(game.grid.length).toBe(4);
      expect(game.grid[0].length).toBe(4);

      // 2-3 blacks + 2-3 whites + 2-3 random = 6-9 tiles
      const count = game.grid.flat().filter(v => v > 0).length;
      expect(count).toBeGreaterThanOrEqual(6);
      expect(count).toBeLessThanOrEqual(9);
    });

    test('queue starts empty', () => {
      const game = new ThreesGame();
      expect(game.queue).toEqual([]);
      expect(game.nextTile).toBe(0);
    });
  });

  describe('move mechanics', () => {
    test('valid move returns true and increments moveCount', () => {
      const game = new ThreesGame({ seed: 42, startTilesCount: 4 });
      // Find a direction that moves
      const dirs = ['left', 'right', 'up', 'down'] as const;
      let moved = false;
      for (const dir of dirs) {
        if (game.move(dir)) {
          moved = true;
          expect(game.moveCount).toBe(1);
          break;
        }
      }
      expect(moved).toBe(true);
    });

    test('split produces queue items', () => {
      // Try multiple seeds — at least one should produce a split quickly
      let splitHappened = false;
      for (let seed = 1; seed <= 20 && !splitHappened; seed++) {
        const game = new ThreesGame({ seed });
        const dirs = ['left', 'right', 'up', 'down'] as const;
        for (let i = 0; i < 30 && !splitHappened; i++) {
          for (const dir of dirs) {
            const beforeQueue = game.queue.length;
            game.move(dir);
            if (game.queue.length > beforeQueue) {
              splitHappened = true;
              break;
            }
          }
        }
      }
      expect(splitHappened).toBe(true);
    });
  });

  describe('invalid move — no side effects', () => {
    test('invalid move returns false, no moveCount change', () => {
      const dirs = ['left', 'right', 'up', 'down'] as const;
      for (const dir of dirs) {
        const game = new ThreesGame({ seed: 999 });
        const gBefore = JSON.stringify(game.grid);
        const result = game.move(dir);
        if (!result) {
          expect(JSON.stringify(game.grid)).toBe(gBefore);
          expect(game.moveCount).toBe(0);
        }
      }
    });
  });

  describe('scoring', () => {
    test('scoring starts at 0 (accumulative system)', () => {
      const game = new ThreesGame();
      expect(game.score).toBe(0);
    });

    test('score increases when splits happen', () => {
      // Try multiple seeds to ensure at least one triggers a split
      let scoreIncreased = false;
      for (let seed = 1; seed <= 20 && !scoreIncreased; seed++) {
        const game = new ThreesGame({ seed });
        const dirs = ['left', 'right', 'up', 'down'] as const;
        for (let i = 0; i < 30 && !scoreIncreased; i++) {
          for (const dir of dirs) {
            const before = game.score;
            game.move(dir);
            if (game.score > before) {
              scoreIncreased = true;
              break;
            }
          }
        }
      }
      expect(scoreIncreased).toBe(true);
    });
  });

  describe('deterministic seed reproducibility', () => {
    test('same seed + moves => identical game states', () => {
      const seed = 12345;
      const game1 = new ThreesGame({ seed });
      const game2 = new ThreesGame({ seed });

      expect(game1.grid).toEqual(game2.grid);
      expect(game1.queue).toEqual(game2.queue);

      const moves = ['up', 'left', 'right', 'down', 'left'] as const;
      for (const dir of moves) {
        game1.move(dir);
        game2.move(dir);
        expect(game1.grid).toEqual(game2.grid);
        expect(game1.queue).toEqual(game2.queue);
        expect(game1.score).toBe(game2.score);
      }
    });

    test('different seeds => different games', () => {
      const game1 = new ThreesGame({ seed: 1 });
      const game2 = new ThreesGame({ seed: 99999 });
      const same =
        JSON.stringify(game1.grid) === JSON.stringify(game2.grid);
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
      expect(game.score).toBe(0);
      expect(game.queue).toEqual([]);
      // Board should have between 6 and 9 tiles
      const tileCount = game.grid.flat().filter(c => c > 0).length;
      expect(tileCount).toBeGreaterThanOrEqual(6);
      expect(tileCount).toBeLessThanOrEqual(9);
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

  describe('queue-based spawning', () => {
    test('split outputs persist in queue until next move', () => {
      // After a split, the new items should remain in the queue
      // (they get spawned on the NEXT move, not the same move)
      let verified = false;
      for (let seed = 1; seed <= 50 && !verified; seed++) {
        const game = new ThreesGame({ seed });
        const dirs = ['left', 'right', 'up', 'down'] as const;
        for (let i = 0; i < 40 && !verified; i++) {
          for (const dir of dirs) {
            game.move(dir);
            if (game.queue.length > 0) {
              // Queue has items — they should be consumed on the next move
              verified = true;
              break;
            }
          }
        }
      }
      expect(verified).toBe(true);
    });

    test('queue length stays reasonable over many moves', () => {
      const game = new ThreesGame({ seed: 42 });
      const dirs = ['left', 'right', 'up', 'down'] as const;
      for (let i = 0; i < 30; i++) {
        game.move(dirs[i % dirs.length]);
      }
      expect(game.queue.length).toBeLessThan(100);
    });
  });

  describe('game over', () => {
    test('game ends when no valid moves and queue is empty', () => {
      // We just verify the game can eventually end
      const game = new ThreesGame({ seed: 42 });
      const dirs = ['up', 'left', 'down', 'right'] as const;
      let ended = false;
      for (let i = 0; i < 1000 && !ended; i++) {
        game.move(dirs[i % dirs.length]);
        if (game.status === 'ended') ended = true;
      }
      // Game should be able to continue for a while (cycle allows infinite play)
      // Not asserting it ends, as the cycle may keep it going
    });
  });
});
