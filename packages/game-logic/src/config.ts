import type { GameConfig } from './types';

/**
 * Default game configuration.
 */
export const DEFAULT_CONFIG: GameConfig = {
  gridSize: 4,
  startTilesCount: 0, // 0 = random 4–6 Black tiles
  spawnOnlyOnChangedLine: true,
  nextTileStrategy: 'progressive',
  scoringEnabled: true,
  seed: 42,
  fixtureMode: false,
  accessibilityDotEnabled: false,
  queueSpawnCount: 2, // spawn up to 2 tiles per move from queue
};

/** Merges user overrides onto the defaults */
export function resolveConfig(overrides?: Partial<GameConfig>): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}
