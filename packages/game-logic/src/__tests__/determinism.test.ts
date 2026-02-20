import { describe, test, expect } from 'vitest';
import { ThreesGame } from '../game';
import { createRng } from '@threes/rng';
import { R1 } from '../color';

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

  test('nextTile is always R1 and deterministic across replays', () => {
    const game1 = new ThreesGame({ seed: 123 });
    const game2 = new ThreesGame({ seed: 123 });

    expect(game1.nextTile).toBe(R1);
    expect(game2.nextTile).toBe(R1);

    const dirs = ['up', 'left', 'down', 'right', 'up'] as const;
    for (const dir of dirs) {
      game1.move(dir);
      game2.move(dir);
      expect(game1.nextTile).toBe(game2.nextTile);
      expect(game1.nextTile).toBe(R1);
    }
  });

  test('bag strategy is deterministic (always R1)', () => {
    const game1 = new ThreesGame({ seed: 123, nextTileStrategy: 'bag' });
    const game2 = new ThreesGame({ seed: 123, nextTileStrategy: 'bag' });

    expect(game1.nextTile).toBe(game2.nextTile);

    const dirs = ['up', 'left', 'down', 'right', 'up'] as const;
    for (const dir of dirs) {
      game1.move(dir);
      game2.move(dir);
      expect(game1.nextTile).toBe(game2.nextTile);
    }
  });
});
