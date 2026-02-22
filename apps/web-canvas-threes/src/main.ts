/**
 * Entry point for the Threes web canvas app.
 *
 * Color breakdown game with split mechanics and queue-based spawning.
 *
 * Reads configuration from URL query params:
 *   ?seed=123       — RNG seed (default: random)
 *   ?fixture=1      — enable fixture mode
 *   ?score=1        — enable scoring (on by default)
 *
 * Keyboard: Arrow keys to move (instant), R to restart.
 * Touch/mouse: drag to preview, release past 50% to commit.
 */

import { ThreesGame, cloneGrid, colorSplitResult, type Direction, type MoveEvent } from '@threes/game-logic';
import { Renderer } from './renderer';
import type { GameOverData, TutorialRenderInfo } from './renderer';
import {
  createAnimState,
  triggerMoveAnimations,
  triggerSpawnOnly,
  triggerNextTileAnim,
  triggerShake,
  triggerSplitParticles,
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
import { playMergeSound } from './audio';

/* ── Parse query-param config ──────────────────────────── */

const params = new URLSearchParams(window.location.search);

const seed = parseInt(params.get('seed') ?? String(Math.floor(Math.random() * 2147483647)), 10);
const fixtureMode = params.get('fixture') === '1';
const scoringEnabled = params.get('score') !== '0';

/* ── Bootstrap ─────────────────────────────────────────── */

const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const anim: AnimState = createAnimState();
const drag: DragState = createDragState();

let game = new ThreesGame({ seed, fixtureMode, scoringEnabled });
let gameOverData: GameOverData | null = null;
let multiplierSnapshot: number[][] | null = null;

function onGameOver(): void {
  const finalScore = game.score;
  const { scores, newIndex } = saveScore(finalScore);
  const currentEntry = scores[newIndex];
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const sortedIndex = sorted.indexOf(currentEntry);
  gameOverData = { currentScore: finalScore, scores: sorted, currentScoreIndex: sortedIndex };
}

/* ── Audio helper ──────────────────────────────────────── */

function playMergeSoundsFromEvents(events: MoveEvent[]): void {
  for (const ev of events) {
    if (ev.type === 'merge') {
      playMergeSound(3);
    }
  }
}

/** Triggers split particle animations for any merge events that produced split outputs. */
function triggerSplitParticlesFromEvents(events: MoveEvent[]): void {
  for (const ev of events) {
    if (ev.type === 'merge' && ev.from) {
      // Compute what the split produced based on the original tile values
      // ev.from has the moving tile's original value stored in ev.value
      // For the actual split outputs, we use splitResult
      const result = colorSplitResult(ev.value, ev.value);
      if (result) {
        // For milestone splits, the first output stays on the board;
        // only the queue-bound outputs become particles
        const queueOutputs = result.isMilestone
          ? result.outputs.slice(1)
          : result.outputs;
        triggerSplitParticles(anim, ev.to.row, ev.to.col, queueOutputs);
      }
    }
  }
}

/* ── Input handlers ────────────────────────────────────── */

function handleInstantMove(direction: Direction): void {
  if (drag.phase !== 'idle') return;
  if (game.status === 'ended') return;

  const oldNext = game.nextTile;
  const success = game.move(direction);
  if (success) {
    triggerMoveAnimations(game.lastMoveEvents, anim, direction);
    triggerNextTileAnim(anim, oldNext, game.nextTile);
    triggerSplitParticlesFromEvents(game.lastMoveEvents);
    playMergeSoundsFromEvents(game.lastMoveEvents);
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

function handleDragStart(x: number, y: number): void {
  if (drag.phase !== 'idle') return;
  if (game.status === 'ended') return;

  drag.phase = 'pending';
  drag.startX = x;
  drag.startY = y;
  drag.currentX = x;
  drag.currentY = y;
  drag.gridSnapshot = cloneGrid(game.grid);
  multiplierSnapshot = game.multipliers;
}

function handleDragMove(x: number, y: number): void {
  if (drag.phase !== 'pending' && drag.phase !== 'dragging') return;

  drag.currentX = x;
  drag.currentY = y;

  const dx = x - drag.startX;
  const dy = y - drag.startY;

  if (drag.phase === 'pending') {
    const dir = resolveSwipe(dx, dy);
    if (!dir) return;

    drag.direction = dir;
    drag.preview = computeDragPreview(drag.gridSnapshot!, dir);
    drag.phase = 'dragging';
  }

  drag.progress = computeProgress(
    dx, dy,
    drag.direction!,
    renderer.currentScale,
    drag.preview!.valid,
  );
}

function handleDragEnd(): void {
  if (drag.phase === 'pending') {
    resetDrag(drag);
    return;
  }

  if (drag.phase !== 'dragging') return;

  if (drag.preview!.valid && drag.progress >= COMMIT_THRESHOLD) {
    drag.snapTarget = 1.0;
  } else {
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
  onEscape: () => {},
};

setupInput(canvas, inputCallbacks);

/* ── Button click handlers ─────────────────────────────── */

canvas.addEventListener('click', (e: MouseEvent) => {
  const newGameBounds = renderer.newGameButtonBounds;
  if (newGameBounds &&
    e.clientX >= newGameBounds.x && e.clientX <= newGameBounds.x + newGameBounds.w &&
    e.clientY >= newGameBounds.y && e.clientY <= newGameBounds.y + newGameBounds.h
  ) {
    handleNewGame();
    return;
  }
});

/* ── Color blind mode toggle ───────────────────────────── */

const cbCheck = document.getElementById('cb-check') as HTMLInputElement;
const storedCB = localStorage.getItem('colorBlindMode');
if (storedCB !== null) {
  const on = storedCB === '1';
  cbCheck.checked = on;
  renderer.colorBlindMode = on;
}
cbCheck.addEventListener('change', () => {
  renderer.colorBlindMode = cbCheck.checked;
  localStorage.setItem('colorBlindMode', cbCheck.checked ? '1' : '0');
});

/* ── Dark / Light mode toggle ──────────────────────────── */

const themeCheck = document.getElementById('theme-check') as HTMLInputElement;

function applyDarkMode(dark: boolean): void {
  renderer.darkMode = dark;
  themeCheck.checked = dark;
  document.body.classList.toggle('light-mode', !dark);
}

const storedTheme = localStorage.getItem('darkMode');
if (storedTheme !== null) {
  applyDarkMode(storedTheme === '1');
} else {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyDarkMode(prefersDark);
}

themeCheck.addEventListener('change', () => {
  applyDarkMode(themeCheck.checked);
  localStorage.setItem('darkMode', themeCheck.checked ? '1' : '0');
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (localStorage.getItem('darkMode') === null) {
    applyDarkMode(e.matches);
  }
});

/* ── Resize ────────────────────────────────────────────── */

window.addEventListener('resize', () => renderer.resize());

/* ── Game loop ─────────────────────────────────────────── */

let lastTime = 0;

function loop(now: number): void {
  const dt = lastTime ? now - lastTime : 0;
  lastTime = now;

  // Snap animation
  if (drag.phase === 'snapping') {
    const still = updateSnap(drag, dt);
    if (!still) {
      if (drag.snapTarget === 1.0) {
        const direction = drag.direction!;
        const oldNext = game.nextTile;
        resetDrag(drag);
        game.move(direction);
        triggerSpawnOnly(game.lastMoveEvents, anim, direction);
        triggerNextTileAnim(anim, oldNext, game.nextTile);
        triggerSplitParticlesFromEvents(game.lastMoveEvents);
        playMergeSoundsFromEvents(game.lastMoveEvents);
        if (game.status === 'ended') onGameOver();
      } else {
        const wasInvalid = drag.preview && !drag.preview.valid;
        resetDrag(drag);
        if (wasInvalid) triggerShake(anim);
      }
    }
  }

  updateAnimations(anim, dt);

  const displayGrid = drag.gridSnapshot ?? game.grid;
  const displayMult = drag.gridSnapshot ? multiplierSnapshot : game.multipliers;

  renderer.render(
    displayGrid,
    game.nextTile,
    game.status === 'ended',
    anim,
    drag.phase === 'dragging' || drag.phase === 'snapping' ? drag : null,
    gameOverData,
    game.score,
    null, // no tutorial
    null, // no mix state
    displayMult,
    game.queue,
  );

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
