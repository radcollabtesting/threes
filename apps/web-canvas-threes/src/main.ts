/**
 * Entry point for the Threes web canvas app.
 *
 * Reads configuration from URL query params:
 *   ?seed=123       — RNG seed (default: 42)
 *   ?fixture=1      — enable fixture mode (design reference board)
 *   ?strategy=progressive — next-tile strategy: "bag" | "random" | "progressive"
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
  triggerRipple,
  triggerMixSlide,
  updateAnimations,
  type AnimState,
} from './animation';
import {
  createMixState,
  startMix,
  mixSelectTile,
  confirmMix,
  cancelMix,
  type MixState,
} from './mix-state';
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
const mixState: MixState = createMixState();
let multiplierSnapshot: number[][] | null = null;

function onGameOver(): void {
  const finalScore = scoreGridWithMultipliers(game.grid, game.multipliers);
  const { scores, newIndex } = saveScore(finalScore);
  // Sort scores descending; track the current game's entry by reference
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
  cancelMix(mixState);
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

/**
 * Instant move from keyboard. Blocked during drag.
 */
function handleInstantMove(direction: Direction): void {
  if (drag.phase !== 'idle') return;
  if (mixState.phase !== 'idle') return; // block moves during mix selection
  if (anim.mixSlide) return; // block during mix animation

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
  if (tutorial) return; // ignore R key during tutorial
  game.restart();
  resetDrag(drag);
  cancelMix(mixState);
  gameOverData = null;
}

/**
 * Pointer down — snapshot the grid and enter pending state.
 */
function handleDragStart(x: number, y: number): void {
  if (drag.phase !== 'idle') return;
  if (mixState.phase !== 'idle') return; // block drag during mix selection
  if (anim.mixSlide) return; // block during mix animation

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
  multiplierSnapshot = game.multipliers;
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
  onEscape: () => cancelMix(mixState),
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

  // Mix mode interactions (not during tutorial or game over)
  if (!tutorial && game.status !== 'ended') {
    // If in mix selection/preview mode, handle interactions
    if (mixState.phase !== 'idle') {
      // Check Confirm button (preview phase)
      const confirmBounds = renderer.confirmButtonBounds;
      if (confirmBounds &&
        e.clientX >= confirmBounds.x && e.clientX <= confirmBounds.x + confirmBounds.w &&
        e.clientY >= confirmBounds.y && e.clientY <= confirmBounds.y + confirmBounds.h
      ) {
        const mixData = confirmMix(mixState);
        if (mixData) {
          // Capture source tile values before the mix changes the grid
          const gridSnap = game.grid;
          const src1Val = gridSnap[mixData.src1.row][mixData.src1.col];
          const src2Val = gridSnap[mixData.src2.row][mixData.src2.col];

          const success = game.catalystMix(mixData.grayPos, mixData.src1, mixData.src2);
          if (success) {
            triggerMixSlide(anim,
              mixData.src1.row, mixData.src1.col, src1Val,
              mixData.src2.row, mixData.src2.col, src2Val,
              mixData.grayPos.row, mixData.grayPos.col,
            );
            playMergeSound(3);
          }
        }
        return;
      }

      // Check Cancel button (preview phase)
      const cancelBounds = renderer.cancelButtonBounds;
      if (cancelBounds &&
        e.clientX >= cancelBounds.x && e.clientX <= cancelBounds.x + cancelBounds.w &&
        e.clientY >= cancelBounds.y && e.clientY <= cancelBounds.y + cancelBounds.h
      ) {
        cancelMix(mixState);
        return;
      }

      // During preview phase, clicks on the board cancel
      if (mixState.phase === 'previewing') {
        cancelMix(mixState);
        return;
      }

      // During selection phases, handle tile taps
      const tilePos = renderer.hitTestGrid(e.clientX, e.clientY);
      if (tilePos) {
        mixSelectTile(mixState, game.grid, tilePos);
      } else {
        // Tapped outside the grid — cancel mix mode
        cancelMix(mixState);
      }
      return;
    }

    // Check for Mix button tap (enters mix mode)
    const mixBtnPos = renderer.hitTestMixButton(e.clientX, e.clientY);
    if (mixBtnPos && !anim.mixSlide) {
      startMix(mixState, game.grid, mixBtnPos);
      return;
    }
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

// Determine initial state: stored preference > device preference
const storedTheme = localStorage.getItem('darkMode');
if (storedTheme !== null) {
  applyDarkMode(storedTheme === '1');
} else {
  // Default to device's color scheme preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyDarkMode(prefersDark);
}

themeCheck.addEventListener('change', () => {
  applyDarkMode(themeCheck.checked);
  localStorage.setItem('darkMode', themeCheck.checked ? '1' : '0');
});

// Listen for device preference changes (only if user hasn't manually overridden)
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
      // Snap arrived at target
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
          // Commit the move
          const oldNext = game.nextTile;
          resetDrag(drag);
          game.move(direction);
          triggerSpawnOnly(game.lastMoveEvents, anim, direction);
          triggerNextTileAnim(anim, oldNext, game.nextTile);
          playMergeSoundsFromEvents(game.lastMoveEvents);
          if (game.status === 'ended') onGameOver();
        }
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

  // Mix slide completed → trigger ripple + merge pop
  if (anim.mixSlide && anim.mixSlide.progress >= 1) {
    const ms = anim.mixSlide;
    const resultVal = game.grid[ms.targetRow][ms.targetCol];
    triggerRipple(anim, ms.targetRow, ms.targetCol, tileHex(resultVal));
    anim.merges.set(`${ms.targetRow},${ms.targetCol}`, { value: resultVal, progress: 0 });
    anim.mixSlide = null;
  }

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
      false, // never game over in tutorial
      anim,
      drag.phase === 'dragging' || drag.phase === 'snapping' ? drag : null,
      null,
      undefined,
      tutInfo,
    );
  } else {
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
      null,
      mixState,
      displayMult,
    );
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
