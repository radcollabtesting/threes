/**
 * Simplified shade-based color system.
 *
 * 9 tile levels across 3 color families (3 shades each):
 *   Red:   R1 (1), R2 (2), R3 (3)
 *   Green: G1 (4), G2 (5), G3 (6)
 *   Blue:  B1 (7), B2 (8), B3 (9)
 *
 * Encoding: tile value IS the level (1–9), 0 = empty.
 * Merge: same-value tiles → value + 1 (max = 9; B3 can't merge).
 *
 * Light mode: colors progress dark → light within each family.
 * Dark mode:  colors progress light → dark (opposite).
 *
 * When a merge crosses a color boundary (R3→G1 or G3→B1),
 * adjacent tiles are pushed outward ("pop" effect).
 */

import type { CellValue } from './types';

/* ── Tile constants ─────────────────────────────────────── */

export const R1: CellValue = 1;
export const R2: CellValue = 2;
export const R3: CellValue = 3;
export const G1: CellValue = 4;
export const G2: CellValue = 5;
export const G3: CellValue = 6;
export const B1: CellValue = 7;
export const B2: CellValue = 8;
export const B3: CellValue = 9;

export const MAX_TILE: CellValue = 9;

/** The only tile that spawns as new cards */
export const BASE_TILE: CellValue = R1;
export const BASE_TILES: CellValue[] = [R1];

/* ── Color family helpers ──────────────────────────────── */

/** Returns 0 = Red, 1 = Green, 2 = Blue, or -1 for invalid */
export function tileColorFamily(id: CellValue): number {
  if (id <= 0 || id > MAX_TILE) return -1;
  return Math.floor((id - 1) / 3);
}

/** Returns the shade within its color family (0, 1, or 2) */
export function tileShade(id: CellValue): number {
  if (id <= 0 || id > MAX_TILE) return -1;
  return (id - 1) % 3;
}

/** True when merging this value crosses into the next color family */
export function isColorTransition(value: CellValue): boolean {
  return value === R3 || value === G3;
}

/* ── Tier (level index 0–8, used by scoring) ───────────── */

export function tileTier(id: CellValue): number {
  if (id <= 0) return -1;
  if (id > MAX_TILE) return MAX_TILE - 1;
  return id - 1;
}

/* ── Display: hex colors ──────────────────────────────── */

/** Light mode: dark → light within each color family */
const LIGHT_HEX: string[] = [
  '',         // 0 placeholder
  '#8B1A1A', // R1 – dark red
  '#DC3545', // R2 – red
  '#FF6B8A', // R3 – pink
  '#1B5E20', // G1 – dark green
  '#43A047', // G2 – green
  '#81C784', // G3 – light green
  '#1A237E', // B1 – dark blue
  '#3F51B5', // B2 – blue
  '#90CAF9', // B3 – light blue
];

/** Dark mode: reversed (light → dark within each family) */
const DARK_HEX: string[] = [
  '',
  '#FF6B8A', // R1 – pink
  '#DC3545', // R2 – red
  '#8B1A1A', // R3 – burgundy
  '#81C784', // G1 – light green
  '#43A047', // G2 – green
  '#1B5E20', // G3 – dark green
  '#90CAF9', // B1 – light blue
  '#3F51B5', // B2 – blue
  '#1A237E', // B3 – dark blue
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
  null, 'R1', 'R2', 'R3', 'G1', 'G2', 'G3', 'B1', 'B2', 'B3',
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
 * Two tiles can merge if they have the same value and
 * the value is below the max (B3 can't merge further).
 */
export function canMerge(a: CellValue, b: CellValue): boolean {
  if (a <= 0 || b <= 0) return false;
  return a === b && a < MAX_TILE;
}

/** Returns the merged tile value (always input + 1). */
export function mergeResult(a: CellValue, _b: CellValue): CellValue {
  return a + 1;
}

/* ── Merge partners (for hint indicators) ──────────────── */

/** Returns tile values that this tile can merge with (always its own value). */
export function getMergePartners(id: CellValue): CellValue[] {
  if (id <= 0 || id >= MAX_TILE) return [];
  return [id];
}
