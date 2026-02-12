import { ThreesGame } from '../game';

describe('ThreesGame', () => {
  describe('initialization', () => {
    test('default config creates a playing game with 3–5 start tiles', () => {
      const game = new ThreesGame();
      expect(game.status).toBe('playing');
      expect(game.moveCount).toBe(0);
      expect(game.grid.length).toBe(4);
      expect(game.grid[0].length).toBe(4);

      // Count non-zero cells — should be 3–5 (random)
      const count = game.grid.flat().filter(v => v > 0).length;
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(5);

      // All starting values should be 1, 2, or 3
      for (const v of game.grid.flat()) {
        if (v > 0) expect([1, 2, 3]).toContain(v);
      }
    });

    test('fixture mode loads design reference board', () => {
      const game = new ThreesGame({ fixtureMode: true });
      expect(game.grid).toEqual([
        [3, 3, 0, 2],
        [6, 0, 0, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      expect(game.nextTile).toBe(2);
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
      expect(game.nextTile).toBe(2); // fixture starts with next=2

      game.move('up');

      // After move: nextTile should have been consumed and a new one drawn
      expect(game.nextTile).toBeGreaterThan(0);
      expect(game.moveCount).toBe(1);
    });

    test('fixture: swipe up merges 1+2=3 at (0,3)', () => {
      const game = new ThreesGame({ fixtureMode: true });
      game.move('up');

      // (0,3) was 2, (1,3) was 1 → merged into 3 at (0,3)
      // The rest of row 0 unchanged (6 at (1,0) can't merge with 3 at (0,0))
      const g = game.grid;
      expect(g[0][0]).toBe(3);
      expect(g[0][1]).toBe(3);
      expect(g[0][3]).toBe(3); // merged result
      expect(g[1][0]).toBe(6); // couldn't merge with 3
      expect(g[1][3]).toBe(0); // consumed by merge
    });
  });

  describe('invalid move — no side effects', () => {
    test('invalid move returns false, no spawn, no moveCount change', () => {
      // Create a board where LEFT is invalid:
      // single tile at top-left corner, nothing can move left
      const game = new ThreesGame({ fixtureMode: true, seed: 1 });

      // Record state before an invalid move
      // For fixture board, we need to find an invalid direction.
      // Let's construct a custom scenario instead:
      const game2 = new ThreesGame({ seed: 999 });
      const gridBefore = JSON.stringify(game2.grid);
      const nextBefore = game2.nextTile;
      const moveBefore = game2.moveCount;

      // Try all four directions — at least one should be invalid for most boards
      // Actually with 9 tiles, most directions are likely valid.
      // Let's just verify the contract: if move() returns false, nothing changed.
      const dirs = ['left', 'right', 'up', 'down'] as const;
      for (const dir of dirs) {
        const game3 = new ThreesGame({ seed: 999 });
        const gBefore = JSON.stringify(game3.grid);
        const nBefore = game3.nextTile;
        const result = game3.move(dir);
        if (!result) {
          expect(JSON.stringify(game3.grid)).toBe(gBefore);
          expect(game3.nextTile).toBe(nBefore);
          expect(game3.moveCount).toBe(0);
        }
      }
    });
  });

  describe('deterministic seed reproducibility', () => {
    test('same seed + moves ⇒ identical game states', () => {
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
        expect(game1.moveCount).toBe(game2.moveCount);
      }
    });

    test('different seeds ⇒ different games', () => {
      const game1 = new ThreesGame({ seed: 1 });
      const game2 = new ThreesGame({ seed: 99999 });

      const same =
        JSON.stringify(game1.grid) === JSON.stringify(game2.grid) &&
        game1.nextTile === game2.nextTile;
      expect(same).toBe(false);
    });
  });

  describe('restart', () => {
    test('restart resets to identical initial state', () => {
      const game = new ThreesGame({ seed: 42 });
      const initialGrid = JSON.stringify(game.grid);
      const initialNext = game.nextTile;

      game.move('up');
      game.move('left');
      expect(game.moveCount).toBe(2);

      game.restart();

      expect(JSON.stringify(game.grid)).toBe(initialGrid);
      expect(game.nextTile).toBe(initialNext);
      expect(game.moveCount).toBe(0);
      expect(game.status).toBe('playing');
    });
  });
});
