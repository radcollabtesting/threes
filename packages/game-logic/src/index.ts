// ── Barrel export for @threes/game-logic ──

export { ThreesGame } from './game';
export { applyMove, isValidMove, hasAnyValidMove, directionDelta } from './move';
export { canMerge, mergeResult } from './merge';
export { selectSpawnPosition, getSpawnEdgeCells } from './spawn';
export { createNextTileGenerator } from './next-tile';
export { scoreTile, scoreGrid, scoreGridWithMultipliers } from './score';
export {
  createEmptyGrid,
  cloneGrid,
  getEmptyCells,
  isGridFull,
  getFixtureGrid,
  gridToString,
} from './board';
export { DEFAULT_CONFIG, resolveConfig } from './config';
export {
  catalystMixColorResult,
  getValidMixTargets,
  canCatalystMix,
  applyCatalystMix,
  hasValidCatalystMix,
  grayHasValidMix,
  getAdjacentPositions,
} from './catalyst-mix';

export {
  R1, R2, R3,
  G1, G2, G3,
  B1, B2, B3,
  MAX_TILE,
  BASE_TILE,
  BASE_TILES,
  tileColorFamily,
  tileShade,
  isColorTransition,
  tileTier,
  tileHex,
  tileTextColor,
  tileLabel,
  tileDisplayDots,
  canMerge as colorCanMerge,
  mergeResult as colorMergeResult,
  getMergePartners,
} from './color';

export type {
  Direction,
  CellValue,
  Grid,
  GameStatus,
  GameState,
  GameConfig,
  NextTileStrategy,
  MoveResult,
  MoveEvent,
  Position,
} from './types';
