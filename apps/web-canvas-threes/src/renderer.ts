/**
 * Canvas renderer for the color mixing game.
 *
 * Draws the board, tiles, next-tile preview, score, and game-over overlay.
 * Tile colors are computed dynamically from the color encoding system.
 */

import { scoreTile, tileHex, tileTextColor, tileLabel, tileDisplayDots, getMergePartners, encodeTile, canMerge, tileColorIndex, mergeResult, GRAY_IDX, type CellValue, type Grid, type Direction, type Position } from '@threes/game-logic';
import { COLORS, SIZES, BOARD, ANIMATION, BUTTON, SCORE_LIST } from '@threes/design-tokens';
import type { AnimState } from './animation';
import type { DragState, TilePreview } from './drag';
import type { ScoreEntry } from './score-history';
import type { MixState } from './mix-state';

export interface GameOverData {
  currentScore: number;
  scores: ScoreEntry[];
  currentScoreIndex: number;
}

export interface TutorialRenderInfo {
  headerText: string;
  showBorder: boolean;
  hideNextTile: boolean;
  showContinue: boolean;
}

interface MergeIndicator {
  colorIndex: number;
  blocked: boolean;
}

interface MergeIndicatorSet {
  left: MergeIndicator[];
  right: MergeIndicator[];
  top: MergeIndicator[];
  bottom: MergeIndicator[];
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private _scale = 1;
  private _boardX = 0;
  private _boardY = 0;
  private _newGameBtnBounds: { x: number; y: number; w: number; h: number } | null = null;
  private _continueBtnBounds: { x: number; y: number; w: number; h: number } | null = null;
  /** Mix button bounds keyed by "row,col" */
  private _mixBtnBounds: Map<string, { x: number; y: number; w: number; h: number }> = new Map();

  /** When true, color letter labels are shown on tiles. */
  colorBlindMode = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  /** Current uniform scale factor (needed by drag progress calculation) */
  get currentScale(): number {
    return this._scale;
  }

  /** Returns the "New Game" button bounds in CSS px, or null if not rendered. */
  get newGameButtonBounds(): { x: number; y: number; w: number; h: number } | null {
    return this._newGameBtnBounds;
  }

  /** Returns the tutorial "Continue" button bounds in CSS px, or null if not rendered. */
  get continueButtonBounds(): { x: number; y: number; w: number; h: number } | null {
    return this._continueBtnBounds;
  }

  /** Returns mix button bounds map for hit testing */
  get mixButtonBounds(): Map<string, { x: number; y: number; w: number; h: number }> {
    return this._mixBtnBounds;
  }

