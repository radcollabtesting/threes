/**
 * Entry point for the Threes web canvas app.
 *
 * Reads configuration from URL query params:
 *   ?seed=123       — RNG seed (default: 42)
 *   ?fixture=1      — enable fixture mode (design reference board)
 *   ?strategy=bag   — next-tile strategy: "bag" | "random"
 *   ?score=1        — enable scoring
 *
 * Keyboard: Arrow keys to move (instant), R to restart.
 * Touch/mouse: drag to preview, release past 50% to commit.
 */

import { ThreesGame, cloneGrid, sumGrid, type Direction } from '@threes/game-logic';
import { Renderer } from './renderer';
import {
  createAnimState,
  triggerMoveAnimations,
  triggerSpawnOnly,
  triggerNextTileAnim,
  triggerShake,
  updateAnimations,
  type AnimState,
} from './animation';
import { setupInput, resolveSwipe, type InputCallbacks } from './input';
import {
  createDragState,
  computeDragPreview,
  computeProgress,
  updateSnap,
  resetDrag,
  COMMIT_THRESHOLD,
  type DragState,
} from './drag';
import { saveScore } from './score-history';
import type { GameOverData } from './renderer';

/* ── Parse query-param config ──────────────────────────── */

const params = new URLSearchParams(window.location.search);

const seed = parseInt(params.get('seed') ?? '42', 10);
const fixtureMode = params.get('fixture') === '1';
const nextTileStrategy = (params.get('strategy') ?? 'progressive') as 'bag' | 'random' | 'progressive';
const scoringEnabled = params.get('score') === '1';

/* ── Bootstrap ─────────────────────────────────────────── */

const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const anim: AnimState = createAnimState();
const drag: DragState = createDragState();

let game = new ThreesGame({ seed, fixtureMode, nextTileStrategy, scoringEnabled });
let gameOverData: GameOverData | null = null;

function onGameOver(): void {
  const finalScore = sumGrid(game.grid);
  const { scores, newIndex } = saveScore(finalScore);
  // Sort scores descending; track the current game's entry by reference
  const currentEntry = scores[newIndex];
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const sortedIndex = sorted.indexOf(currentEntry);
  gameOverData = { currentScore: finalScore, scores: sorted, currentScoreIndex: sortedIndex };
}

/* ── Input handlers ────────────────────────────────────── */

/**
 * Instant move from keyboard. Blocked during drag.
 */
function handleInstantMove(direction: Direction): void {
  if (drag.phase !== 'idle') return;
  if (game.status === 'ended') return;

  const oldNext = game.nextTile;
  const success = game.move(direction);
  if (success) {
    triggerMoveAnimations(game.lastMoveEvents, anim, direction);
    triggerNextTileAnim(anim, oldNext, game.nextTile);
    if ((game.status as string) === 'ended') onGameOver();
  } else {
    triggerShake(anim);
  }
}

function handleNewGame(): void {
  game.restart();
  resetDrag(drag);
  gameOverData = null;
}

/**
 * Pointer down — snapshot the grid and enter pending state.
 */
function handleDragStart(x: number, y: number): void {
  if (game.status === 'ended') return;
  if (drag.phase !== 'idle') return;

  drag.phase = 'pending';
  drag.startX = x;
  drag.startY = y;
  drag.currentX = x;
  drag.currentY = y;
  drag.gridSnapshot = cloneGrid(game.grid);
}

/**
 * Pointer move — resolve axis lock on first significant displacement,
 * then update progress each frame.
 */
function handleDragMove(x: number, y: number): void {
  if (drag.phase !== 'pending' && drag.phase !== 'dragging') return;

  drag.currentX = x;
  drag.currentY = y;

  const dx = x - drag.startX;
  const dy = y - drag.startY;

  // Axis-lock: resolve direction once
  if (drag.phase === 'pending') {
    const dir = resolveSwipe(dx, dy);
    if (!dir) return; // not enough displacement yet

    drag.direction = dir;
    drag.preview = computeDragPreview(drag.gridSnapshot!, dir);
    drag.phase = 'dragging';
  }

  // Update progress from pointer displacement
  drag.progress = computeProgress(
    dx, dy,
    drag.direction!,
    renderer.currentScale,
    drag.preview!.valid,
  );
}

/**
 * Pointer up — decide commit vs cancel, start snap animation.
 */
function handleDragEnd(): void {
  if (drag.phase === 'pending') {
    // Very short drag with no direction — treat as tap (restart if game over)
    resetDrag(drag);
    return;
  }

  if (drag.phase !== 'dragging') return;

  // Decide snap target
  if (drag.preview!.valid && drag.progress >= COMMIT_THRESHOLD) {
    // Commit: snap to 1.0
    drag.snapTarget = 1.0;
  } else {
    // Cancel: snap back to 0.0
    drag.snapTarget = 0.0;
  }

  drag.phase = 'snapping';
}

/* ── Wire up input ─────────────────────────────────────── */

const inputCallbacks: InputCallbacks = {
  onInstantMove: handleInstantMove,
  onRestart: handleNewGame,
  onDragStart: handleDragStart,
  onDragMove: handleDragMove,
  onDragEnd: handleDragEnd,
};

setupInput(canvas, inputCallbacks);

/* ── "New Game" button click ──────────────────────────── */

canvas.addEventListener('click', (e: MouseEvent) => {
  const bounds = renderer.newGameButtonBounds;
  if (!bounds) return;
  if (
    e.clientX >= bounds.x && e.clientX <= bounds.x + bounds.w &&
    e.clientY >= bounds.y && e.clientY <= bounds.y + bounds.h
  ) {
    handleNewGame();
  }
});

/* ── Resize ────────────────────────────────────────────── */

window.addEventListener('resize', () => renderer.resize());

/* ── Game loop ─────────────────────────────────────────── */

let lastTime = 0;

function loop(now: number): void {
  const dt = lastTime ? now - lastTime : 0;
  lastTime = now;

  // Snap animation (during snapping phase)
  if (drag.phase === 'snapping') {
    const still = updateSnap(drag, dt);
    if (!still) {
      // Snap arrived at target
      if (drag.snapTarget === 1.0) {
        // Commit the move
        const direction = drag.direction!;
        const oldNext = game.nextTile;
        resetDrag(drag);
        game.move(direction);
        triggerSpawnOnly(game.lastMoveEvents, anim, direction);
        triggerNextTileAnim(anim, oldNext, game.nextTile);
        if (game.status === 'ended') onGameOver();
      } else {
        // Cancel — shake if the move was invalid
        const wasInvalid = drag.preview && !drag.preview.valid;
        resetDrag(drag);
        if (wasInvalid) triggerShake(anim);
      }
    }
  }

  // Standard animations (slide/merge/spawn/shake)
  updateAnimations(anim, dt);

  // Choose which grid to show: frozen snapshot during drag, live grid otherwise
  const displayGrid = drag.gridSnapshot ?? game.grid;

  renderer.render(
    displayGrid,
    game.nextTile,
    game.status === 'ended',
    anim,
    drag.phase === 'dragging' || drag.phase === 'snapping' ? drag : null,
    gameOverData,
  );

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
