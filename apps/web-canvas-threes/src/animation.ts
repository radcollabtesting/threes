/**
 * Animation state management for the Threes canvas renderer.
 *
 * Each move produces a set of events (slide, merge, spawn) that are
 * converted into time-based animations. The game loop calls updateAnimations()
 * each frame, and the renderer reads the current AnimState to interpolate
 * positions, scale, and opacity.
 */

import { ANIMATION } from '@threes/design-tokens';
import type { MoveEvent, Direction } from '@threes/game-logic';

/* ── Types ─────────────────────────────────────────────── */

export interface SlideAnim {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  value: number;
  progress: number; // 0 → 1
}

export interface MergeAnim {
  value: number;
  progress: number;
}

export interface SpawnAnim {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  value: number;
  progress: number;
}

export interface NextTileAnim {
  active: boolean;
  progress: number; // 0 → 1 (first half = fade out old, second half = fade in new)
  oldValue: number;
  newValue: number;
}

export interface RippleAnim {
  row: number;
  col: number;
  progress: number; // 0 → 1
  color: string;    // result tile color
}

export interface MixSlideAnim {
  src1Row: number; src1Col: number; src1Value: number;
  src2Row: number; src2Col: number; src2Value: number;
  targetRow: number; targetCol: number;
  progress: number; // 0 → 1
}

export interface SplitParticle {
  /** Grid row/col where the split happened */
  fromRow: number;
  fromCol: number;
  /** The tile color value of this particle */
  value: number;
  /** 0 → 1 */
  progress: number;
}

export interface AnimState {
  slides: Map<string, SlideAnim>;
  merges: Map<string, MergeAnim>;
  spawns: Map<string, SpawnAnim>;
  shake: { progress: number; active: boolean };
  nextTile: NextTileAnim;
  ripple: RippleAnim | null;
  mixSlide: MixSlideAnim | null;
  splitParticles: SplitParticle[];
}

/* ── Factory ───────────────────────────────────────────── */

export function createAnimState(): AnimState {
  return {
    slides: new Map(),
    merges: new Map(),
    spawns: new Map(),
    shake: { progress: 1, active: false },
    nextTile: { active: false, progress: 1, oldValue: 0, newValue: 0 },
    ripple: null,
    mixSlide: null,
    splitParticles: [],
  };
}

/* ── Trigger animations from move events ───────────────── */

export function triggerMoveAnimations(events: MoveEvent[], anim: AnimState, direction: Direction): void {
  anim.slides.clear();
  anim.merges.clear();
  anim.spawns.clear();

  const [dr, dc] = spawnFromOffset(direction);

  for (const ev of events) {
    const key = `${ev.to.row},${ev.to.col}`;

    if (ev.type === 'move' && ev.from) {
      anim.slides.set(key, {
        fromRow: ev.from.row,
        fromCol: ev.from.col,
        toRow: ev.to.row,
        toCol: ev.to.col,
        value: ev.value,
        progress: 0,
      });
    }

    if (ev.type === 'merge' && ev.from) {
      // Slide first, then pop
      anim.slides.set(key, {
        fromRow: ev.from.row,
        fromCol: ev.from.col,
        toRow: ev.to.row,
        toCol: ev.to.col,
        value: ev.value,
        progress: 0,
      });
      anim.merges.set(key, { value: ev.value, progress: 0 });
    }

    if (ev.type === 'spawn') {
      anim.spawns.set(key, {
        fromRow: ev.to.row + dr,
        fromCol: ev.to.col + dc,
        toRow: ev.to.row,
        toCol: ev.to.col,
        value: ev.value,
        progress: 0,
      });
    }
  }
}

/**
 * Triggers only spawn animations (used after drag-commit, where
 * slide/merge were already shown visually during the drag).
 */
export function triggerSpawnOnly(events: MoveEvent[], anim: AnimState, direction: Direction): void {
  anim.slides.clear();
  anim.merges.clear();
  anim.spawns.clear();

  const [dr, dc] = spawnFromOffset(direction);

  for (const ev of events) {
    if (ev.type === 'spawn') {
      const key = `${ev.to.row},${ev.to.col}`;
      anim.spawns.set(key, {
        fromRow: ev.to.row + dr,
        fromCol: ev.to.col + dc,
        toRow: ev.to.row,
        toCol: ev.to.col,
        value: ev.value,
        progress: 0,
      });
    }
  }
}

/** Duration for the next-tile fade-out + fade-in (ms) */
const NEXT_TILE_DURATION = 200;

/** Triggers the next-tile preview crossfade (old fades out, new fades in). */
export function triggerNextTileAnim(anim: AnimState, oldValue: number, newValue: number): void {
  anim.nextTile = { active: true, progress: 0, oldValue, newValue };
}

/** Duration for the catalyst mix ripple effect (ms) */
const RIPPLE_DURATION = 400;

/** Duration for the catalyst mix slide-in effect (ms) */
const MIX_SLIDE_DURATION = 200;

/** Triggers a ripple animation at the given grid position (catalyst mix). */
export function triggerRipple(anim: AnimState, row: number, col: number, color: string): void {
  anim.ripple = { row, col, progress: 0, color };
}