  /**
   * Hit-test a CSS coordinate against the grid, returning the cell position
   * or null if outside the board.
   */
  hitTestGrid(clientX: number, clientY: number): Position | null {
    const s = this._scale;
    const bx = this._boardX;
    const by = this._boardY;
    const tw = SIZES.tileWidth * s;
    const th = SIZES.tileHeight * s;
    const gx = SIZES.gapX * s;
    const gy = SIZES.gapY * s;

    for (let r = 0; r < SIZES.gridSize; r++) {
      for (let c = 0; c < SIZES.gridSize; c++) {
        const x = bx + c * (tw + gx);
        const y = by + r * (th + gy);
        if (clientX >= x && clientX <= x + tw && clientY >= y && clientY <= y + th) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  /**
   * Hit-test a CSS coordinate against any visible Mix button.
   * Returns the Gray tile's position or null.
   */
  hitTestMixButton(clientX: number, clientY: number): Position | null {
    for (const [key, bounds] of this._mixBtnBounds) {
      if (clientX >= bounds.x && clientX <= bounds.x + bounds.w &&
          clientY >= bounds.y && clientY <= bounds.y + bounds.h) {
        const [r, c] = key.split(',').map(Number);
        return { row: r, col: c };
      }
    }
    return null;
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
    gameOverData?: GameOverData | null,
    currentScore?: number,
    tutorialInfo?: TutorialRenderInfo | null,
    mixState?: MixState | null,
  ): void {
    const ctx = this.ctx;
    const s = this._scale;
    const vw = this.canvas.width / (window.devicePixelRatio || 1);
    const vh = this.canvas.height / (window.devicePixelRatio || 1);

    // ── Background ────────────────────────────────────────
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, vw, vh);

    // ── Tutorial header or score display ──────────────────
    if (tutorialInfo) {
      const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${16 * s}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(tutorialInfo.headerText, vw / 2, this._boardY - 12 * s);
    } else if (currentScore !== undefined) {
      const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = COLORS.scoreText;
      ctx.font = `bold ${20 * s}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Score: ${currentScore}`, vw / 2, 30 * s);
    }

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

    // ── Tutorial board border (behind cells) ────────────
    if (tutorialInfo && tutorialInfo.showBorder) {
      const borderPad = 6 * s;
      const borderX = bx - borderPad;
      const borderY = by - borderPad;
      const borderW = BOARD.width * s + borderPad * 2;
      const borderH = BOARD.height * s + borderPad * 2;
      const borderR = br + 2 * s;
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(borderX + borderR, borderY);
      ctx.lineTo(borderX + borderW - borderR, borderY);
      ctx.quadraticCurveTo(borderX + borderW, borderY, borderX + borderW, borderY + borderR);
      ctx.lineTo(borderX + borderW, borderY + borderH - borderR);
      ctx.quadraticCurveTo(borderX + borderW, borderY + borderH, borderX + borderW - borderR, borderY + borderH);
      ctx.lineTo(borderX + borderR, borderY + borderH);
      ctx.quadraticCurveTo(borderX, borderY + borderH, borderX, borderY + borderH - borderR);
      ctx.lineTo(borderX, borderY + borderR);
      ctx.quadraticCurveTo(borderX, borderY, borderX + borderR, borderY);
      ctx.closePath();
      ctx.stroke();
    }

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

    // ── Mix mode UI ──────────────────────────────────────
    this._mixBtnBounds.clear();
    const mixActive = mixState && mixState.phase !== 'idle';

    if (!isDragActive && !gameOver && !tutorialInfo) {
      if (mixActive && mixState) {
        // Draw mix prompt text above board
        const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${16 * s}px ${font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(mixState.promptText, vw / 2, this._boardY - 12 * s);

        // Dim the entire board, then brighten valid targets
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, BOARD.width * s, BOARD.height * s);

        // Highlight Gray tile with pulsing border
        if (mixState.grayPos) {
          const gx2 = bx + mixState.grayPos.col * (tw + gx);
          const gy2 = by + mixState.grayPos.row * (th + gy);
          this.drawTile(gx2, gy2, tw, th, br, s, grid[mixState.grayPos.row][mixState.grayPos.col], 1, 0.6);
        }

        // Highlight first selected tile
        if (mixState.firstSelection) {
          const fx = bx + mixState.firstSelection.col * (tw + gx);
          const fy = by + mixState.firstSelection.row * (th + gy);
          const fv = grid[mixState.firstSelection.row][mixState.firstSelection.col];
          this.drawTile(fx, fy, tw, th, br, s, fv, 1, 1);
          // Green selection border
          ctx.strokeStyle = '#00FF88';
          ctx.lineWidth = 3 * s;
          ctx.beginPath();
          ctx.moveTo(fx + br, fy);
          ctx.lineTo(fx + tw - br, fy);
          ctx.quadraticCurveTo(fx + tw, fy, fx + tw, fy + br);
          ctx.lineTo(fx + tw, fy + th - br);
          ctx.quadraticCurveTo(fx + tw, fy + th, fx + tw - br, fy + th);
          ctx.lineTo(fx + br, fy + th);
          ctx.quadraticCurveTo(fx, fy + th, fx, fy + th - br);
          ctx.lineTo(fx, fy + br);
          ctx.quadraticCurveTo(fx, fy, fx + br, fy);
          ctx.closePath();
          ctx.stroke();
        }

        // Highlight valid targets with glowing border
        for (const target of mixState.validTargets) {
          const tx2 = bx + target.col * (tw + gx);
          const ty2 = by + target.row * (th + gy);
          const tv = grid[target.row][target.col];
          this.drawTile(tx2, ty2, tw, th, br, s, tv, 1, 1);
          // White pulsing border for valid targets
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 2 * s;
          ctx.beginPath();
          ctx.moveTo(tx2 + br, ty2);
          ctx.lineTo(tx2 + tw - br, ty2);
          ctx.quadraticCurveTo(tx2 + tw, ty2, tx2 + tw, ty2 + br);
          ctx.lineTo(tx2 + tw, ty2 + th - br);
          ctx.quadraticCurveTo(tx2 + tw, ty2 + th, tx2 + tw - br, ty2 + th);
          ctx.lineTo(tx2 + br, ty2 + th);
          ctx.quadraticCurveTo(tx2, ty2 + th, tx2, ty2 + th - br);
          ctx.lineTo(tx2, ty2 + br);
          ctx.quadraticCurveTo(tx2, ty2, tx2 + br, ty2);
          ctx.closePath();
          ctx.stroke();
        }
      } else {
        // Draw "Mix" buttons on Gray tiles (when not in mix mode)
        this.drawMixButtons(grid, bx, by, tw, th, gx, gy, br, s);
      }
    }

    // ── Ripple animation (catalyst mix) ─────────────────
    if (anim.ripple && anim.ripple.progress < 1) {
      const rp = anim.ripple;
      const rx = bx + rp.col * (tw + gx) + tw / 2;
      const ry = by + rp.row * (th + gy) + th / 2;
      const maxRadius = Math.max(tw, th) * 1.5;
      const radius = maxRadius * easeOut(rp.progress);
      const alpha = 1 - rp.progress;

      ctx.save();
      ctx.strokeStyle = rp.color;
      ctx.lineWidth = 3 * s;
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.arc(rx, ry, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Second smaller ring
      if (rp.progress > 0.1) {
        const r2 = maxRadius * easeOut(Math.max(0, rp.progress - 0.15));
        ctx.globalAlpha = alpha * 0.4;
        ctx.beginPath();
        ctx.arc(rx, ry, r2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Next tile preview ─────────────────────────────────
    const hideNextTile = tutorialInfo?.hideNextTile ?? false;

    if (!hideNextTile) {
      const nextY = by + BOARD.height * s + SIZES.nextTileGapFromBoard * s;
      const nextX = bx + (BOARD.width * s - tw) / 2;

      const nt = anim.nextTile;
      if (nt.active && nt.progress < 1) {
        const p = nt.progress;
        if (p < 0.5) {
          const alpha = 1 - p / 0.5;
          if (nt.oldValue > 0) {
            this.drawTile(nextX, nextY, tw, th, br, s, nt.oldValue, 1, alpha);
          }
        } else {
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
    }

    // ── Tutorial "Continue" button ──────────────────────
    this._continueBtnBounds = null;

    if (tutorialInfo && tutorialInfo.showContinue) {
      const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const contY = by + BOARD.height * s + SIZES.nextTileGapFromBoard * s;
      const btnW = BUTTON.width * s;
      const btnH = BUTTON.height * s;
      const btnX = vw / 2 - btnW / 2;
      const btnR = BUTTON.borderRadius * s;

      this.roundRect(btnX, contY, btnW, btnH, btnR, BUTTON.fill);
      ctx.fillStyle = BUTTON.text;
      ctx.font = `bold ${BUTTON.fontSize * s}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Continue', btnX + btnW / 2, contY + btnH / 2);

      this._continueBtnBounds = { x: btnX, y: contY, w: btnW, h: btnH };
    }

    // ── Game-over overlay ─────────────────────────────────
    this._newGameBtnBounds = null;

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, vw, vh);

      // ── Per-tile score labels ────────────────────────────
      const scoreFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let r = 0; r < SIZES.gridSize; r++) {
        for (let c = 0; c < SIZES.gridSize; c++) {
          const val = grid[r][c];
          if (val === 0) continue;
          const pts = scoreTile(val);
          const tx = bx + c * (tw + gx) + tw / 2;
          const ty = by + r * (th + gy) + th * 0.25;
          ctx.font = `bold ${14 * s}px ${scoreFont}`;
          ctx.fillText(`+${pts}`, tx, ty);
        }
      }

      const cx = vw / 2;
      const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      let cursorY = vh * 0.15;

      // "Game Over" title
      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${32 * s}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Game Over', cx, cursorY);
      cursorY += 40 * s;

      if (gameOverData) {
        // Current score (large)
        ctx.font = `bold ${24 * s}px ${font}`;
        ctx.fillStyle = '#FFF';
        ctx.fillText(`Score: ${gameOverData.currentScore}`, cx, cursorY);
        cursorY += 36 * s;

        // Score history header
        ctx.font = `bold ${SCORE_LIST.headerFontSize * s}px ${font}`;
        ctx.fillStyle = SCORE_LIST.normalText;
        ctx.fillText('Score History', cx, cursorY);
        cursorY += 28 * s;

        // Score list
        const visible = gameOverData.scores.slice(0, SCORE_LIST.maxVisible);
        const lh = SCORE_LIST.lineHeight * s;

        for (let i = 0; i < visible.length; i++) {
          const entry = visible[i];
          const isHighlighted = i === gameOverData.currentScoreIndex;

          if (isHighlighted) {
            // Highlighted pill background
            const pillW = 120 * s;
            const pillH = lh;
            this.roundRect(cx - pillW / 2, cursorY - pillH / 2, pillW, pillH, pillH / 2, SCORE_LIST.highlightFill);
            ctx.fillStyle = SCORE_LIST.highlightText;
          } else {
            ctx.fillStyle = SCORE_LIST.normalText;
          }

          ctx.font = `${SCORE_LIST.fontSize * s}px ${font}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${entry.score}`, cx, cursorY);
          cursorY += lh;
        }

        if (gameOverData.scores.length > SCORE_LIST.maxVisible) {
          ctx.fillStyle = SCORE_LIST.normalText;
          ctx.font = `${SCORE_LIST.fontSize * s}px ${font}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`+${gameOverData.scores.length - SCORE_LIST.maxVisible} more`, cx, cursorY);
          cursorY += lh;
        }
      }

      // "New Game" button
      cursorY += 24 * s;
      const btnW = BUTTON.width * s;
      const btnH = BUTTON.height * s;
      const btnX = cx - btnW / 2;
      const btnR = BUTTON.borderRadius * s;

      this.roundRect(btnX, cursorY, btnW, btnH, btnR, BUTTON.fill);
      ctx.fillStyle = BUTTON.text;
      ctx.font = `bold ${BUTTON.fontSize * s}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('New Game', btnX + btnW / 2, cursorY + btnH / 2);

      this._newGameBtnBounds = { x: btnX, y: cursorY, w: btnW, h: btnH };
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

        // Draw merge direction indicators based on grid neighbours
        const indicators = this.getMergeIndicators(grid, r, c);
        this.drawMergeIndicators(x, y, tw, th, s, indicators);
      }
    }
  }

  /**
   * Drag tile drawing: tiles follow the pointer at interpolated positions.
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

    // Build a virtual grid from preview tile from-positions for indicators
    const virtualGrid: Grid = Array.from({ length: SIZES.gridSize }, () =>
      Array.from({ length: SIZES.gridSize }, () => 0 as CellValue),
    );
    for (const tp of preview.tiles.values()) {
      virtualGrid[tp.fromRow][tp.fromCol] = tp.value;
    }

    if (!preview.valid) {
      // ── Invalid move: rubber-band all tiles uniformly ───
      const [dr, dc] = directionOffset(preview.direction);
      const offsetX = dc * progress * (tw + gx);
      const offsetY = dr * progress * (th + gy);

      for (const tp of preview.tiles.values()) {
        const x = bx + tp.fromCol * (tw + gx) + offsetX;
        const y = by + tp.fromRow * (th + gy) + offsetY;
        this.drawTile(x, y, tw, th, br, s, tp.value, 1, 1);
        const indicators = this.getMergeIndicators(virtualGrid, tp.fromRow, tp.fromCol);
        this.drawMergeIndicators(x, y, tw, th, s, indicators);
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
      const indicators = this.getMergeIndicators(virtualGrid, tp.fromRow, tp.fromCol);
      this.drawMergeIndicators(x, y, tw, th, s, indicators);
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
      const indicators = this.getMergeIndicators(virtualGrid, tp.fromRow, tp.fromCol);
      this.drawMergeIndicators(x, y, tw, th, s, indicators);
    }

    // Layer 3: merge result preview at tile intersections
    for (const ev of preview.moveEvents) {
      if (ev.type !== 'merge' || !ev.from) continue;

      const movingTp = preview.tiles.get(`${ev.from.row},${ev.from.col}`);
      if (!movingTp) continue;

      // Moving tile's current interpolated position
      const mFromX = bx + movingTp.fromCol * (tw + gx);
      const mFromY = by + movingTp.fromRow * (th + gy);
      const mToX = bx + movingTp.toCol * (tw + gx);
      const mToY = by + movingTp.toRow * (th + gy);
      const mx = mFromX + (mToX - mFromX) * progress;
      const my = mFromY + (mToY - mFromY) * progress;

      // Merge target tile position (stationary)
      const tx = bx + ev.to.col * (tw + gx);
      const ty = by + ev.to.row * (th + gy);

      // Compute overlap rectangle
      const overlapLeft = Math.max(mx, tx);
      const overlapTop = Math.max(my, ty);
      const overlapRight = Math.min(mx + tw, tx + tw);
      const overlapBottom = Math.min(my + th, ty + th);

      const ow = overlapRight - overlapLeft;
      const oh = overlapBottom - overlapTop;

      if (ow > 0 && oh > 0) {
        const resultValue = ev.value;
        const resultColor = tileHex(resultValue);
        const resultLabel = tileLabel(resultValue);
        const resultTextColor = tileTextColor(resultValue);
        const overlapBr = Math.min(br, ow / 2, oh / 2);

        const ctx = this.ctx;
        ctx.save();

        // Fill with rounded rect matching card style
        this.roundRect(overlapLeft, overlapTop, ow, oh, overlapBr, resultColor);

        // Draw 2px black border
        const borderW = 2 * s;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = borderW;
        ctx.beginPath();
        ctx.moveTo(overlapLeft + overlapBr, overlapTop);
        ctx.lineTo(overlapLeft + ow - overlapBr, overlapTop);
        ctx.quadraticCurveTo(overlapLeft + ow, overlapTop, overlapLeft + ow, overlapTop + overlapBr);
        ctx.lineTo(overlapLeft + ow, overlapTop + oh - overlapBr);
        ctx.quadraticCurveTo(overlapLeft + ow, overlapTop + oh, overlapLeft + ow - overlapBr, overlapTop + oh);
        ctx.lineTo(overlapLeft + overlapBr, overlapTop + oh);
        ctx.quadraticCurveTo(overlapLeft, overlapTop + oh, overlapLeft, overlapTop + oh - overlapBr);
        ctx.lineTo(overlapLeft, overlapTop + overlapBr);
        ctx.quadraticCurveTo(overlapLeft, overlapTop, overlapLeft + overlapBr, overlapTop);
        ctx.closePath();
        ctx.stroke();

        // Draw result label centered in overlap if there's enough room
        if (this.colorBlindMode && resultLabel && ow > 8 * s && oh > 8 * s) {
          const fontSize = SIZES.tileFontSize * s * Math.min(1, ow / tw, oh / th);
          ctx.fillStyle = resultTextColor;
          ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(resultLabel, overlapLeft + ow / 2, overlapTop + oh / 2);
        }
        ctx.restore();
      }
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
    const fill = tileHex(value);
    const text = tileTextColor(value);
    const label = tileLabel(value);

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

    // Draw 2px black border
    const borderW = 2 * s;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = borderW;
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
    ctx.stroke();

    // Only draw label for named colors when color blind mode is on
    if (this.colorBlindMode && label) {
      const fontSize = SIZES.tileFontSize * s;
      ctx.fillStyle = text;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2);
    }

    // Draw white dots in top-right corner (scoring tier indicator)
    const dots = tileDisplayDots(value);
    if (dots > 0) {
      const dotRadius = 3 * s;
      const dotGap = 2.5 * s;
      const dotStartX = x + w - 8 * s;
      const dotStartY = y + 8 * s;
      ctx.fillStyle = '#FFFFFF';
      for (let d = 0; d < dots && d < 5; d++) {
        const dx = dotStartX - d * (dotRadius * 2 + dotGap);
        ctx.beginPath();
        ctx.arc(dx, dotStartY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Compute merge direction indicators for a tile based on its row and column
   * in the grid. Scans outward from the tile in each direction, tracking
   * whether any non-empty tile blocks the path to a merge partner.
   */
  private getMergeIndicators(
    grid: Grid, row: number, col: number,
  ): MergeIndicatorSet {
    const value = grid[row][col];
    const result: MergeIndicatorSet = { left: [], right: [], top: [], bottom: [] };
    if (value === 0) return result;

    const addUnique = (arr: MergeIndicator[], ci: number, blocked: boolean) => {
      if (!arr.some(i => i.colorIndex === ci)) arr.push({ colorIndex: ci, blocked });
    };

    // Scan left (from col-1 toward 0)
    let blocked = false;
    for (let c = col - 1; c >= 0; c--) {
      const other = grid[row][c];
      if (other !== 0) {
        if (canMerge(value, other)) addUnique(result.left, tileColorIndex(other), blocked);
        blocked = true;
      }
    }
    // Scan right (from col+1 toward end)
    blocked = false;
    for (let c = col + 1; c < SIZES.gridSize; c++) {
      const other = grid[row][c];
      if (other !== 0) {
        if (canMerge(value, other)) addUnique(result.right, tileColorIndex(other), blocked);
        blocked = true;
      }
    }
    // Scan up (from row-1 toward 0)
    blocked = false;
    for (let r = row - 1; r >= 0; r--) {
      const other = grid[r][col];
      if (other !== 0) {
        if (canMerge(value, other)) addUnique(result.top, tileColorIndex(other), blocked);
        blocked = true;
      }
    }
    // Scan down (from row+1 toward end)
    blocked = false;
    for (let r = row + 1; r < SIZES.gridSize; r++) {
      const other = grid[r][col];
      if (other !== 0) {
        if (canMerge(value, other)) addUnique(result.bottom, tileColorIndex(other), blocked);
        blocked = true;
      }
    }

    return result;
  }

  /**
   * Draw merge direction indicator lines on tile edges.
   * Each line is 2px thick × 8px long (scaled), colored with the partner's color.
   * Blocked indicators are drawn with black dashes over the color.
   */
  private drawMergeIndicators(
    x: number, y: number, w: number, h: number, s: number,
    indicators: MergeIndicatorSet,
  ): void {
    const ctx = this.ctx;
    const lineW = 4 * s;
    const lineL = 8 * s;
    const gap = 2 * s;

    // Helper: draw a solid line segment, with 50% opacity if blocked
    const drawLine = (lx: number, ly: number, lw: number, lh: number, color: string, blocked: boolean) => {
      if (blocked) ctx.globalAlpha = 0.5;
      ctx.fillStyle = color;
      ctx.fillRect(lx, ly, lw, lh);
      if (blocked) ctx.globalAlpha = 1.0;
    };

    // Left edge: vertical lines stacked vertically, centered
    if (indicators.left.length > 0) {
      const count = indicators.left.length;
      const totalH = count * lineL + (count - 1) * gap;
      let iy = y + (h - totalH) / 2;
      for (const ind of indicators.left) {
        drawLine(x, iy, lineW, lineL, tileHex(encodeTile(ind.colorIndex, 0)), ind.blocked);
        iy += lineL + gap;
      }
    }

    // Right edge
    if (indicators.right.length > 0) {
      const count = indicators.right.length;
      const totalH = count * lineL + (count - 1) * gap;
      let iy = y + (h - totalH) / 2;
      for (const ind of indicators.right) {
        drawLine(x + w - lineW, iy, lineW, lineL, tileHex(encodeTile(ind.colorIndex, 0)), ind.blocked);
        iy += lineL + gap;
      }
    }

    // Top edge: horizontal lines stacked horizontally, centered
    if (indicators.top.length > 0) {
      const count = indicators.top.length;
      const totalW = count * lineL + (count - 1) * gap;
      let ix = x + (w - totalW) / 2;
      for (const ind of indicators.top) {
        drawLine(ix, y, lineL, lineW, tileHex(encodeTile(ind.colorIndex, 0)), ind.blocked);
        ix += lineL + gap;
      }
    }

    // Bottom edge
    if (indicators.bottom.length > 0) {
      const count = indicators.bottom.length;
      const totalW = count * lineL + (count - 1) * gap;
      let ix = x + (w - totalW) / 2;
      for (const ind of indicators.bottom) {
        drawLine(ix, y + h - lineW, lineL, lineW, tileHex(encodeTile(ind.colorIndex, 0)), ind.blocked);
        ix += lineL + gap;
      }
    }
  }

  /**
   * Draw "Mix" pill buttons on all Gray tiles.
   */
  private drawMixButtons(
    grid: Grid,
    bx: number, by: number,
    tw: number, th: number,
    gx: number, gy: number,
    br: number, s: number,
  ): void {
    const ctx = this.ctx;
    const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    for (let r = 0; r < SIZES.gridSize; r++) {
      for (let c = 0; c < SIZES.gridSize; c++) {
        const val = grid[r][c];
        if (val === 0) continue;
        if (tileColorIndex(val) !== GRAY_IDX) continue;

        // Position Mix button at bottom center of tile
        const tileX = bx + c * (tw + gx);
        const tileY = by + r * (th + gy);
        const btnW = 36 * s;
        const btnH = 18 * s;
        const btnX = tileX + (tw - btnW) / 2;
        const btnY = tileY + th - btnH - 6 * s;
        const btnR = btnH / 2;

        // Pill background
        ctx.save();
        ctx.globalAlpha = 0.9;
        this.roundRect(btnX, btnY, btnW, btnH, btnR, '#FFFFFF');
        ctx.restore();

        // "Mix" text
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${10 * s}px ${font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Mix', btnX + btnW / 2, btnY + btnH / 2);

        // Store bounds for hit testing
        this._mixBtnBounds.set(`${r},${c}`, { x: btnX, y: btnY, w: btnW, h: btnH });
      }
    }
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
