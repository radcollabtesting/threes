/**
 * Drag-to-preview system for interactive swipe gestures.
 *
 * Instead of applying moves on pointer-up, this module lets tiles follow
 * the pointer in real-time. The user sees blocked tiles stay put, merging
 * tiles overlap, and can commit (release past 50%) or cancel (drag back).
 *
 * State machine:
 *   idle → pending → dragging → snapping → idle
 */

import type { Grid, Direction, MoveEvent } from '@threes/game-logic';
import { applyMove } from '@threes/game-logic';
import { SIZES } from '@threes/design-tokens';

/* ── Types ─────────────────────────────────────────────── */

/** Per-tile info computed once when direction locks */
export interface TilePreview {
  /** Original grid position */
  fromRow: number;
  fromCol: number;
  /** Where this tile ends up if the move commits */
  toRow: number;
  toCol: number;
  /** Tile value (original, before any merge) */
  value: number;
  /** True if this tile moves during the drag */
  moves: boolean;
}

/** Preview of what a move would do, computed once per drag direction */
export interface DragPreview {
  direction: Direction;
  /** Every non-empty tile in the grid, keyed by "row,col" */
  tiles: Map<string, TilePreview>;
  /** Whether the move is valid (at least one tile moves/merges) */
  valid: boolean;
  /** Raw move events from applyMove (needed for post-commit spawn) */
  moveEvents: MoveEvent[];
}

export type DragPhase =
  | 'idle'      // no drag active
  | 'pending'   // pointer down, direction not yet locked
  | 'dragging'  // direction locked, tiles following pointer
  | 'snapping'; // released, animating to final or original position

export interface DragState {
  phase: DragPhase;
  /** Pointer-down origin (CSS px) */
  startX: number;
  startY: number;
  /** Latest pointer position (CSS px) */
  currentX: number;
  currentY: number;
  /** Locked swipe direction (set once axis-lock resolves) */
  direction: Direction | null;
  /**
   * Normalized drag progress: 0 = original position, 1 = one full cell.
   * Clamped to [0, 1] for valid moves, [0, INVALID_MAX] for invalid.
   */
  progress: number;
  /** Computed preview (set when direction locks) */
  preview: DragPreview | null;
  /** Snap target: 1.0 for commit, 0.0 for cancel, null if not snapping */
  snapTarget: number | null;
  /** Grid snapshot taken at pointer-down (frozen during drag) */
  gridSnapshot: Grid | null;
}

/* ── Constants ─────────────────────────────────────────── */

/** Release past this threshold to commit the move */
export const COMMIT_THRESHOLD = 0.5;

/** Max progress for invalid moves (rubber-band feel) */
const INVALID_MAX = 0.12;

/** Snap speed: progress units per millisecond (100ms for full cell) */
const SNAP_SPEED = 0.01;

/* ── Factory ───────────────────────────────────────────── */

export function createDragState(): DragState {
  return {
    phase: 'idle',
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    direction: null,
    progress: 0,
    preview: null,
    snapTarget: null,
    gridSnapshot: null,
  };
}

/* ── Preview computation ───────────────────────────────── */

/**
 * Dry-runs applyMove to determine what each tile would do.
 * Called once when the drag direction locks. Pure, no side effects.
 */
export function computeDragPreview(grid: Grid, direction: Direction): DragPreview {
  const { changed, events } = applyMove(grid, direction);

  // Build lookup: "fromRow,fromCol" → event for tiles that move/merge
  const eventByFrom = new Map<string, MoveEvent>();
  for (const ev of events) {
    if (ev.from && (ev.type === 'move' || ev.type === 'merge')) {
      eventByFrom.set(`${ev.from.row},${ev.from.col}`, ev);
    }
  }

  const tiles = new Map<string, TilePreview>();
  const size = grid.length;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 0) continue;

      const key = `${r},${c}`;
      const ev = eventByFrom.get(key);

      tiles.set(key, {
        fromRow: r,
        fromCol: c,
        toRow: ev ? ev.to.row : r,
        toCol: ev ? ev.to.col : c,
        value: grid[r][c],
        moves: !!ev,
      });
    }
  }

  return { direction, tiles, valid: changed, moveEvents: events };
}

/* ── Progress calculation ──────────────────────────────── */

/**
 * Converts pointer displacement into normalized [0, max] progress.
 *
 * @param dx  Horizontal displacement (currentX - startX)
 * @param dy  Vertical displacement (currentY - startY)
 * @param direction  Locked drag direction
 * @param scale  Renderer's current uniform scale factor
 * @param valid  Whether the move is valid
 */
export function computeProgress(
  dx: number,
  dy: number,
  direction: Direction,
  scale: number,
  valid: boolean,
): number {
  // One cell step in CSS pixels
  const cellStepX = (SIZES.tileWidth + SIZES.gapX) * scale;
  const cellStepY = (SIZES.tileHeight + SIZES.gapY) * scale;

  let raw: number;
  switch (direction) {
    case 'left':  raw = -dx / cellStepX; break;
    case 'right': raw = dx / cellStepX; break;
    case 'up':    raw = -dy / cellStepY; break;
    case 'down':  raw = dy / cellStepY; break;
  }

  const max = valid ? 1.0 : INVALID_MAX;
  return Math.max(0, Math.min(max, raw));
}

/* ── Snap animation ────────────────────────────────────── */

/**
 * Advances drag.progress toward drag.snapTarget each frame.
 * @returns true if snap is still in progress, false when arrived.
 */
export function updateSnap(drag: DragState, dt: number): boolean {
  if (drag.snapTarget === null) return false;

  const diff = drag.snapTarget - drag.progress;
  if (Math.abs(diff) < 0.001) {
    drag.progress = drag.snapTarget;
    return false; // arrived
  }

  const step = SNAP_SPEED * dt;
  if (Math.abs(diff) <= step) {
    drag.progress = drag.snapTarget;
    return false;
  }

  drag.progress += Math.sign(diff) * step;
  return true;
}

/* ── Reset ─────────────────────────────────────────────── */

export function resetDrag(drag: DragState): void {
  drag.phase = 'idle';
  drag.startX = 0;
  drag.startY = 0;
  drag.currentX = 0;
  drag.currentY = 0;
  drag.direction = null;
  drag.progress = 0;
  drag.preview = null;
  drag.snapTarget = null;
  drag.gridSnapshot = null;
}