/** Triggers the mix slide animation (source tiles slide into gray target). */
export function triggerMixSlide(
  anim: AnimState,
  src1Row: number, src1Col: number, src1Value: number,
  src2Row: number, src2Col: number, src2Value: number,
  targetRow: number, targetCol: number,
): void {
  anim.mixSlide = {
    src1Row, src1Col, src1Value,
    src2Row, src2Col, src2Value,
    targetRow, targetCol,
    progress: 0,
  };
}

/** Duration for split particles flying to queue (ms) */
const SPLIT_PARTICLE_DURATION = 500;

/**
 * Triggers split particle animations — colored pieces fly from the
 * merge point toward the queue area to show what was produced.
 */
export function triggerSplitParticles(
  anim: AnimState,
  mergeRow: number,
  mergeCol: number,
  outputValues: number[],
): void {
  for (const value of outputValues) {
    anim.splitParticles.push({
      fromRow: mergeRow,
      fromCol: mergeCol,
      value,
      progress: 0,
    });
  }
}

/** Triggers the invalid-move shake. Respects prefers-reduced-motion. */
export function triggerShake(anim: AnimState): void {
  if (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // accessibility: skip shake
  }
  anim.shake = { progress: 0, active: true };
}

/* ── Per-frame update ──────────────────────────────────── */

/**
 * Advances all active animations by dt milliseconds.
 * @returns true if any animation is still in progress.
 */
export function updateAnimations(anim: AnimState, dt: number): boolean {
  let active = false;

  // Slides
  for (const [, s] of anim.slides) {
    if (s.progress < 1) {
      s.progress = Math.min(1, s.progress + dt / ANIMATION.moveDuration);
      active = true;
    }
  }

  // Merges (start after their corresponding slide finishes)
  for (const [key, m] of anim.merges) {
    const slide = anim.slides.get(key);
    if (slide && slide.progress < 1) {
      active = true;
      continue; // wait for slide
    }
    if (m.progress < 1) {
      m.progress = Math.min(1, m.progress + dt / ANIMATION.mergeScaleDuration);
      active = true;
    }
  }

  // Spawns + next-tile crossfade (start after all slides finish)
  const allSlidesDone = ![...anim.slides.values()].some(s => s.progress < 1);
  if (allSlidesDone) {
    for (const [, sp] of anim.spawns) {
      if (sp.progress < 1) {
        sp.progress = Math.min(1, sp.progress + dt / ANIMATION.spawnDuration);
        active = true;
      }
    }
    if (anim.nextTile.active && anim.nextTile.progress < 1) {
      anim.nextTile.progress = Math.min(1, anim.nextTile.progress + dt / NEXT_TILE_DURATION);
      active = true;
    }
  } else {
    // Spawns + next-tile waiting for slides
    for (const [, sp] of anim.spawns) {
      if (sp.progress < 1) active = true;
    }
    if (anim.nextTile.active && anim.nextTile.progress < 1) active = true;
  }

  // Shake
  if (anim.shake.active && anim.shake.progress < 1) {
    anim.shake.progress = Math.min(1, anim.shake.progress + dt / ANIMATION.shakeDuration);
    active = true;
  }

  // Split particles (start after merges finish)
  const allMergesDone = ![...anim.merges.values()].some(m => m.progress < 1);
  if (allMergesDone && allSlidesDone) {
    for (let i = anim.splitParticles.length - 1; i >= 0; i--) {
      const p = anim.splitParticles[i];
      if (p.progress < 1) {
        p.progress = Math.min(1, p.progress + dt / SPLIT_PARTICLE_DURATION);
        active = true;
      }
      if (p.progress >= 1) {
        anim.splitParticles.splice(i, 1);
      }
    }
  } else if (anim.splitParticles.length > 0) {
    active = true; // waiting for merges to finish
  }

  // Mix slide (catalyst mix source tiles sliding into gray)
  if (anim.mixSlide && anim.mixSlide.progress < 1) {
    anim.mixSlide.progress = Math.min(1, anim.mixSlide.progress + dt / MIX_SLIDE_DURATION);
    active = true;
  }

  // Ripple (catalyst mix)
  if (anim.ripple && anim.ripple.progress < 1) {
    anim.ripple.progress = Math.min(1, anim.ripple.progress + dt / RIPPLE_DURATION);
    active = true;
    if (anim.ripple.progress >= 1) anim.ripple = null;
  }

  return active;
}

/**
 * Returns [dRow, dCol] offset for where a spawn tile slides in from.
 * Spawn enters from the opposite edge of the swipe, so the "from"
 * position is one cell beyond the board edge in that direction.
 *
 * E.g. swipe left → spawn on right edge → tile slides in from col+1.
 */
function spawnFromOffset(direction: Direction): [number, number] {
  switch (direction) {
    case 'left':  return [0, 1];   // enters from right
    case 'right': return [0, -1];  // enters from left
    case 'up':    return [1, 0];   // enters from bottom
    case 'down':  return [-1, 0];  // enters from top
  }
}
