/**
 * @threes/design-tokens — Visual constants derived from the Figma design reference.
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
  /** Tile value 1: blue */
  tile1Fill: '#5491FE',
  tile1Text: '#FFFFFF',
  /** Tile value 2: red/salmon */
  tile2Fill: '#FE5554',
  tile2Text: '#FFFFFF',
  /** Tiles >= 3: light gray with black text */
  tileHighFill: '#BDBDBD',
  tileHighText: '#000000',
  /** "next" label below the preview tile */
  nextLabelText: '#FFFFFF',
} as const;

/**
 * Returns fill and text colors for a given tile value.
 * Matches the design reference: blue(1), red(2), gray(>=3).
 */
export function tileColors(value: number): { fill: string; text: string } {
  if (value === 1) return { fill: COLORS.tile1Fill, text: COLORS.tile1Text };
  if (value === 2) return { fill: COLORS.tile2Fill, text: COLORS.tile2Text };
  return { fill: COLORS.tileHighFill, text: COLORS.tileHighText };
}

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
  /** Smaller font for 3+ digit tile numbers (100, 192, ...) */
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
