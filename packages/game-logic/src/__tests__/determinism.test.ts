import { ThreesGame } from '../game';
import { createRng } from '@threes/rng';

describe('deterministic RNG', () => {
  test('createRng produces identical sequence for same seed', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);

    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  test('createRng produces different sequences for different seeds', () => {
    const rng1 = createRng(1);
    const rng2 = createRng(2);

    // At least one of the first 10 values should differ
    let allSame = true;
    for (let i = 0; i < 10; i++) {
      if (rng1() !== rng2()) allSame = false;
    }
    expect(allSame).toBe(false);
  });

  test('full game replay produces identical state sequence', () => {
    const seed = 777;
    const directions = [
      'left', 'up', 'right', 'down', 'left',
      'left', 'up', 'right', 'down', 'down',
    ] as const;

    const game1 = new ThreesGame({ seed });
    const game2 = new ThreesGame({ seed });

    const states1: string[] = [JSON.stringify(game1.getState())];
    const states2: string[] = [JSON.stringify(game2.getState())];

    for (const dir of directions) {
      game1.move(dir);
      game2.move(dir);
      states1.push(JSON.stringify(game1.getState()));
      states2.push(JSON.stringify(game2.getState()));
    }

    expect(states1).toEqual(states2);
  });

  test('bag generator is deterministic', () => {
    // Two games with bag strategy and same seed should draw identical tiles
    const game1 = new ThreesGame({ seed: 123, nextTileStrategy: 'bag' });
    const game2 = new ThreesGame({ seed: 123, nextTileStrategy: 'bag' });

    expect(game1.nextTile).toBe(game2.nextTile);

    // Play several moves and verify tiles match
    const dirs = ['up', 'left', 'down', 'right', 'up'] as const;
    for (const dir of dirs) {
      game1.move(dir);
      game2.move(dir);
      expect(game1.nextTile).toBe(game2.nextTile);
    }
  });
});
