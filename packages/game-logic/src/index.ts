// ── Barrel export for @threes/game-logic ──

export { ThreesGame } from './game';
export { applyMove, isValidMove, hasAnyValidMove, directionDelta } from './move';
export { canMerge, mergeResult, splitResult } from './merge';
export { selectSpawnPosition, getSpawnEdgeCells, spawnFromQueue } from './spawn';
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
  splitResult as colorSplitResult,
  getSplitOutputs,
  isMilestoneSplit,
  getMergePartners,
  SPLIT_MAP,
  BLACK,
  LIGHT_GRAY,
  DARK_GRAY,
  WHITE,
  CYAN,
  MAGENTA,
  YELLOW,
  LIGHT_CYAN,
  LIGHT_MAGENTA,
  LIGHT_YELLOW,
  RED,
  GREEN,
  BLUE,
  DARK_RED,
  DARK_GREEN,
  DARK_BLUE,
  BASE_TILES,
  START_TILES,
  PRIMARY_TILES,
  SECONDARY_TILES,
  BLACK_IDX,
  LIGHT_GRAY_IDX,
  DARK_GRAY_IDX,
  WHITE_IDX,
  CYAN_IDX,
  MAGENTA_IDX,
  YELLOW_IDX,
  LIGHT_CYAN_IDX,
  LIGHT_MAGENTA_IDX,
  LIGHT_YELLOW_IDX,
  RED_IDX,
  GREEN_IDX,
  BLUE_IDX,
  DARK_RED_IDX,
  DARK_GREEN_IDX,
  DARK_BLUE_IDX,
  NUM_COLORS,
} from './color';

export type { SplitResult } from './color';

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
