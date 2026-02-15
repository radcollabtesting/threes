import type {
  Direction,
  Grid,
  GameStatus,
  GameState,
  GameConfig,
  CellValue,
  MoveEvent,
} from './types';
import { resolveConfig } from './config';
import {
  createEmptyGrid,
  cloneGrid,
  getEmptyCells,
  getFixtureGrid,
} from './board';
import { applyMove, hasAnyValidMove } from './move';
import { selectSpawnPosition } from './spawn';
import { createNextTileGenerator } from './next-tile';
import { scoreGrid } from './score';
import { createRng, pickRandom, randomInt } from '@threes/rng';
import { BASE_TILES, MAGENTA } from './color';

/**
 * Core game engine for the color mixing game.
 *
 * Manages grid state, move validation, tile spawning, next-tile preview,
 * game-over detection, and scoring.
 *
 * All randomness flows through a seeded PRNG so that the same seed + moves
 * always produce the same game history.
 */
export class ThreesGame {
  readonly config: GameConfig;

  private _grid: Grid;
  private _nextTile: CellValue;
  private _status: GameStatus;
  private _score: number;
  private _moveCount: number;
  private _rng: () => number;
  private _nextTileGen: (grid: Grid) => CellValue;
  private _lastMoveEvents: MoveEvent[];

  constructor(configOverrides?: Partial<GameConfig>) {
    this.config = resolveConfig(configOverrides);
    this._rng = createRng(this.config.seed);
    this._nextTileGen = createNextTileGenerator(
      this.config.nextTileStrategy,
      this._rng,
    );
    this._grid = createEmptyGrid(this.config.gridSize);
    this._nextTile = 0;
    this._status = 'playing';
    this._score = 0;
    this._moveCount = 0;
    this._lastMoveEvents = [];

    this._initializeBoard();
  }

  /* ── Public getters ──────────────────────────────────── */

  /** Current grid (deep copy so callers cannot mutate internal state) */
  get grid(): Grid {
    return cloneGrid(this._grid);
  }

  /** The tile value that will be spawned after the next valid move */
  get nextTile(): CellValue {
    return this._nextTile;
  }

  get status(): GameStatus {
    return this._status;
  }

  get score(): number {
    return this._score;
  }

  get moveCount(): number {
    return this._moveCount;
  }

  /** Animation events from the most recent move (for renderers) */
  get lastMoveEvents(): MoveEvent[] {
    return [...this._lastMoveEvents];
  }

  /** Serializable snapshot of the full game state */
  getState(): GameState {
    return {
      grid: this.grid,
      nextTile: this._nextTile,
      status: this._status,
      score: this._score,
      moveCount: this._moveCount,
    };
  }

  /* ── Main action ─────────────────────────────────────── */

  /**
   * Attempts a swipe in the given direction.
   *
   * Turn flow:
   *   1. Validate: if move changes nothing -> return false (no spawn, no turn).
   *   2. Apply movement + merges.
   *   3. Spawn a new tile (value = current nextTile) on the opposite edge.
   *   4. Draw a new nextTile value for the future.
   *   5. Update score.
   *   6. Check game-over (no valid moves in any direction -> ENDED).
   *
   * @returns true if the move was valid and applied; false otherwise.
   */
  move(direction: Direction): boolean {
    if (this._status !== 'playing') return false;

    this._lastMoveEvents = [];

    // 1-2. Apply movement + merges
    const { newGrid, changed, changedLines, events } = applyMove(
      this._grid,
      direction,
    );

    // Invalid move: do nothing
    if (!changed) return false;

    this._grid = newGrid;
    this._moveCount++;
    this._lastMoveEvents = events;

    // 3. Spawn a tile with current nextTile value
    const spawnPos = selectSpawnPosition(
      this._grid,
      direction,
      changedLines,
      this.config,
      this._rng,
    );

    if (spawnPos) {
      this._grid[spawnPos.row][spawnPos.col] = this._nextTile;
      this._lastMoveEvents.push({
        type: 'spawn',
        to: spawnPos,
        value: this._nextTile,
      });
    }

    // 4. Draw a new next tile
    this._nextTile = this._nextTileGen(this._grid);

    // 5. Update score (never decreases)
    if (this.config.scoringEnabled) {
      this._score = Math.max(this._score, scoreGrid(this._grid));
    }

    // 6. Game-over check
    if (!hasAnyValidMove(this._grid)) {
      this._status = 'ended';
      this._score = Math.max(this._score, scoreGrid(this._grid));
    }

    return true;
  }

  /**
   * Restarts the game with a fresh random seed so each new game
   * has a unique board layout.
   */
  restart(): void {
    const newSeed = Math.floor(Math.random() * 2147483647);
    this._rng = createRng(newSeed);
    this._nextTileGen = createNextTileGenerator(
      this.config.nextTileStrategy,
      this._rng,
    );
    this._grid = createEmptyGrid(this.config.gridSize);
    this._nextTile = 0;
    this._status = 'playing';
    this._score = 0;
    this._moveCount = 0;
    this._lastMoveEvents = [];

    this._initializeBoard();
  }

  /* ── Private ─────────────────────────────────────────── */

  private _initializeBoard(): void {
    if (this.config.fixtureMode) {
      this._grid = getFixtureGrid();
      this._nextTile = MAGENTA; // default fixture next tile
    } else {
      this._placeRandomStartTiles();
      this._nextTile = this._nextTileGen(this._grid);
    }

    if (this.config.scoringEnabled) {
      this._score = scoreGrid(this._grid);
    }
  }

  /**
   * Places random starting tiles on the empty board.
   * If startTilesCount is 0, picks a random count between 3 and 5.
   * Values are always base color tiles (C, M, Y).
   */
  private _placeRandomStartTiles(): void {
    const count = this.config.startTilesCount > 0
      ? this.config.startTilesCount
      : randomInt(2, 5, this._rng); // 2, 3, 4, or 5

    const maxTiles = Math.min(
      count,
      this.config.gridSize * this.config.gridSize,
    );

    for (let i = 0; i < maxTiles; i++) {
      const empty = getEmptyCells(this._grid);
      if (empty.length === 0) break;

      const pos = pickRandom(empty, this._rng);
      const val = BASE_TILES[Math.floor(this._rng() * BASE_TILES.length)];
      this._grid[pos.row][pos.col] = val;
    }
  }
}
