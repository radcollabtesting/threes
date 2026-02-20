/**
 * Shade-based color system with 3 independent color families.
 *
 * 15 tile levels across 3 color families (5 shades each):
 *   Red:   R1 (1), R2 (2), R3 (3), R4 (4), R5 (5)
 *   Green: G1 (6), G2 (7), G3 (8), G4 (9), G5 (10)
 *   Blue:  B1 (11), B2 (12), B3 (13), B4 (14), B5 (15)
 *
 * Encoding: tile value IS the level (1–15), 0 = empty.
 * Merge: same-value tiles within the same color family → value + 1.
 *        Max shade per color (R5, G5, B5) cannot merge further.
 *        Cross-color merges are NOT allowed.
 *
 * Light mode: colors progress dark → light within each family.
 * Dark mode:  colors progress light → dark (opposite).
 *
 * All 3 base tiles (R1, G1, B1) spawn from the start.
 */

import type { CellValue } from './types';

/* ── Constants ────────────────────────────────────────── */

export const SHADES_PER_COLOR = 5;
export const NUM_COLORS = 3;

/* ── Tile constants ─────────────────────────────────────── */

export const R1: CellValue = 1;
export const R2: CellValue = 2;
export const R3: CellValue = 3;
export const R4: CellValue = 4;
export const R5: CellValue = 5;
export const G1: CellValue = 6;
export const G2: CellValue = 7;
export const G3: CellValue = 8;
export const G4: CellValue = 9;
export const G5: CellValue = 10;
export const B1: CellValue = 11;
export const B2: CellValue = 12;
export const B3: CellValue = 13;
export const B4: CellValue = 14;
export const B5: CellValue = 15;

export const MAX_TILE: CellValue = 15;

/** The base tiles that spawn as new cards (one of each color) */
export const BASE_TILE: CellValue = R1;
export const BASE_TILES: CellValue[] = [R1, G1, B1];

/* ── Color family helpers ──────────────────────────────── */

/** Returns 0 = Red, 1 = Green, 2 = Blue, or -1 for invalid */
export function tileColorFamily(id: CellValue): number {
  if (id <= 0 || id > MAX_TILE) return -1;
  return Math.floor((id - 1) / SHADES_PER_COLOR);
}

/** Returns the shade within its color family (0–4) */
export function tileShade(id: CellValue): number {
  if (id <= 0 || id > MAX_TILE) return -1;
  return (id - 1) % SHADES_PER_COLOR;
}

/** True when this tile is the max shade of its color (R5, G5, or B5) */
export function isMaxShade(value: CellValue): boolean {
  return value === R5 || value === G5 || value === B5;
}

/* ── Tier (shade index 0–4, used by scoring) ──────────── */

export function tileTier(id: CellValue): number {
  if (id <= 0) return -1;
  if (id > MAX_TILE) return SHADES_PER_COLOR - 1;
  return tileShade(id);
}

/* ── Display: hex colors ──────────────────────────────── */

/** Light mode: dark → light within each color family */
const LIGHT_HEX: string[] = [
  '',         // 0 placeholder
  '#8B1A1A', // R1 – burgundy
  '#C62828', // R2 – deep red
  '#DC3545', // R3 – red
  '#EF5350', // R4 – light red
  '#FF6B8A', // R5 – pink
  '#1B5E20', // G1 – dark green
  '#2E7D32', // G2 – forest green
  '#43A047', // G3 – green
  '#66BB6A', // G4 – light green
  '#81C784', // G5 – pale green
  '#1A237E', // B1 – dark blue
  '#283593', // B2 – deep blue
  '#3F51B5', // B3 – blue
  '#5C6BC0', // B4 – light blue
  '#90CAF9', // B5 – pale blue
];

/** Dark mode: reversed (light → dark within each family) */
const DARK_HEX: string[] = [
  '',
  '#FF6B8A', // R1 – pink
  '#EF5350', // R2 – light red
  '#DC3545', // R3 – red
  '#C62828', // R4 – deep red
  '#8B1A1A', // R5 – burgundy
  '#81C784', // G1 – pale green
  '#66BB6A', // G2 – light green
  '#43A047', // G3 – green
  '#2E7D32', // G4 – forest green
  '#1B5E20', // G5 – dark green
  '#90CAF9', // B1 – pale blue
  '#5C6BC0', // B2 – light blue
  '#3F51B5', // B3 – blue
  '#283593', // B4 – deep blue
  '#1A237E', // B5 – dark blue
];

export function tileHex(id: CellValue, darkMode = false): string {
  if (id <= 0 || id > MAX_TILE) return '#000000';
  return darkMode ? DARK_HEX[id] : LIGHT_HEX[id];
}

/** Returns a suitable text color (black or white) for readability. */
export function tileTextColor(id: CellValue, darkMode = false): string {
  const hex = tileHex(id, darkMode);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/* ── Display: labels ──────────────────────────────────── */

const LABELS: (string | null)[] = [
  null,
  'R1', 'R2', 'R3', 'R4', 'R5',
  'G1', 'G2', 'G3', 'G4', 'G5',
  'B1', 'B2', 'B3', 'B4', 'B5',
];

export function tileLabel(id: CellValue): string | null {
  if (id <= 0 || id > MAX_TILE) return null;
  return LABELS[id];
}

/* ── Display: dots (shade within color family) ─────────── */

export function tileDisplayDots(id: CellValue): number {
  if (id <= 0 || id > MAX_TILE) return 0;
  return tileShade(id);
}

/* ── Merge logic ──────────────────────────────────────── */

/**
 * Two tiles can merge if they have the same value
 * and are not at max shade. (Same value implies same color family.)
 */
export function canMerge(a: CellValue, b: CellValue): boolean {
  if (a <= 0 || b <= 0) return false;
  return a === b && !isMaxShade(a);
}

/** Returns the merged tile value (always input + 1). */
export function mergeResult(a: CellValue, _b: CellValue): CellValue {
  return a + 1;
}

/* ── Merge partners (for hint indicators) ──────────────── */

/** Returns tile values that this tile can merge with (always its own value). */
export function getMergePartners(id: CellValue): CellValue[] {
  if (id <= 0 || id > MAX_TILE || isMaxShade(id)) return [];
  return [id];
}
