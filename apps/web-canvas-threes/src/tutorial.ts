/**
 * Tutorial mode for the Threes game.
 *
 * Guides the player through core mechanics in 5 stages:
 *   1. "Swipe anywhere to move the board"         — 2 yellows, no spawns
 *   2. "Walls help you merge (keep swiping)"       — gray border shown
 *   3. "Merge any 2 of the same for more colors"   — border gone, 2nd green spawns
 *   4. "Every swipe adds another color"             — normal spawning begins
 *   5. "Each white dot gets you more points!"       — continue button, no game over
 */

import {
  createEmptyGrid,
  applyMove,
  selectSpawnPosition,
  resolveConfig,
  encodeTile,
  tileTier,
  YELLOW_IDX,
  GREEN_IDX,
  BASE_TILES,
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
  | 'merge_yellows'
  | 'normal'
  | 'secondary';

const HEADERS: Record<TutorialStage, string> = {
  swipe: 'Swipe anywhere to move the board',
  wall: 'Walls help you merge (keep swiping)',
  merge_yellows: 'Merge any 2 of the same for more colors',
  normal: 'Every swipe adds another color',
  secondary: 'Each white dot gets you more points!',
};

/* ── State ────────────────────────────────────────────── */

export interface TutorialState {
  active: boolean;
  stage: TutorialStage;
  grid: Grid;
  lastMoveEvents: MoveEvent[];
  nextTile: CellValue;
}

const YELLOW = encodeTile(YELLOW_IDX, 0);
const GREEN = encodeTile(GREEN_IDX, 0);

export function createTutorialState(): TutorialState {
  const grid = createEmptyGrid(4);
  grid[2][2] = YELLOW;
  grid[3][3] = YELLOW;

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
  return false; // next tile preview is always hidden during tutorial
}

export function tutorialShowContinue(state: TutorialState): boolean {
  return state.stage === 'secondary';
}

/* ── Simple RNG (no need for seedable here) ───────────── */

let _rngState = (Date.now() ^ 0xDEADBEEF) >>> 0;

function rng(): number {
  _rngState = (_rngState * 1664525 + 1013904223) >>> 0;
  return _rngState / 0x100000000;
}

function randomBaseTile(): CellValue {
  return BASE_TILES[Math.floor(rng() * BASE_TILES.length)];
}

/* ── Helpers ──────────────────────────────────────────── */

/** Does any non-empty tile sit on the leading edge for the given direction? */
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

/**
 * Place a green tile on the spawn edge (opposite of swipe direction)
 * aligned with the merge position's row or column.
 */
function spawnGreenAligned(
  grid: Grid,
  direction: Direction,
  mergeRow: number,
  mergeCol: number,
): { row: number; col: number } | null {
  const n = grid.length;
  let row = 0;
  let col = 0;

  switch (direction) {
    case 'left':  row = mergeRow; col = n - 1; break;
    case 'right': row = mergeRow; col = 0;     break;
    case 'up':    row = n - 1;   col = mergeCol; break;
    case 'down':  row = 0;       col = mergeCol; break;
  }

  if (grid[row][col] === 0) return { row, col };

  // Fallback: any empty cell on the spawn edge
  const edgeCells: { row: number; col: number }[] = [];
  switch (direction) {
    case 'left':
      for (let r = 0; r < n; r++) if (grid[r][n - 1] === 0) edgeCells.push({ row: r, col: n - 1 });
      break;
    case 'right':
      for (let r = 0; r < n; r++) if (grid[r][0] === 0) edgeCells.push({ row: r, col: 0 });
      break;
    case 'up':
      for (let c = 0; c < n; c++) if (grid[n - 1][c] === 0) edgeCells.push({ row: n - 1, col: c });
      break;
    case 'down':
      for (let c = 0; c < n; c++) if (grid[0][c] === 0) edgeCells.push({ row: 0, col: c });
      break;
  }
  return edgeCells.length > 0 ? edgeCells[Math.floor(rng() * edgeCells.length)] : null;
}

/** Spawn config for tutorial (reused) */
const SPAWN_CONFIG: GameConfig = resolveConfig({
  gridSize: 4,
  spawnOnlyOnChangedLine: true,
});

/** Spawn a base tile on the appropriate edge, appending the event. */
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
  state.nextTile = randomBaseTile();
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

    case 'wall': {
      const greenMerge = mergeEvents.find((e: MoveEvent) => e.value === GREEN);
      if (greenMerge) {
        state.stage = 'merge_yellows';
        const pos = spawnGreenAligned(
          newGrid,
          direction,
          greenMerge.to.row,
          greenMerge.to.col,
        );
        if (pos) {
          state.grid[pos.row][pos.col] = GREEN;
          state.lastMoveEvents.push({
            type: 'spawn',
            to: pos,
            value: GREEN,
          });
        }
      }
      break;
    }

    case 'merge_yellows': {
      // Greens merged → produces teal (tier 2)
      const secondaryMerge = mergeEvents.find((e: MoveEvent) => tileTier(e.value) >= 2);
      if (secondaryMerge) {
        state.stage = 'normal';
        state.nextTile = randomBaseTile();
      }
      break;
    }

    case 'normal': {
      doSpawn(state, direction, changedLines);
      // After one move with spawning, advance to the final stage
      state.stage = 'secondary';
      break;
    }

    case 'secondary':
      doSpawn(state, direction, changedLines);
      break;
  }

  return true;
}
