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
import { scoreGrid, scoreGridWithMultipliers } from './score';
import { createRng, pickRandom, randomInt } from '@threes/rng';
import { BASE_TILES, MAGENTA, tileColorIndex, GRAY_IDX } from './color';
import { applyCatalystMix, hasValidCatalystMix } from './catalyst-mix';
import type { Position } from './types';

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
  private _multipliers: number[][];
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
    this._multipliers = createEmptyGrid(this.config.gridSize);
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

  /** Current multiplier grid (deep copy). Values > 0 = catalyst mix multiplier. */
  get multipliers(): number[][] {
    return this._multipliers.map(row => [...row]);
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

    // Update multiplier grid to follow tile movements
    this._updateMultipliersFromEvents(events);

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
      this._score = Math.max(this._score, scoreGridWithMultipliers(this._grid, this._multipliers));
    }

    // 6. Game-over check: ended only if no swipe moves AND no catalyst mixes
    if (!hasAnyValidMove(this._grid) && !hasValidCatalystMix(this._grid)) {
      this._status = 'ended';
      this._score = Math.max(this._score, scoreGridWithMultipliers(this._grid, this._multipliers));
    }

    return true;
  }

  /**
   * Performs a catalyst mix: sacrifice a Gray tile to blend two adjacent tiles.
   *
   * The Gray tile and both source tiles are consumed (3 tiles → 1).
   * The blended result (with +1 bonus dot) replaces the Gray's position.
   * Does not consume a turn or spawn a new tile.
   *
   * @returns true if the mix was valid and applied; false otherwise.
   */
  catalystMix(grayPos: Position, src1: Position, src2: Position): boolean {
    if (this._status !== 'playing') return false;

    // Validate Gray tile
    const grayVal = this._grid[grayPos.row]?.[grayPos.col];
    if (!grayVal || tileColorIndex(grayVal) !== GRAY_IDX) return false;

    // Sum input multipliers before they get cleared
    const m1 = this._multipliers[src1.row][src1.col];
    const m2 = this._multipliers[src2.row][src2.col];

    const result = applyCatalystMix(this._grid, grayPos, src1, src2);
    if (!result) return false;

    this._lastMoveEvents = result.events;

    // Update multiplier grid: clear sources, set result = sum of inputs + 2
    this._multipliers[src1.row][src1.col] = 0;
    this._multipliers[src2.row][src2.col] = 0;
    this._multipliers[grayPos.row][grayPos.col] = m1 + m2 + 2;

    // Update score
    if (this.config.scoringEnabled) {
      this._score = Math.max(this._score, scoreGridWithMultipliers(this._grid, this._multipliers));
    }

    // Check game-over (unlikely after removing tiles, but be safe)
    if (!hasAnyValidMove(this._grid) && !hasValidCatalystMix(this._grid)) {
      this._status = 'ended';
      this._score = Math.max(this._score, scoreGridWithMultipliers(this._grid, this._multipliers));
    }

    return true;
  }

  /**
   * Returns positions of all Gray tiles on the board.
   */
  getGrayPositions(): Position[] {
    const positions: Position[] = [];
    for (let r = 0; r < this.config.gridSize; r++) {
      for (let c = 0; c < this.config.gridSize; c++) {
        const val = this._grid[r][c];
        if (val !== 0 && tileColorIndex(val) === GRAY_IDX) {
          positions.push({ row: r, col: c });
        }
      }
    }
    return positions;
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
    this._multipliers = createEmptyGrid(this.config.gridSize);
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
      this._score = scoreGridWithMultipliers(this._grid, this._multipliers);
    }
  }

  /**
   * Updates the multiplier grid to follow tile movements from move events.
   * Must be called after applyMove updates the tile grid.
   */
  private _updateMultipliersFromEvents(events: MoveEvent[]): void {
    // Build a temporary copy to avoid read-write conflicts
    const oldMult = this._multipliers.map(row => [...row]);
    // Clear the multiplier grid — we'll repopulate from events
    for (const row of this._multipliers) row.fill(0);

    // Track which cells have been filled (from events)
    const filled = new Set<string>();

    for (const ev of events) {
      if (ev.type === 'move' && ev.from) {
        const m = oldMult[ev.from.row][ev.from.col];
        this._multipliers[ev.to.row][ev.to.col] = m;
        filled.add(`${ev.to.row},${ev.to.col}`);
      } else if (ev.type === 'merge' && ev.from) {
        // Merge: combine multipliers from both tiles
        const mMoving = oldMult[ev.from.row][ev.from.col];
        const mTarget = oldMult[ev.to.row][ev.to.col];
        this._multipliers[ev.to.row][ev.to.col] = mMoving + mTarget;
        filled.add(`${ev.to.row},${ev.to.col}`);
      }
      // spawn events get multiplier 0 (default)
    }

    // Preserve multipliers for tiles that didn't move
    for (let r = 0; r < this._multipliers.length; r++) {
      for (let c = 0; c < this._multipliers[r].length; c++) {
        const key = `${r},${c}`;
        if (!filled.has(key) && this._grid[r][c] !== 0) {
          this._multipliers[r][c] = oldMult[r][c];
        }
      }
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
