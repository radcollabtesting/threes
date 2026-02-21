/**
 * Core type definitions for the Threes game engine.
 */

/** Swipe / move direction */
export type Direction = 'left' | 'right' | 'up' | 'down';

/** Cell value: 0 = empty, positive integers for tile values (1, 2, 3, 6, 12, …) */
export type CellValue = number;

/** 4×4 grid in row-major order. grid[row][col]. */
export type Grid = CellValue[][];

/** Whether the game is still playable or has ended */
export type GameStatus = 'playing' | 'ended';

/** Strategy for generating the "next tile" value shown in the preview */
export type NextTileStrategy = 'bag' | 'random' | 'progressive';

/* ── Configuration ─────────────────────────────────────── */

export interface GameConfig {
  /** Grid dimension (default 4) */
  gridSize: number;
  /** Number of tiles placed at game start (default 9) */
  startTilesCount: number;
  /**
   * When true, new tiles only spawn on rows/cols that changed during the move.
   * Falls back to any empty edge cell, then any empty cell.
   */
  spawnOnlyOnChangedLine: boolean;
  /** Strategy for generating next tile values */
  nextTileStrategy: NextTileStrategy;
  /** Show score (feature flag, default false — design has no score UI) */
  scoringEnabled: boolean;
  /** RNG seed for deterministic gameplay */
  seed: number;
  /** Load the design-reference fixture board instead of random start */
  fixtureMode: boolean;
  /** Enable non-color cue (corner dot) for 1 vs 2 tiles (accessibility flag) */
  accessibilityDotEnabled: boolean;
  /** Number of tiles to spawn from queue per move (default 2) */
  queueSpawnCount: number;
}

/* ── Move results ──────────────────────────────────────── */

export interface MoveResult {
  /** Grid state after movement and merges (before spawn) */
  newGrid: Grid;
  /** True if at least one tile moved or merged */
  changed: boolean;
  /**
   * Indices of lines that changed during the move.
   * For horizontal moves (left/right): row indices.
   * For vertical moves (up/down): column indices.
   */
  changedLines: Set<number>;
  /** Animation events produced by this move */
  events: MoveEvent[];
  /** Tiles produced by splits during this move (to be added to queue) */
  splitOutputs: CellValue[];
  /** Total score earned from splits this move */
  splitScore: number;
}

/** Row/column position on the grid */
export interface Position {
  row: number;
  col: number;
}

/** Serializable game-state snapshot */
export interface GameState {
  grid: Grid;
  /** Queue of tiles waiting to spawn */
  queue: CellValue[];
  status: GameStatus;
  score: number;
  moveCount: number;
  /** @deprecated Use queue instead */
  nextTile: CellValue;
}

/** Events emitted during a move (used by renderers for animation) */
export interface MoveEvent {
  type: 'move' | 'merge' | 'spawn';
  /** Origin cell (absent for spawns) */
  from?: Position;
  /** Destination cell */
  to: Position;
  /** Tile value at destination after the event */
  value: CellValue;
  /** For merges: the two input values that combined */
  mergedFrom?: [CellValue, CellValue];
  /** Whether this merge was a milestone split (3 outputs) */
  isMilestone?: boolean;
}
