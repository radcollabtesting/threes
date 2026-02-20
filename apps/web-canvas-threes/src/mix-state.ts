/**
 * Mix selection state machine — REMOVED in the simplified shade game.
 *
 * Stubs kept so any leftover imports compile.
 */

import type { Position, Grid, CellValue } from '@threes/game-logic';

export type MixPhase = 'idle';

export interface MixState {
  phase: MixPhase;
  grayPos: Position | null;
  firstSelection: Position | null;
  secondSelection: Position | null;
  validTargets: Position[];
  promptText: string;
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

export function startMix(_state: MixState, _grid: Grid, _grayPos: Position): void {}
export function mixSelectTile(_state: MixState, _grid: Grid, _pos: Position): { result: 'cancel' } { return { result: 'cancel' }; }
export function confirmMix(_state: MixState): null { return null; }
export function cancelMix(_state: MixState): void {}
export function isValidMixTarget(_state: MixState, _pos: Position): boolean { return false; }
