/**
 * Mix selection state machine for the Gray catalyst mechanic.
 *
 * State flow:
 *   idle → selectingFirst → selectingSecond → previewing → idle
 *
 * The user taps "Mix" on a Gray tile, picks two adjacent tiles,
 * sees a preview of the result on the Gray, then confirms or cancels.
 */

import type { Position, Grid, CellValue } from '@threes/game-logic';
import {
  tileColorIndex,
  GRAY_IDX,
  getValidMixTargets,
  catalystMixColorResult,
  encodeTile,
} from '@threes/game-logic';

export type MixPhase = 'idle' | 'selectingFirst' | 'selectingSecond' | 'previewing';

export interface MixState {
  phase: MixPhase;
  /** Position of the Gray tile being sacrificed */
  grayPos: Position | null;
  /** First selected source tile */
  firstSelection: Position | null;
  /** Second selected source tile (set during previewing) */
  secondSelection: Position | null;
  /** All valid adjacent positions for next selection */
  validTargets: Position[];
  /** Prompt text to show above the board */
  promptText: string;
  /** Preview result tile value (shown on the Gray tile during previewing) */
  previewResultValue: CellValue | null;
}

export function createMixState(): MixState {
  return {
    phase: 'idle',
    grayPos: null,
    firstSelection: null,
    secondSelection: null,
    validTargets: [],
    promptText: '',
    previewResultValue: null,
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
  state.secondSelection = null;
  state.validTargets = targets;
  state.promptText = 'Select first tile to mix';
  state.previewResultValue = null;
}

/**
 * Handle a tile tap during mix selection.
 * Returns 'previewing' when both tiles are chosen (enters preview state),
 * 'continue' if waiting for more input, or 'cancel' if tapped invalid area.
 */
export function mixSelectTile(
  state: MixState,
  grid: Grid,
  pos: Position,
): { result: 'previewing' }
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
    // Compute preview result
    const ci1 = tileColorIndex(grid[state.firstSelection.row][state.firstSelection.col]);
    const ci2 = tileColorIndex(grid[pos.row][pos.col]);
    const resultCI = catalystMixColorResult(ci1, ci2);
    if (resultCI === -1) {
      cancelMix(state);
      return { result: 'cancel' };
    }

    state.secondSelection = pos;
    state.previewResultValue = encodeTile(resultCI, 0);
    state.phase = 'previewing';
    state.promptText = 'Preview — confirm or cancel';
    state.validTargets = [];
    return { result: 'previewing' };
  }

  cancelMix(state);
  return { result: 'cancel' };
}

/**
 * Confirm the previewed mix. Returns the positions needed to execute.
 */
export function confirmMix(state: MixState): {
  grayPos: Position;
  src1: Position;
  src2: Position;
} | null {
  if (state.phase !== 'previewing' || !state.grayPos || !state.firstSelection || !state.secondSelection) {
    return null;
  }
  const result = {
    grayPos: { row: state.grayPos.row, col: state.grayPos.col },
    src1: { row: state.firstSelection.row, col: state.firstSelection.col },
    src2: { row: state.secondSelection.row, col: state.secondSelection.col },
  };
  cancelMix(state);
  return result;
}

/**
 * Cancel mix mode and return to idle.
 */
export function cancelMix(state: MixState): void {
  state.phase = 'idle';
  state.grayPos = null;
  state.firstSelection = null;
  state.secondSelection = null;
  state.validTargets = [];
  state.promptText = '';
  state.previewResultValue = null;
}

/**
 * Check if a position is in the valid targets list.
 */
export function isValidMixTarget(state: MixState, pos: Position): boolean {
  return state.validTargets.some(t => t.row === pos.row && t.col === pos.col);
}
