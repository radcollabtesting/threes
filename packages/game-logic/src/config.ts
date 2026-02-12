import type { GameConfig } from './types';

/**
 * Default game configuration.
 * Every value is a clearly labelled default; override any field by
 * passing a partial config to ThreesGame constructor.
 */
export const DEFAULT_CONFIG: GameConfig = {
  gridSize: 4,
  startTilesCount: 0, // 0 = random 3–5 (handled by game.ts)
  spawnOnlyOnChangedLine: true,
  nextTileStrategy: 'progressive', // unlocks higher values as you merge
  scoringEnabled: false, // design has no score UI
  seed: 42,
  fixtureMode: false,
  accessibilityDotEnabled: false,
};

/** Merges user overrides onto the defaults */
export function resolveConfig(overrides?: Partial<GameConfig>): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}
