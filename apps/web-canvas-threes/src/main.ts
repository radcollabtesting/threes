/**
 * Entry point for the Threes web canvas app.
 *
 * Reads configuration from URL query params:
 *   ?seed=123       — RNG seed (default: random)
 *   ?fixture=1      — enable fixture mode (design reference board)
 *   ?strategy=progressive — next-tile strategy (all produce R1 now)
 *   ?score=1        — enable scoring
 *
 * Keyboard: Arrow keys to move (instant), R to restart.
 * Touch/mouse: drag to preview, release past 50% to commit.
 */

import { ThreesGame, cloneGrid, scoreGridWithMultipliers, tileHex, type Direction, type MoveEvent } from '@threes/game-logic';
import { Renderer } from './renderer';
import type { GameOverData, TutorialRenderInfo } from './renderer';
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
import { playMergeSound } from './audio';
import {
  createTutorialState,
  tutorialMove,
  tutorialHeader,
  tutorialShowBorder,
  tutorialShowNextTile,
  tutorialShowContinue,
  type TutorialState,
} from './tutorial';

/* ── Parse query-param config ──────────────────────────── */

const params = new URLSearchParams(window.location.search);

const seed = parseInt(params.get('seed') ?? String(Math.floor(Math.random() * 2147483647)), 10);
const fixtureMode = params.get('fixture') === '1';
const nextTileStrategy = (params.get('strategy') ?? 'progressive') as 'bag' | 'random' | 'progressive';
const scoringEnabled = params.get('score') !== '0'; // scoring on by default

/* ── Bootstrap ─────────────────────────────────────────── */

const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const anim: AnimState = createAnimState();
const drag: DragState = createDragState();

let game = new ThreesGame({ seed, fixtureMode, nextTileStrategy, scoringEnabled });
let gameOverData: GameOverData | null = null;
let tutorial: TutorialState | null = null;

function onGameOver(): void {
  const finalScore = scoreGridWithMultipliers(game.grid, game.multipliers);
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

/* ── Tutorial ──────────────────────────────────────────── */

const tutorialBtn = document.getElementById('tutorial-btn') as HTMLButtonElement;

function startTutorial(): void {
  tutorial = createTutorialState();
  resetDrag(drag);
  gameOverData = null;
  tutorialBtn.style.display = 'none';
}

function endTutorial(): void {
  tutorial = null;
  game.restart();
  resetDrag(drag);
  gameOverData = null;
  tutorialBtn.style.display = '';
  localStorage.setItem('tutorialComplete', '1');
}

tutorialBtn.addEventListener('click', startTutorial);

// Auto-start tutorial on first visit
if (!localStorage.getItem('tutorialComplete')) {
  startTutorial();
}

/* ── Input handlers ────────────────────────────────────── */

function handleInstantMove(direction: Direction): void {
  if (drag.phase !== 'idle') return;

  if (tutorial) {
    const oldNext = tutorial.nextTile;
    const success = tutorialMove(tutorial, direction);
    if (success) {
      triggerMoveAnimations(tutorial.lastMoveEvents, anim, direction);
      if (tutorialShowNextTile(tutorial)) {
        triggerNextTileAnim(anim, oldNext, tutorial.nextTile);
      }
      playMergeSoundsFromEvents(tutorial.lastMoveEvents);
    } else {
      triggerShake(anim);
    }
    return;
  }

  if (game.status === 'ended') return;

  const oldNext = game.nextTile;
  const success = game.move(direction);
  if (success) {
    triggerMoveAnimations(game.lastMoveEvents, anim, direction);
    triggerNextTileAnim(anim, oldNext, game.nextTile);
    playMergeSoundsFromEvents(game.lastMoveEvents);
    if ((game.status as string) === 'ended') onGameOver();
  } else {
    triggerShake(anim);
  }
}

function handleNewGame(): void {
  if (tutorial) return;
  game.restart();
  resetDrag(drag);
  gameOverData = null;
}

function handleDragStart(x: number, y: number): void {
  if (drag.phase !== 'idle') return;

  if (tutorial) {
    drag.phase = 'pending';
    drag.startX = x;
    drag.startY = y;
    drag.currentX = x;
    drag.currentY = y;
    drag.gridSnapshot = cloneGrid(tutorial.grid);
    return;
  }

  if (game.status === 'ended') return;

  drag.phase = 'pending';
  drag.startX = x;
  drag.startY = y;
  drag.currentX = x;
  drag.currentY = y;
  drag.gridSnapshot = cloneGrid(game.grid);
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
  // "New Game" button (game-over overlay)
  const newGameBounds = renderer.newGameButtonBounds;
  if (newGameBounds &&
    e.clientX >= newGameBounds.x && e.clientX <= newGameBounds.x + newGameBounds.w &&
    e.clientY >= newGameBounds.y && e.clientY <= newGameBounds.y + newGameBounds.h
  ) {
    handleNewGame();
    return;
  }

  // Tutorial "Continue" button
  const contBounds = renderer.continueButtonBounds;
  if (contBounds &&
    e.clientX >= contBounds.x && e.clientX <= contBounds.x + contBounds.w &&
    e.clientY >= contBounds.y && e.clientY <= contBounds.y + contBounds.h
  ) {
    endTutorial();
    return;
  }
});

/* ── Color blind mode toggle (persisted to localStorage) ── */

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

/* ── Dark / Light mode toggle (persisted to localStorage) ── */

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

  // Snap animation (during snapping phase)
  if (drag.phase === 'snapping') {
    const still = updateSnap(drag, dt);
    if (!still) {
      if (drag.snapTarget === 1.0) {
        const direction = drag.direction!;

        if (tutorial) {
          const oldNext = tutorial.nextTile;
          resetDrag(drag);
          tutorialMove(tutorial, direction);
          triggerSpawnOnly(tutorial.lastMoveEvents, anim, direction);
          if (tutorialShowNextTile(tutorial)) {
            triggerNextTileAnim(anim, oldNext, tutorial.nextTile);
          }
          playMergeSoundsFromEvents(tutorial.lastMoveEvents);
        } else {
          const oldNext = game.nextTile;
          resetDrag(drag);
          game.move(direction);
          triggerSpawnOnly(game.lastMoveEvents, anim, direction);
          triggerNextTileAnim(anim, oldNext, game.nextTile);
          playMergeSoundsFromEvents(game.lastMoveEvents);
          if (game.status === 'ended') onGameOver();
        }
      } else {
        const wasInvalid = drag.preview && !drag.preview.valid;
        resetDrag(drag);
        if (wasInvalid) triggerShake(anim);
      }
    }
  }

  // Standard animations
  updateAnimations(anim, dt);

  // Choose which grid/state to render
  if (tutorial) {
    const displayGrid = drag.gridSnapshot ?? tutorial.grid;
    const showNext = tutorialShowNextTile(tutorial);
    const tutInfo: TutorialRenderInfo = {
      headerText: tutorialHeader(tutorial),
      showBorder: tutorialShowBorder(tutorial),
      hideNextTile: !showNext,
      showContinue: tutorialShowContinue(tutorial),
    };

    renderer.render(
      displayGrid,
      tutorial.nextTile,
      false,
      anim,
      drag.phase === 'dragging' || drag.phase === 'snapping' ? drag : null,
      null,
      undefined,
      tutInfo,
    );
  } else {
    const displayGrid = drag.gridSnapshot ?? game.grid;

    renderer.render(
      displayGrid,
      game.nextTile,
      game.status === 'ended',
      anim,
      drag.phase === 'dragging' || drag.phase === 'snapping' ? drag : null,
      gameOverData,
      game.score,
    );
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
