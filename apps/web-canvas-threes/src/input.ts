/**
 * Input handling for the web canvas app.
 *
 * Two input modes:
 *   - Keyboard (arrow keys): instant discrete moves with debounce
 *   - Touch/mouse: continuous drag events (start, move, end) for
 *     the drag-to-preview system
 *
 * Axis-lock thresholds from design tokens.
 */

import { SIZES, INPUT } from '@threes/design-tokens';
import type { Direction } from '@threes/game-logic';

/* ── Callback types ────────────────────────────────────── */

export interface InputCallbacks {
  /** Instant move from keyboard (arrow keys) */
  onInstantMove: (direction: Direction) => void;
  /** Restart game (R key or tap on game-over) */
  onRestart: () => void;
  /** Pointer went down on canvas */
  onDragStart: (x: number, y: number) => void;
  /** Pointer moved while down */
  onDragMove: (x: number, y: number) => void;
  /** Pointer released */
  onDragEnd: () => void;
}

/* ── Axis-lock helper (exported for use by main.ts) ────── */

/**
 * Resolves a dx/dy displacement into a Direction, or null if
 * too short or too diagonal.
 */
export function resolveSwipe(dx: number, dy: number): Direction | null {
  const minDist = Math.max(INPUT.minSwipeDistance, SIZES.tileWidth * 0.25);
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < minDist) return null;
  if (ax > ay * INPUT.axisLockRatio) return dx > 0 ? 'right' : 'left';
  if (ay > ax * INPUT.axisLockRatio) return dy > 0 ? 'down' : 'up';
  return null; // diagonal — ambiguous
}

/* ── Setup ─────────────────────────────────────────────── */

/**
 * Attaches all input listeners.
 * @returns Cleanup function that removes all listeners.
 */
export function setupInput(
  canvas: HTMLCanvasElement,
  cb: InputCallbacks,
): () => void {
  /* ── Keyboard: instant moves with debounce ───────────── */
  let busy = false;
  const DEBOUNCE_MS = 160;

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'r' || e.key === 'R') { cb.onRestart(); return; }

    let dir: Direction | null = null;
    switch (e.key) {
      case 'ArrowLeft':  dir = 'left'; break;
      case 'ArrowRight': dir = 'right'; break;
      case 'ArrowUp':    dir = 'up'; break;
      case 'ArrowDown':  dir = 'down'; break;
    }
    if (dir) {
      e.preventDefault();
      if (busy) return;
      busy = true;
      cb.onInstantMove(dir);
      setTimeout(() => { busy = false; }, DEBOUNCE_MS);
    }
  }

  /* ── Touch: continuous drag events ───────────────────── */
  function onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    cb.onDragStart(e.touches[0].clientX, e.touches[0].clientY);
  }

  function onTouchMove(e: TouchEvent): void {
    e.preventDefault(); // prevent scrolling
    if (e.touches.length !== 1) return;
    cb.onDragMove(e.touches[0].clientX, e.touches[0].clientY);
  }

  function onTouchEnd(): void {
    cb.onDragEnd();
  }

  /* ── Mouse: continuous drag events ───────────────────── */
  let mouseDown = false;

  function onMouseDown(e: MouseEvent): void {
    mouseDown = true;
    cb.onDragStart(e.clientX, e.clientY);
  }

  function onMouseMove(e: MouseEvent): void {
    if (!mouseDown) return;
    cb.onDragMove(e.clientX, e.clientY);
  }

  function onMouseUp(): void {
    if (!mouseDown) return;
    mouseDown = false;
    cb.onDragEnd();
  }

  /* ── Attach listeners ────────────────────────────────── */
  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: true });
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };
}
