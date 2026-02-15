/**
 * Color tile encoding, decoding, mixing, and display logic.
 *
 * Each tile encodes:
 *   - RGB color (each channel 0–10, representing 0.0–1.0 in 0.1 steps)
 *   - Tier (merge depth: 0 = base, 1 = primary mix, 2+ = deeper mixes)
 *
 * Encoding formula:
 *   id = tier * 1331 + r * 121 + g * 11 + b + 1
 *   (0 is reserved for empty cells)
 *
 * Merge rule: any two tiles with DIFFERENT RGB values can merge.
 * Same RGB = cannot merge (regardless of tier).
 * Result: average the two RGB vectors, round each channel, tier = max(a,b)+1.
 */

import type { CellValue } from './types';

/* ── RGB type (0–10 integer scale) ────────────────────── */

export interface TileRgb {
  r: number; // 0–10
  g: number; // 0–10
  b: number; // 0–10
}

export interface TileData {
  r: number;
  g: number;
  b: number;
  tier: number;
}

/* ── Encoding / Decoding ──────────────────────────────── */

const RGB_RANGE = 11; // 0–10 inclusive
const RGB_BLOCK = RGB_RANGE * RGB_RANGE * RGB_RANGE; // 1331

export function encodeTile(r: number, g: number, b: number, tier: number): CellValue {
  return tier * RGB_BLOCK + r * (RGB_RANGE * RGB_RANGE) + g * RGB_RANGE + b + 1;
}

export function decodeTile(id: CellValue): TileData {
  const adjusted = id - 1;
  const b = adjusted % RGB_RANGE;
  const g = Math.floor(adjusted / RGB_RANGE) % RGB_RANGE;
  const r = Math.floor(adjusted / (RGB_RANGE * RGB_RANGE)) % RGB_RANGE;
  const tier = Math.floor(adjusted / RGB_BLOCK);
  return { r, g, b, tier };
}

export function tileRgb(id: CellValue): TileRgb {
  const { r, g, b } = decodeTile(id);
  return { r, g, b };
}

export function tileTier(id: CellValue): number {
  return decodeTile(id).tier;
}

/* ── Same-color check (for merge gating) ─────────────── */

/** True if two non-empty tiles have the same rounded RGB. */
export function isSameColor(a: CellValue, b: CellValue): boolean {
  if (a === 0 || b === 0) return false;
  const ca = tileRgb(a);
  const cb = tileRgb(b);
  return ca.r === cb.r && ca.g === cb.g && ca.b === cb.b;
}

/* ── Mixing ───────────────────────────────────────────── */

/** Mixes two tile colors by averaging RGB and incrementing tier. */
export function mixColors(a: CellValue, b: CellValue): CellValue {
  const da = decodeTile(a);
  const db = decodeTile(b);
  const r = Math.round((da.r + db.r) / 2);
  const g = Math.round((da.g + db.g) / 2);
  const bl = Math.round((da.b + db.b) / 2);
  const tier = Math.max(da.tier, db.tier) + 1;
  return encodeTile(r, g, bl, tier);
}

/* ── Display helpers ──────────────────────────────────── */

/** Converts a 0–10 channel value to 0–255 byte. */
function channelToByte(n: number): number {
  return Math.round((n / 10) * 255);
}

/** Returns CSS hex color string for a tile. */
export function tileHex(id: CellValue): string {
  const { r, g, b } = tileRgb(id);
  const rb = channelToByte(r);
  const gb = channelToByte(g);
  const bb = channelToByte(b);
  return '#' + [rb, gb, bb].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Returns a suitable text color (black or white) for readability
 * on the tile's background color.
 */
export function tileTextColor(id: CellValue): string {
  const { r, g, b } = tileRgb(id);
  // Relative luminance using 0–10 scale (same ratio as 0–1)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 10;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/* ── Named color labels ───────────────────────────────── */

/**
 * Label map: known colors get a single-letter label.
 * Key = "r,g,b" string (0–10 scale).
 */
const LABEL_MAP: Record<string, string> = {
  '3,10,9': 'C',   // Cyan
  '9,3,10': 'M',   // Magenta
  '10,8,3': 'Y',   // Yellow
  '6,7,10': 'B',   // Blue  (C+M)
  '10,6,7': 'R',   // Red   (M+Y)
  '7,9,6': 'G',    // Green (C+Y)
};

/** Returns a single-letter label for known colors, or null for deeper mixes. */
export function tileLabel(id: CellValue): string | null {
  const { r, g, b } = tileRgb(id);
  return LABEL_MAP[`${r},${g},${b}`] ?? null;
}

/* ── Base tile constants ──────────────────────────────── */

/** Cyan tile ID (tier 0) */
export const CYAN = encodeTile(3, 10, 9, 0);
/** Magenta tile ID (tier 0) */
export const MAGENTA = encodeTile(9, 3, 10, 0);
/** Yellow tile ID (tier 0) */
export const YELLOW = encodeTile(10, 8, 3, 0);

/** The three base tile values that can spawn. */
export const BASE_TILES: CellValue[] = [CYAN, MAGENTA, YELLOW];
