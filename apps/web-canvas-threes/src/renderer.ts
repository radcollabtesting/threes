/**
 * Canvas renderer for the Threes game.
 *
 * Draws the board, tiles, next-tile preview, and game-over overlay.
 * Supports two tile-drawing modes:
 *   1. Static: tiles at grid positions with slide/merge/spawn animations
 *   2. Drag: tiles at interpolated positions following pointer progress
 */

import type { CellValue, Grid, Direction } from '@threes/game-logic';
import { COLORS, SIZES, BOARD, tileColors, ANIMATION } from '@threes/design-tokens';
import type { AnimState } from './animation';
import type { DragState, TilePreview } from './drag';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private _scale = 1;
  private _boardX = 0;
  private _boardY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  /** Current uniform scale factor (needed by drag progress calculation) */
  get currentScale(): number {
    return this._scale;
  }

  /** Recalculates canvas size and scale factor (call on window resize) */
  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    this.canvas.width = vw * dpr;
    this.canvas.height = vh * dpr;
    this.canvas.style.width = `${vw}px`;
    this.canvas.style.height = `${vh}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const neededH =
      SIZES.boardTopOffset +
      BOARD.height +
      SIZES.nextTileGapFromBoard +
      SIZES.tileHeight +
      SIZES.nextLabelGap +
      SIZES.nextLabelFontSize +
      30;
    const neededW = BOARD.width + 40;

    this._scale = Math.min(vw / neededW, vh / neededH, 2.5);
    this._boardX = (vw - BOARD.width * this._scale) / 2;
    this._boardY = SIZES.boardTopOffset * this._scale;
  }

  /**
   * Main render pass — call once per animation frame.
   * @param drag  Pass the active DragState during dragging/snapping, or null.
   */
  render(
    grid: Grid,
    nextTile: CellValue,
    gameOver: boolean,
    anim: AnimState,
    drag?: DragState | null,
  ): void {
    const ctx = this.ctx;
    const s = this._scale;
    const vw = this.canvas.width / (window.devicePixelRatio || 1);
    const vh = this.canvas.height / (window.devicePixelRatio || 1);

    // ── Background ────────────────────────────────────────
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, vw, vh);

    // ── Board shake offset ────────────────────────────────
    let shakeX = 0;
    if (anim.shake.active && anim.shake.progress < 1) {
      const t = anim.shake.progress;
      shakeX = Math.sin(t * Math.PI * 4) * ANIMATION.shakeAmplitude * (1 - t) * s;
    }

    const bx = this._boardX + shakeX;
    const by = this._boardY;
    const tw = SIZES.tileWidth * s;
    const th = SIZES.tileHeight * s;
    const gx = SIZES.gapX * s;
    const gy = SIZES.gapY * s;
    const br = SIZES.tileBorderRadius * s;

    // ── Empty cell slots ──────────────────────────────────
    for (let r = 0; r < SIZES.gridSize; r++) {
      for (let c = 0; c < SIZES.gridSize; c++) {
        const x = bx + c * (tw + gx);
        const y = by + r * (th + gy);
        this.roundRect(x, y, tw, th, br, COLORS.emptyCellSlot);
      }
    }

    // ── Tiles ─────────────────────────────────────────────
    const isDragActive = drag && drag.preview &&
      (drag.phase === 'dragging' || drag.phase === 'snapping');

    if (isDragActive) {
      this.drawDragTiles(drag, bx, by, tw, th, gx, gy, br, s);
    } else {
      this.drawStaticTiles(grid, anim, bx, by, tw, th, gx, gy, br, s);
    }

    // ── Next tile preview ─────────────────────────────────
    const nextY = by + BOARD.height * s + SIZES.nextTileGapFromBoard * s;
    const nextX = bx + (BOARD.width * s - tw) / 2;

    const nt = anim.nextTile;
    if (nt.active && nt.progress < 1) {
      const p = nt.progress;
      if (p < 0.5) {
        // Fade out old value
        const alpha = 1 - p / 0.5;
        if (nt.oldValue > 0) {
          this.drawTile(nextX, nextY, tw, th, br, s, nt.oldValue, 1, alpha);
        }
      } else {
        // Fade in new value
        const alpha = (p - 0.5) / 0.5;
        if (nt.newValue > 0) {
          this.drawTile(nextX, nextY, tw, th, br, s, nt.newValue, 1, alpha);
        }
      }
    } else if (nextTile > 0) {
      this.drawTile(nextX, nextY, tw, th, br, s, nextTile, 1, 1);
    }

    // ── "next" label ──────────────────────────────────────
    const labelY = nextY + th + SIZES.nextLabelGap * s;
    ctx.fillStyle = COLORS.nextLabelText;
    ctx.font = `${SIZES.nextLabelFontSize * s}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('next', nextX + tw / 2, labelY);

    // ── Game-over overlay ─────────────────────────────────
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, vw, vh);

      const cx = vw / 2;
      const cy = vh / 2;

      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${32 * s}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Game Over', cx, cy - 20 * s);

      ctx.font = `${16 * s}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillText('Press R or tap to restart', cx, cy + 24 * s);
    }
  }

  /* ── Tile drawing modes ──────────────────────────────── */

  /**
   * Static tile drawing: used for keyboard moves and idle state.
   * Reads from the live grid and applies slide/merge/spawn animations.
   */
  private drawStaticTiles(
    grid: Grid, anim: AnimState,
    bx: number, by: number,
    tw: number, th: number,
    gx: number, gy: number,
    br: number, s: number,
  ): void {
    for (let r = 0; r < SIZES.gridSize; r++) {
      for (let c = 0; c < SIZES.gridSize; c++) {
        const val = grid[r][c];
        if (val === 0) continue;

        const key = `${r},${c}`;
        let x = bx + c * (tw + gx);
        let y = by + r * (th + gy);
        let tileScale = 1;
        let alpha = 1;

        // Slide animation
        const slide = anim.slides.get(key);
        if (slide && slide.progress < 1) {
          const p = easeOut(slide.progress);
          const fx = bx + slide.fromCol * (tw + gx);
          const fy = by + slide.fromRow * (th + gy);
          const tx = bx + slide.toCol * (tw + gx);
          const ty = by + slide.toRow * (th + gy);
          x = fx + (tx - fx) * p;
          y = fy + (ty - fy) * p;
        }

        // Merge scale pop
        const merge = anim.merges.get(key);
        if (merge && merge.progress < 1) {
          const p = merge.progress;
          const peak = ANIMATION.mergeScaleUp;
          tileScale = p < 0.5
            ? 1 + (peak - 1) * (p / 0.5)
            : peak - (peak - 1) * ((p - 0.5) / 0.5);
        }

        // Spawn slide in from edge
        const spawn = anim.spawns.get(key);
        if (spawn && spawn.progress < 1) {
          const p = easeOut(spawn.progress);
          const fx = bx + spawn.fromCol * (tw + gx);
          const fy = by + spawn.fromRow * (th + gy);
          const tx = bx + spawn.toCol * (tw + gx);
          const ty = by + spawn.toRow * (th + gy);
          x = fx + (tx - fx) * p;
          y = fy + (ty - fy) * p;
        }

        this.drawTile(x, y, tw, th, br, s, val, tileScale, alpha);
      }
    }
  }

  /**
   * Drag tile drawing: tiles follow the pointer at interpolated positions.
   *
   * Two sub-modes:
   *   - Valid move: non-moving tiles drawn first (behind), moving tiles
   *     drawn on top (so merge overlap looks correct).
   *   - Invalid move: all tiles shift uniformly by a small rubber-band offset.
   */
  private drawDragTiles(
    drag: DragState,
    bx: number, by: number,
    tw: number, th: number,
    gx: number, gy: number,
    br: number, s: number,
  ): void {
    const preview = drag.preview!;
    const progress = drag.progress;

    if (!preview.valid) {
      // ── Invalid move: rubber-band all tiles uniformly ───
      const [dr, dc] = directionOffset(preview.direction);
      const offsetX = dc * progress * (tw + gx);
      const offsetY = dr * progress * (th + gy);

      for (const tp of preview.tiles.values()) {
        const x = bx + tp.fromCol * (tw + gx) + offsetX;
        const y = by + tp.fromRow * (th + gy) + offsetY;
        this.drawTile(x, y, tw, th, br, s, tp.value, 1, 1);
      }
      return;
    }

    // ── Valid move: two-layer z-ordering ──────────────────
    const nonMoving: TilePreview[] = [];
    const moving: TilePreview[] = [];

    for (const tp of preview.tiles.values()) {
      (tp.moves ? moving : nonMoving).push(tp);
    }

    // Layer 1: non-moving tiles (behind — includes merge targets)
    for (const tp of nonMoving) {
      const x = bx + tp.fromCol * (tw + gx);
      const y = by + tp.fromRow * (th + gy);
      this.drawTile(x, y, tw, th, br, s, tp.value, 1, 1);
    }

    // Layer 2: moving tiles (on top — they slide over merge targets)
    for (const tp of moving) {
      const fromX = bx + tp.fromCol * (tw + gx);
      const fromY = by + tp.fromRow * (th + gy);
      const toX = bx + tp.toCol * (tw + gx);
      const toY = by + tp.toRow * (th + gy);

      const x = fromX + (toX - fromX) * progress;
      const y = fromY + (toY - fromY) * progress;

      this.drawTile(x, y, tw, th, br, s, tp.value, 1, 1);
    }
  }

  /* ── Primitive helpers ───────────────────────────────── */

  private drawTile(
    x: number, y: number,
    w: number, h: number,
    r: number, s: number,
    value: CellValue,
    tileScale: number,
    alpha: number,
  ): void {
    const ctx = this.ctx;
    const { fill, text } = tileColors(value);

    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;

    if (tileScale !== 1) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.translate(cx, cy);
      ctx.scale(tileScale, tileScale);
      ctx.translate(-cx, -cy);
    }

    this.roundRect(x, y, w, h, r, fill);

    const fontSize = value >= 100
      ? SIZES.tileFontSizeLarge * s
      : SIZES.tileFontSize * s;
    ctx.fillStyle = text;
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x + w / 2, y + h / 2);

    ctx.restore();
  }

  private roundRect(
    x: number, y: number,
    w: number, h: number,
    r: number,
    fill: string,
  ): void {
    const ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }
}

/* ── Utilities ─────────────────────────────────────────── */

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** Converts a Direction to [dRow, dCol] for rubber-band offset */
function directionOffset(direction: Direction): [number, number] {
  switch (direction) {
    case 'left':  return [0, -1];
    case 'right': return [0, 1];
    case 'up':    return [-1, 0];
    case 'down':  return [1, 0];
  }
}
