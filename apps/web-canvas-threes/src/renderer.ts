/**
 * Canvas renderer for the color breakdown game.
 *
 * Draws the board, tiles, queue preview, score, and game-over overlay.
 * Tile colors are computed dynamically from the color encoding system.
 */

import { scoreTile, tileHex, tileTextColor, tileLabel, tileDisplayDots, getMergePartners, encodeTile, canMerge, tileColorIndex, tileDots, mergeResult, type CellValue, type Grid, type Direction, type Position } from '@threes/game-logic';
import { COLORS, SIZES, BOARD, ANIMATION, BUTTON, SCORE_LIST, DARK_THEME, LIGHT_THEME, type ThemeColors } from '@threes/design-tokens';
import type { AnimState } from './animation';
import type { DragState, TilePreview } from './drag';
import type { ScoreEntry } from './score-history';

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

/** Max queue tiles to show in the preview bar */
const QUEUE_PREVIEW_COUNT = 4;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private _scale = 1;
  private _boardX = 0;
  private _boardY = 0;
  private _newGameBtnBounds: { x: number; y: number; w: number; h: number } | null = null;
  private _continueBtnBounds: { x: number; y: number; w: number; h: number } | null = null;

  colorBlindMode = false;
  darkMode = true;

  get theme(): ThemeColors {
    return this.darkMode ? DARK_THEME : LIGHT_THEME;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  get currentScale(): number {
    return this._scale;
  }

  get newGameButtonBounds(): { x: number; y: number; w: number; h: number } | null {
    return this._newGameBtnBounds;
  }

  get continueButtonBounds(): { x: number; y: number; w: number; h: number } | null {
    return this._continueBtnBounds;
  }

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
   * Main render pass.
   * @param queue  The tile queue (for preview bar display).
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
    _mixState?: unknown,
    multipliers?: number[][] | null,
    queue?: CellValue[] | null,
  ): void {
    const ctx = this.ctx;
    const s = this._scale;
    const vw = this.canvas.width / (window.devicePixelRatio || 1);
    const vh = this.canvas.height / (window.devicePixelRatio || 1);

    // ── Background
    const theme = this.theme;
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, vw, vh);

    // ── Score display
    if (currentScore !== undefined) {
      const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = theme.scoreText;
      ctx.font = `bold ${20 * s}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Score: ${currentScore}`, vw / 2, 30 * s);
    }

    // ── Board shake offset
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

    // ── Empty cell slots
    for (let r = 0; r < SIZES.gridSize; r++) {
      for (let c = 0; c < SIZES.gridSize; c++) {
        const x = bx + c * (tw + gx);
        const y = by + r * (th + gy);
        this.roundRect(x, y, tw, th, br, theme.emptyCellSlot);
      }
    }

    // ── Tiles
    const isDragActive = drag && drag.preview &&
      (drag.phase === 'dragging' || drag.phase === 'snapping');

    if (isDragActive) {
      this.drawDragTiles(drag, bx, by, tw, th, gx, gy, br, s, multipliers);
    } else {
      this.drawStaticTiles(grid, anim, bx, by, tw, th, gx, gy, br, s, multipliers);
    }

    // ── Queue preview bar
    if (!gameOver) {
      this.drawQueuePreview(queue ?? [], bx, by, tw, th, gx, br, s, anim, vw);
    }

    // ── Game-over overlay
    this._newGameBtnBounds = null;

    if (gameOver) {
      ctx.fillStyle = theme.overlayBackground;
      ctx.fillRect(0, 0, vw, vh);

      // Per-tile score labels
      const scoreFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let r = 0; r < SIZES.gridSize; r++) {
        for (let c = 0; c < SIZES.gridSize; c++) {
          const val = grid[r][c];
          if (val === 0) continue;
          const base = scoreTile(val);
          const mixCount = multipliers?.[r]?.[c] ?? 0;
          const pts = mixCount > 0 ? base * Math.pow(2, mixCount) : base;
          const tx = bx + c * (tw + gx) + tw / 2;
          const ty = by + r * (th + gy) + th * 0.25;
          ctx.font = `bold ${14 * s}px ${scoreFont}`;
          ctx.fillText(`+${pts}`, tx, ty);
        }
      }

      const cx = vw / 2;
      const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      let cursorY = vh * 0.15;

      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${32 * s}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Game Over', cx, cursorY);
      cursorY += 40 * s;

      if (gameOverData) {
        ctx.font = `bold ${24 * s}px ${font}`;
        ctx.fillStyle = '#FFF';
        ctx.fillText(`Score: ${gameOverData.currentScore}`, cx, cursorY);
        cursorY += 36 * s;

        ctx.font = `bold ${SCORE_LIST.headerFontSize * s}px ${font}`;
        ctx.fillStyle = SCORE_LIST.normalText;
        ctx.fillText('Score History', cx, cursorY);
        cursorY += 28 * s;

        const visible = gameOverData.scores.slice(0, SCORE_LIST.maxVisible);
        const lh = SCORE_LIST.lineHeight * s;

        for (let i = 0; i < visible.length; i++) {
          const entry = visible[i];
          const isHighlighted = i === gameOverData.currentScoreIndex;

          if (isHighlighted) {
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

  /* ── Queue preview bar ────────────────────────────────── */

  /**
   * Draws the queue preview: up to 4 tiles + "+X more" badge.
   */
  private drawQueuePreview(
    queue: CellValue[],
    bx: number, by: number,
    tw: number, th: number,
    gx: number, br: number,
    s: number, anim: AnimState,
    vw: number,
  ): void {
    const ctx = this.ctx;
    const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    const previewY = by + BOARD.height * s + SIZES.nextTileGapFromBoard * s;
    const previewTileW = tw * 0.65;
    const previewTileH = th * 0.65;
    const previewGap = 6 * s;
    const previewBr = br * 0.65;

    const visibleCount = Math.min(queue.length, QUEUE_PREVIEW_COUNT);
    const remaining = queue.length - visibleCount;

    if (visibleCount === 0) {
      // Empty queue indicator
      ctx.fillStyle = this.theme.nextLabelText;
      ctx.font = `${12 * s}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('queue empty', vw / 2, previewY + previewTileH / 2 - 6 * s);
      return;
    }

    // Calculate total width for centering
    const badgeW = remaining > 0 ? 40 * s : 0;
    const totalW = visibleCount * previewTileW + (visibleCount - 1) * previewGap + (remaining > 0 ? previewGap + badgeW : 0);
    let px = (vw - totalW) / 2;

    // Draw "next" label above
    ctx.fillStyle = this.theme.nextLabelText;
    ctx.font = `${SIZES.nextLabelFontSize * s}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('queue', vw / 2, previewY - 4 * s);

    // Draw preview tiles
    for (let i = 0; i < visibleCount; i++) {
      const val = queue[i];

      // Next-tile crossfade for the first tile
      let alpha = 1;
      if (i === 0 && anim.nextTile.active && anim.nextTile.progress < 1) {
        const p = anim.nextTile.progress;
        if (p < 0.5) {
          alpha = 1 - p / 0.5;
          // Show old value fading out
          if (anim.nextTile.oldValue > 0) {
            this.drawTile(px, previewY, previewTileW, previewTileH, previewBr, s, anim.nextTile.oldValue, 1, alpha);
          }
          px += previewTileW + previewGap;
          continue;
        } else {
          alpha = (p - 0.5) / 0.5;
        }
      }

      this.drawTile(px, previewY, previewTileW, previewTileH, previewBr, s, val, 1, alpha);
      px += previewTileW + previewGap;
    }

    // Draw "+X more" badge
    if (remaining > 0) {
      const badgeH = previewTileH * 0.5;
      const badgeY = previewY + (previewTileH - badgeH) / 2;
      const badgeR = badgeH / 2;

      ctx.save();
      ctx.globalAlpha = 0.7;
      this.roundRect(px, badgeY, badgeW, badgeH, badgeR, this.theme.nextLabelText);
      ctx.restore();

      ctx.fillStyle = this.theme.background;
      ctx.font = `bold ${10 * s}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`+${remaining}`, px + badgeW / 2, badgeY + badgeH / 2);
    }
  }

  /* ── Tile drawing modes ──────────────────────────────── */

  private drawStaticTiles(
    grid: Grid, anim: AnimState,
    bx: number, by: number,
    tw: number, th: number,
    gx: number, gy: number,
    br: number, s: number,
    multipliers?: number[][] | null,
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

        const merge = anim.merges.get(key);
        if (merge && merge.progress < 1) {
          const p = merge.progress;
          const peak = ANIMATION.mergeScaleUp;
          tileScale = p < 0.5
            ? 1 + (peak - 1) * (p / 0.5)
            : peak - (peak - 1) * ((p - 0.5) / 0.5);
        }

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

        // Draw 2x multiplier badge
        const mult = multipliers?.[r]?.[c] ?? 0;
        if (mult > 0) {
          this.drawMultiplierBadge(x, y, tw, s, mult);
        }

        // Draw merge direction indicators
        const indicators = this.getMergeIndicators(grid, r, c);
        this.drawMergeIndicators(x, y, tw, th, s, indicators);
      }
    }
  }

  private drawDragTiles(
    drag: DragState,
    bx: number, by: number,
    tw: number, th: number,
    gx: number, gy: number,
    br: number, s: number,
    multipliers?: number[][] | null,
  ): void {
    const preview = drag.preview!;
    const progress = drag.progress;

    const virtualGrid: Grid = Array.from({ length: SIZES.gridSize }, () =>
      Array.from({ length: SIZES.gridSize }, () => 0 as CellValue),
    );
    for (const tp of preview.tiles.values()) {
      virtualGrid[tp.fromRow][tp.fromCol] = tp.value;
    }

    if (!preview.valid) {
      const [dr, dc] = directionOffset(preview.direction);
      const offsetX = dc * progress * (tw + gx);
      const offsetY = dr * progress * (th + gy);

      for (const tp of preview.tiles.values()) {
        const x = bx + tp.fromCol * (tw + gx) + offsetX;
        const y = by + tp.fromRow * (th + gy) + offsetY;
        this.drawTile(x, y, tw, th, br, s, tp.value, 1, 1);
        const mult = multipliers?.[tp.fromRow]?.[tp.fromCol] ?? 0;
        if (mult > 0) this.drawMultiplierBadge(x, y, tw, s, mult);
        const indicators = this.getMergeIndicators(virtualGrid, tp.fromRow, tp.fromCol);
        this.drawMergeIndicators(x, y, tw, th, s, indicators);
      }
      return;
    }

    const nonMoving: TilePreview[] = [];
    const moving: TilePreview[] = [];

    for (const tp of preview.tiles.values()) {
      (tp.moves ? moving : nonMoving).push(tp);
    }

    for (const tp of nonMoving) {
      const x = bx + tp.fromCol * (tw + gx);
      const y = by + tp.fromRow * (th + gy);
      this.drawTile(x, y, tw, th, br, s, tp.value, 1, 1);
      const mult = multipliers?.[tp.fromRow]?.[tp.fromCol] ?? 0;
      if (mult > 0) this.drawMultiplierBadge(x, y, tw, s, mult);
      const indicators = this.getMergeIndicators(virtualGrid, tp.fromRow, tp.fromCol);
      this.drawMergeIndicators(x, y, tw, th, s, indicators);
    }

    for (const tp of moving) {
      const fromX = bx + tp.fromCol * (tw + gx);
      const fromY = by + tp.fromRow * (th + gy);
      const toX = bx + tp.toCol * (tw + gx);
      const toY = by + tp.toRow * (th + gy);

      const x = fromX + (toX - fromX) * progress;
      const y = fromY + (toY - fromY) * progress;

      this.drawTile(x, y, tw, th, br, s, tp.value, 1, 1);
      const mult = multipliers?.[tp.fromRow]?.[tp.fromCol] ?? 0;
      if (mult > 0) this.drawMultiplierBadge(x, y, tw, s, mult);
      const indicators = this.getMergeIndicators(virtualGrid, tp.fromRow, tp.fromCol);
      this.drawMergeIndicators(x, y, tw, th, s, indicators);
    }

    // Merge result preview at tile intersections
    for (const ev of preview.moveEvents) {
      if (ev.type !== 'merge' || !ev.from) continue;

      const movingTp = preview.tiles.get(`${ev.from.row},${ev.from.col}`);
      if (!movingTp) continue;

      const mFromX = bx + movingTp.fromCol * (tw + gx);
      const mFromY = by + movingTp.fromRow * (th + gy);
      const mToX = bx + movingTp.toCol * (tw + gx);
      const mToY = by + movingTp.toRow * (th + gy);
      const mx = mFromX + (mToX - mFromX) * progress;
      const my = mFromY + (mToY - mFromY) * progress;

      const tx = bx + ev.to.col * (tw + gx);
      const ty = by + ev.to.row * (th + gy);

      const overlapLeft = Math.max(mx, tx);
      const overlapTop = Math.max(my, ty);
      const overlapRight = Math.min(mx + tw, tx + tw);
      const overlapBottom = Math.min(my + th, ty + th);

      const ow = overlapRight - overlapLeft;
      const oh = overlapBottom - overlapTop;

      if (ow > 0 && oh > 0) {
        // For milestone splits, show the merge-point tile color
        // For regular splits, show a "poof" effect (white flash)
        const resultValue = ev.value;
        const isMilestone = ev.isMilestone;
        const resultColor = resultValue > 0 ? tileHex(resultValue) : '#FFFFFF';
        const resultLabel = resultValue > 0 ? tileLabel(resultValue) : null;
        const resultTextColor2 = resultValue > 0 ? tileTextColor(resultValue) : '#000000';
        const overlapBr = Math.min(br, ow / 2, oh / 2);

        const ctx = this.ctx;
        ctx.save();

        // For regular splits (value=0), show a dissolve effect
        if (resultValue === 0) {
          ctx.globalAlpha = 0.5;
          this.roundRect(overlapLeft, overlapTop, ow, oh, overlapBr, '#FFFFFF');
        } else {
          this.roundRect(overlapLeft, overlapTop, ow, oh, overlapBr, resultColor);

          const borderW = 2 * s;
          ctx.strokeStyle = this.theme.tileBorder;
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

          if (this.colorBlindMode && resultLabel && ow > 8 * s && oh > 8 * s) {
            const fontSize = SIZES.tileFontSize * s * Math.min(1, ow / tw, oh / th);
            ctx.fillStyle = resultTextColor2;
            ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(resultLabel, overlapLeft + ow / 2, overlapTop + oh / 2);
          }
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

    const borderW = 2 * s;
    ctx.strokeStyle = this.theme.tileBorder;
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

    // Always draw label (not just color blind mode) since we have many similar colors
    if (label) {
      const fontSize = SIZES.tileFontSize * s;
      ctx.fillStyle = text;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2);
    }

    // Draw dots in top-right corner
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

  private getMergeIndicators(
    grid: Grid, row: number, col: number,
  ): MergeIndicatorSet {
    const value = grid[row][col];
    const result: MergeIndicatorSet = { left: [], right: [], top: [], bottom: [] };
    if (value === 0) return result;

    const addUnique = (arr: MergeIndicator[], ci: number, blocked: boolean) => {
      if (!arr.some(i => i.colorIndex === ci)) arr.push({ colorIndex: ci, blocked });
    };

    let blocked = false;
    for (let c = col - 1; c >= 0; c--) {
      const other = grid[row][c];
      if (other !== 0) {
        if (canMerge(value, other)) addUnique(result.left, tileColorIndex(other), blocked);
        blocked = true;
      }
    }
    blocked = false;
    for (let c = col + 1; c < SIZES.gridSize; c++) {
      const other = grid[row][c];
      if (other !== 0) {
        if (canMerge(value, other)) addUnique(result.right, tileColorIndex(other), blocked);
        blocked = true;
      }
    }
    blocked = false;
    for (let r = row - 1; r >= 0; r--) {
      const other = grid[r][col];
      if (other !== 0) {
        if (canMerge(value, other)) addUnique(result.top, tileColorIndex(other), blocked);
        blocked = true;
      }
    }
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

  private drawMergeIndicators(
    x: number, y: number, w: number, h: number, s: number,
    indicators: MergeIndicatorSet,
  ): void {
    const ctx = this.ctx;
    const lineW = 4 * s;
    const lineL = 8 * s;
    const gap = 2 * s;

    const drawLine = (lx: number, ly: number, lw: number, lh: number, color: string, blocked: boolean) => {
      if (blocked) ctx.globalAlpha = 0.5;
      ctx.fillStyle = color;
      ctx.fillRect(lx, ly, lw, lh);
      if (blocked) ctx.globalAlpha = 1.0;
    };

    if (indicators.left.length > 0) {
      const count = indicators.left.length;
      const totalH = count * lineL + (count - 1) * gap;
      let iy = y + (h - totalH) / 2;
      for (const ind of indicators.left) {
        drawLine(x, iy, lineW, lineL, tileHex(encodeTile(ind.colorIndex, 0)), ind.blocked);
        iy += lineL + gap;
      }
    }
    if (indicators.right.length > 0) {
      const count = indicators.right.length;
      const totalH = count * lineL + (count - 1) * gap;
      let iy = y + (h - totalH) / 2;
      for (const ind of indicators.right) {
        drawLine(x + w - lineW, iy, lineW, lineL, tileHex(encodeTile(ind.colorIndex, 0)), ind.blocked);
        iy += lineL + gap;
      }
    }
    if (indicators.top.length > 0) {
      const count = indicators.top.length;
      const totalW = count * lineL + (count - 1) * gap;
      let ix = x + (w - totalW) / 2;
      for (const ind of indicators.top) {
        drawLine(ix, y, lineL, lineW, tileHex(encodeTile(ind.colorIndex, 0)), ind.blocked);
        ix += lineL + gap;
      }
    }
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

  private drawMultiplierBadge(
    x: number, y: number,
    w: number, s: number,
    multiplier: number,
  ): void {
    const ctx = this.ctx;
    const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const text = `${Math.pow(2, multiplier)}x`;
    const fontSize = 9 * s;
    const padX = 4 * s;
    const padY = 2 * s;

    ctx.font = `bold ${fontSize}px ${font}`;
    const textWidth = ctx.measureText(text).width;
    const badgeW = textWidth + padX * 2;
    const badgeH = fontSize + padY * 2;
    const badgeX = x + 3 * s;
    const badgeY = y + 3 * s;
    const badgeR = badgeH / 2;

    ctx.save();
    ctx.globalAlpha = 0.9;
    this.roundRect(badgeX, badgeY, badgeW, badgeH, badgeR, '#FFD700');
    ctx.restore();

    ctx.fillStyle = '#000000';
    ctx.font = `bold ${fontSize}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, badgeX + badgeW / 2, badgeY + badgeH / 2);
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

function directionOffset(direction: Direction): [number, number] {
  switch (direction) {
    case 'left':  return [0, -1];
    case 'right': return [0, 1];
    case 'up':    return [-1, 0];
    case 'down':  return [1, 0];
  }
}
