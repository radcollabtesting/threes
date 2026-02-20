/**
 * Tutorial mode for the shade-based tile game.
 *
 * Guides the player through core mechanics in 4 stages:
 *   1. "Swipe anywhere to move the board"         — 2 R1 tiles, no spawns
 *   2. "Walls help you merge (keep swiping)"       — border shown
 *   3. "Merge matching shades to level up!"        — R2 created, spawn begins
 *   4. "Keep merging for new colors!"              — continue button
 */

import {
  createEmptyGrid,
  applyMove,
  selectSpawnPosition,
  resolveConfig,
  R1,
  BASE_TILE,
  type Grid,
  type Direction,
  type CellValue,
  type MoveEvent,
  type GameConfig,
} from '@threes/game-logic';

/* ── Stages ───────────────────────────────────────────── */

export type TutorialStage =
  | 'swipe'
  | 'wall'
  | 'merge'
  | 'continue';

const HEADERS: Record<TutorialStage, string> = {
  swipe: 'Swipe anywhere to move the board',
  wall: 'Walls help you merge (keep swiping)',
  merge: 'Merge matching shades to level up!',
  continue: 'Keep merging for new colors!',
};

/* ── State ────────────────────────────────────────────── */

export interface TutorialState {
  active: boolean;
  stage: TutorialStage;
  grid: Grid;
  lastMoveEvents: MoveEvent[];
  nextTile: CellValue;
}

export function createTutorialState(): TutorialState {
  const grid = createEmptyGrid(4);
  grid[2][2] = R1;
  grid[3][3] = R1;

  return {
    active: true,
    stage: 'swipe',
    grid,
    lastMoveEvents: [],
    nextTile: 0,
  };
}

/* ── Derived display flags ────────────────────────────── */

export function tutorialHeader(state: TutorialState): string {
  return HEADERS[state.stage];
}

export function tutorialShowBorder(state: TutorialState): boolean {
  return state.stage === 'wall';
}

export function tutorialShowNextTile(_state: TutorialState): boolean {
  return false;
}

export function tutorialShowContinue(state: TutorialState): boolean {
  return state.stage === 'continue';
}

/* ── Simple RNG (no need for seedable here) ───────────── */

let _rngState = (Date.now() ^ 0xDEADBEEF) >>> 0;

function rng(): number {
  _rngState = (_rngState * 1664525 + 1013904223) >>> 0;
  return _rngState / 0x100000000;
}

/* ── Helpers ──────────────────────────────────────────── */

function hasEdgeTile(grid: Grid, direction: Direction): boolean {
  const n = grid.length;
  switch (direction) {
    case 'left':
      for (let r = 0; r < n; r++) if (grid[r][0] !== 0) return true;
      break;
    case 'right':
      for (let r = 0; r < n; r++) if (grid[r][n - 1] !== 0) return true;
      break;
    case 'up':
      for (let c = 0; c < n; c++) if (grid[0][c] !== 0) return true;
      break;
    case 'down':
      for (let c = 0; c < n; c++) if (grid[n - 1][c] !== 0) return true;
      break;
  }
  return false;
}

const SPAWN_CONFIG: GameConfig = resolveConfig({
  gridSize: 4,
  spawnOnlyOnChangedLine: true,
});

function doSpawn(
  state: TutorialState,
  direction: Direction,
  changedLines: Set<number>,
): void {
  const pos = selectSpawnPosition(
    state.grid,
    direction,
    changedLines,
    SPAWN_CONFIG,
    rng,
  );
  if (pos) {
    state.grid[pos.row][pos.col] = state.nextTile;
    state.lastMoveEvents.push({
      type: 'spawn',
      to: pos,
      value: state.nextTile,
    });
  }
  state.nextTile = BASE_TILE;
}

/* ── Main move handler ────────────────────────────────── */

export function tutorialMove(
  state: TutorialState,
  direction: Direction,
): boolean {
  const { newGrid, changed, changedLines, events } = applyMove(
    state.grid,
    direction,
  );
  if (!changed) return false;

  state.grid = newGrid;
  state.lastMoveEvents = [...events];

  const mergeEvents = events.filter((e: MoveEvent) => e.type === 'merge');

  switch (state.stage) {
    case 'swipe':
      if (hasEdgeTile(newGrid, direction)) {
        state.stage = 'wall';
      }
      break;

    case 'wall':
      if (mergeEvents.length > 0) {
        state.stage = 'merge';
        state.nextTile = BASE_TILE;
        doSpawn(state, direction, changedLines);
      }
      break;

    case 'merge':
      doSpawn(state, direction, changedLines);
      state.stage = 'continue';
      break;

    case 'continue':
      doSpawn(state, direction, changedLines);
      break;
  }

  return true;
}
