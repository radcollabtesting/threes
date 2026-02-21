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
} from './board';
import { applyMove, hasAnyValidMove } from './move';
import { spawnFromQueue } from './spawn';
import { createRng, randomInt, shuffleArray } from '@threes/rng';
import { BLACK } from './color';

/**
 * Core game engine for the color breakdown game.
 *
 * Manages grid state, move validation, queue-based tile spawning,
 * game-over detection, and scoring.
 *
 * Split mechanic: matching 2 tiles removes them and produces output
 * tiles that go into a queue. The queue spawns tiles onto the board
 * after each move (up to 2 per move, on the opposite edge).
 */
export class ThreesGame {
  readonly config: GameConfig;

  private _grid: Grid;
  private _multipliers: number[][];
  private _queue: CellValue[];
  private _status: GameStatus;
  private _score: number;
  private _moveCount: number;
  private _rng: () => number;
  private _lastMoveEvents: MoveEvent[];

  constructor(configOverrides?: Partial<GameConfig>) {
    this.config = resolveConfig(configOverrides);
    this._rng = createRng(this.config.seed);
    this._grid = createEmptyGrid(this.config.gridSize);
    this._multipliers = createEmptyGrid(this.config.gridSize);
    this._queue = [];
    this._status = 'playing';
    this._score = 0;
    this._moveCount = 0;
    this._lastMoveEvents = [];

    this._initializeBoard();
  }

  /* ── Public getters ──────────────────────────────────── */

  /** Current grid (deep copy) */
  get grid(): Grid {
    return cloneGrid(this._grid);
  }

  /** Current multiplier grid (deep copy). Values > 0 = 2x bonus. */
  get multipliers(): number[][] {
    return this._multipliers.map(row => [...row]);
  }

  /** The tile queue (copy) */
  get queue(): CellValue[] {
    return [...this._queue];
  }

  /** The next tile to spawn (first in queue, or 0 if empty) */
  get nextTile(): CellValue {
    return this._queue.length > 0 ? this._queue[0] : 0;
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

  /** Animation events from the most recent move */
  get lastMoveEvents(): MoveEvent[] {
    return [...this._lastMoveEvents];
  }

  /** Serializable snapshot */
  getState(): GameState {
    return {
      grid: this.grid,
      queue: this.queue,
      nextTile: this.nextTile,
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
   *   1. Apply movement + splits.
   *   2. Collect split outputs, randomize, add to queue.
   *   3. Award 2x multiplier on milestone merge-point tiles.
   *   4. Add split score to running total.
   *   5. Spawn up to 2 tiles from queue on the opposite edge.
   *   6. Check game-over.
   *
   * @returns true if the move was valid and applied; false otherwise.
   */
  move(direction: Direction): boolean {
    if (this._status !== 'playing') return false;

    this._lastMoveEvents = [];

    // 1. Apply movement + splits
    const { newGrid, changed, changedLines, events, splitOutputs, splitScore } = applyMove(
      this._grid,
      direction,
    );

    if (!changed) return false;

    this._grid = newGrid;
    this._moveCount++;
    this._lastMoveEvents = events;

    // Update multiplier grid to follow tile movements
    this._updateMultipliersFromEvents(events);

    // 2. Collect split outputs, randomize, add to queue
    if (splitOutputs.length > 0) {
      const shuffled = shuffleArray(splitOutputs, this._rng);
      this._queue.push(...shuffled);
    }

    // 3. Award 2x on milestone merge-point tiles
    for (const ev of events) {
      if (ev.type === 'merge' && ev.isMilestone) {
        this._multipliers[ev.to.row][ev.to.col] = 1;
      }
    }

    // 4. Add split score (with 2x bonus for tiles that had multipliers)
    if (this.config.scoringEnabled) {
      let moveScore = splitScore;
      // Check if any merged tile had a 2x multiplier
      for (const ev of events) {
        if (ev.type === 'merge' && ev.from) {
          // Check both the source and destination for multipliers
          // (multipliers were updated by _updateMultipliersFromEvents)
          // The multiplier at the merge target was set from the combined value
          const mult = this._multipliers[ev.to.row]?.[ev.to.col] ?? 0;
          if (mult > 0 && !ev.isMilestone) {
            // The merged tile had a 2x bonus — double this split's score
            // (the milestone itself just set the multiplier, don't double its own score)
            moveScore += splitScore; // double the base
            // Consume the multiplier
            this._multipliers[ev.to.row][ev.to.col] = 0;
          }
        }
      }
      this._score += moveScore;
    }

    // 5. Spawn from queue
    const spawnCount = Math.min(this.config.queueSpawnCount, this._queue.length);
    if (spawnCount > 0) {
      const { spawned, consumed } = spawnFromQueue(
        this._grid,
        this._queue,
        direction,
        changedLines,
        this.config,
        this._rng,
        spawnCount,
      );

      // Remove consumed items from front of queue
      this._queue.splice(0, consumed);

      // Add spawn events
      for (const { pos, value } of spawned) {
        this._lastMoveEvents.push({
          type: 'spawn',
          to: pos,
          value,
        });
      }
    }

    // 6. Game-over check: no valid moves and queue is empty
    if (!hasAnyValidMove(this._grid) && this._queue.length === 0) {
      this._status = 'ended';
    }

    return true;
  }

  /**
   * Restarts the game with a fresh random seed.
   */
  restart(): void {
    const newSeed = Math.floor(Math.random() * 2147483647);
    this._rng = createRng(newSeed);
    this._grid = createEmptyGrid(this.config.gridSize);
    this._multipliers = createEmptyGrid(this.config.gridSize);
    this._queue = [];
    this._status = 'playing';
    this._score = 0;
    this._moveCount = 0;
    this._lastMoveEvents = [];

    this._initializeBoard();
  }

  /* ── Private ─────────────────────────────────────────── */

  private _initializeBoard(): void {
    this._placeRandomStartTiles();
  }

  /**
   * Updates the multiplier grid to follow tile movements from move events.
   */
  private _updateMultipliersFromEvents(events: MoveEvent[]): void {
    const oldMult = this._multipliers.map(row => [...row]);
    for (const row of this._multipliers) row.fill(0);

    const filled = new Set<string>();

    for (const ev of events) {
      if (ev.type === 'move' && ev.from) {
        const m = oldMult[ev.from.row][ev.from.col];
        this._multipliers[ev.to.row][ev.to.col] = m;
        filled.add(`${ev.to.row},${ev.to.col}`);
      } else if (ev.type === 'merge' && ev.from) {
        // For splits: the multiplier from the input tiles transfers
        const mMoving = oldMult[ev.from.row][ev.from.col];
        const mTarget = oldMult[ev.to.row][ev.to.col];
        this._multipliers[ev.to.row][ev.to.col] = mMoving + mTarget;
        filled.add(`${ev.to.row},${ev.to.col}`);
      }
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
   * Starts with 4-6 Black tiles.
   */
  private _placeRandomStartTiles(): void {
    const count = this.config.startTilesCount > 0
      ? this.config.startTilesCount
      : randomInt(4, 6, this._rng); // 4, 5, or 6

    const maxTiles = Math.min(
      count,
      this.config.gridSize * this.config.gridSize,
    );

    for (let i = 0; i < maxTiles; i++) {
      const empty = getEmptyCells(this._grid);
      if (empty.length === 0) break;

      const pos = empty[Math.floor(this._rng() * empty.length)];
      this._grid[pos.row][pos.col] = BLACK;
    }
  }
}
