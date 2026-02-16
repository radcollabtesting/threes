/**
 * @threes/design-tokens — Visual constants for the color mixing game.
 *
 * All size values are in "baseline dp" and should be scaled responsively
 * by the rendering layer (Canvas scale factor or RN responsive sizing).
 */

/* ── Colors ────────────────────────────────────────────── */

export const COLORS = {
  /** Full-screen background */
  background: '#000000',
  /** Empty cell placeholder */
  emptyCellSlot: '#292929',
  /** "next" label below the preview tile */
  nextLabelText: '#FFFFFF',
  /** Score display text */
  scoreText: '#FFFFFF',
} as const;

/* ── Theme colors ─────────────────────────────────────── */

export interface ThemeColors {
  background: string;
  emptyCellSlot: string;
  nextLabelText: string;
  scoreText: string;
  uiText: string;
  tileBorder: string;
  overlayBackground: string;
  /** Semi-transparent overlay used to dim the board during mix mode */
  mixOverlay: string;
}

export const DARK_THEME: ThemeColors = {
  background: '#000000',
  emptyCellSlot: '#292929',
  nextLabelText: '#FFFFFF',
  scoreText: '#FFFFFF',
  uiText: '#FFFFFF',
  tileBorder: '#000000',
  overlayBackground: 'rgba(0,0,0,0.7)',
  mixOverlay: 'rgba(0,0,0,0.5)',
};

export const LIGHT_THEME: ThemeColors = {
  background: '#FFFFFF',
  emptyCellSlot: '#D4D4D4',
  nextLabelText: '#000000',
  scoreText: '#000000',
  uiText: '#000000',
  tileBorder: '#000000',
  overlayBackground: 'rgba(0,0,0,0.55)',
  mixOverlay: 'rgba(255,255,255,0.6)',
};

/* ── Size tokens (baseline dp) ─────────────────────────── */

export const SIZES = {
  gridSize: 4,
  tileWidth: 62,
  tileHeight: 99,
  gapX: 13,
  gapY: 9,
  tileBorderRadius: 6,
  /** Distance from top of viewport to top of board (baseline) */
  boardTopOffset: 196,
  /** Gap between bottom of board and top of "next" tile preview */
  nextTileGapFromBoard: 54,
  /** Gap between bottom of "next" tile and "next" label text */
  nextLabelGap: 15,
  nextLabelFontSize: 16,
  tileFontSize: 24,
  /** Smaller font for longer labels */
  tileFontSizeLarge: 20,
} as const;

/** Computed board pixel dimensions (before scaling) */
export const BOARD = {
  width: SIZES.tileWidth * SIZES.gridSize + SIZES.gapX * (SIZES.gridSize - 1),
  height: SIZES.tileHeight * SIZES.gridSize + SIZES.gapY * (SIZES.gridSize - 1),
} as const;

/* ── Animation timing (ms) ─────────────────────────────── */

export const ANIMATION = {
  /** Tile slide from one cell to the next */
  moveDuration: 120,
  moveEasing: 'ease-out' as const,
  /** Merge pop: scale 1.0 → 1.10 → 1.0 */
  mergeScaleDuration: 140,
  mergeScaleUp: 1.1,
  /** New tile fade/scale in */
  spawnDuration: 120,
  /** Board micro-shake on invalid move */
  shakeDuration: 90,
  shakeAmplitude: 4,
} as const;

/* ── Button tokens ────────────────────────────────────── */

export const BUTTON = {
  width: 160,
  height: 44,
  borderRadius: 8,
  fontSize: 16,
  fill: '#FFFFFF',
  text: '#000000',
} as const;

/* ── Score list tokens (game-over overlay) ────────────── */

export const SCORE_LIST = {
  fontSize: 14,
  lineHeight: 22,
  highlightFill: '#5491FE',
  highlightText: '#FFFFFF',
  normalText: '#AAAAAA',
  headerFontSize: 18,
  maxVisible: 8,
} as const;

/* ── Input thresholds ──────────────────────────────────── */

export const INPUT = {
  /** Minimum swipe distance in dp (also clamped to tileWidth * 0.25) */
  minSwipeDistance: 18,
  /** Axis-lock ratio: abs(dx) > abs(dy) * this ⇒ horizontal swipe */
  axisLockRatio: 1.2,
} as const;
