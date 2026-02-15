// ── Barrel export for @threes/game-logic ──

export { ThreesGame } from './game';
export { applyMove, isValidMove, hasAnyValidMove, directionDelta } from './move';
export { canMerge, mergeResult } from './merge';
export { selectSpawnPosition, getSpawnEdgeCells } from './spawn';
export { createNextTileGenerator } from './next-tile';
export { scoreTile, scoreGrid } from './score';
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
  decodeTile,
  tileRgb,
  tileTier,
  tileHex,
  tileTextColor,
  tileLabel,
  isSameColor,
  mixColors,
  CYAN,
  MAGENTA,
  YELLOW,
  BASE_TILES,
  type TileRgb,
  type TileData,
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
