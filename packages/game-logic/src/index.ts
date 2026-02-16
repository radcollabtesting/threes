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
  getAdjacentPositions,
} from './catalyst-mix';

export {
  encodeTile,
  tileColorIndex,
  tileDots,
  tileDisplayDots,
  tileTier,
  tileHex,
  tileTextColor,
  tileLabel,
  canMerge as colorCanMerge,
  mergeResult as colorMergeResult,
  getMergePartners,
  CYAN,
  MAGENTA,
  YELLOW,
  BASE_TILES,
  PRIMARY_TILES,
  SECONDARY_TILES,
  CYAN_IDX,
  MAGENTA_IDX,
  YELLOW_IDX,
  BLUE_IDX,
  RED_IDX,
  GREEN_IDX,
  ORANGE_IDX,
  VIOLET_IDX,
  CHARTREUSE_IDX,
  TEAL_IDX,
  TURQUOISE_IDX,
  INDIGO_IDX,
  GRAY_IDX,
  BROWN_IDX,
  NUM_COLORS,
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
