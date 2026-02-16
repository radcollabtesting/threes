/**
 * Mix selection state machine for the Gray catalyst mechanic.
 *
 * State flow:
 *   idle → selectingFirst → selectingSecond → idle
 *
 * The user taps "Mix" on a Gray tile, then picks two adjacent tiles
 * to blend. The result replaces the Gray, consuming all three tiles.
 */

import type { Position, Grid, CellValue } from '@threes/game-logic';
import {
  tileColorIndex,
  GRAY_IDX,
  getValidMixTargets,
  catalystMixColorResult,
} from '@threes/game-logic';

export type MixPhase = 'idle' | 'selectingFirst' | 'selectingSecond';

export interface MixState {
  phase: MixPhase;
  /** Position of the Gray tile being sacrificed */
  grayPos: Position | null;
  /** First selected source tile */
  firstSelection: Position | null;
  /** All valid adjacent positions for next selection */
  validTargets: Position[];
  /** Prompt text to show above the board */
  promptText: string;
}

export function createMixState(): MixState {
  return {
    phase: 'idle',
    grayPos: null,
    firstSelection: null,
    validTargets: [],
    promptText: '',
  };
}

/**
 * Enter mix mode when user taps the Mix button on a Gray tile.
 */
export function startMix(state: MixState, grid: Grid, grayPos: Position): void {
  const val = grid[grayPos.row][grayPos.col];
  if (val === 0 || tileColorIndex(val) !== GRAY_IDX) return;

  const targets = getValidMixTargets(grid, grayPos);
  if (targets.length < 2) {
    // Not enough adjacent tiles to mix
    return;
  }

  state.phase = 'selectingFirst';
  state.grayPos = grayPos;
  state.firstSelection = null;
  state.validTargets = targets;
  state.promptText = 'Select first tile to mix';
}

/**
 * Handle a tile tap during mix selection.
 * Returns 'complete' with both positions when two valid tiles are chosen,
 * 'continue' if waiting for more input, or 'cancel' if tapped invalid area.
 */
export function mixSelectTile(
  state: MixState,
  grid: Grid,
  pos: Position,
): { result: 'complete'; src1: Position; src2: Position }
 | { result: 'continue' }
 | { result: 'cancel' } {
  if (state.phase === 'idle' || !state.grayPos) {
    return { result: 'cancel' };
  }

  // Tapping the Gray tile again cancels
  if (pos.row === state.grayPos.row && pos.col === state.grayPos.col) {
    cancelMix(state);
    return { result: 'cancel' };
  }

  // Check if tapped position is a valid target
  const isValid = state.validTargets.some(t => t.row === pos.row && t.col === pos.col);
  if (!isValid) {
    cancelMix(state);
    return { result: 'cancel' };
  }

  if (state.phase === 'selectingFirst') {
    state.firstSelection = pos;
    state.phase = 'selectingSecond';

    // Filter valid targets: must still be adjacent to Gray,
    // and produce a valid mix with the first selection
    const firstCI = tileColorIndex(grid[pos.row][pos.col]);
    state.validTargets = state.validTargets.filter(t => {
      if (t.row === pos.row && t.col === pos.col) return false;
      const ci2 = tileColorIndex(grid[t.row][t.col]);
      return catalystMixColorResult(firstCI, ci2) !== -1;
    });

    if (state.validTargets.length === 0) {
      // No valid second tile — cancel
      cancelMix(state);
      return { result: 'cancel' };
    }

    state.promptText = 'Select second tile to mix';
    return { result: 'continue' };
  }

  if (state.phase === 'selectingSecond' && state.firstSelection) {
    const src1 = state.firstSelection;
    const src2 = pos;
    cancelMix(state);
    return { result: 'complete', src1, src2 };
  }

  cancelMix(state);
  return { result: 'cancel' };
}

/**
 * Cancel mix mode and return to idle.
 */
export function cancelMix(state: MixState): void {
  state.phase = 'idle';
  state.grayPos = null;
  state.firstSelection = null;
  state.validTargets = [];
  state.promptText = '';
}

/**
 * Check if a position is in the valid targets list.
 */
export function isValidMixTarget(state: MixState, pos: Position): boolean {
  return state.validTargets.some(t => t.row === pos.row && t.col === pos.col);
}
