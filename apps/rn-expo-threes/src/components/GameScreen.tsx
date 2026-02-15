/**
 * Main game screen that composes the board, next-tile preview,
 * game-over overlay, and swipe gesture handling.
 *
 * Dev settings (toggle in code):
 *   FIXTURE_MODE — loads the design-reference board
 *   SEED         — RNG seed for deterministic play
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { COLORS, SIZES, BOARD } from '@threes/design-tokens';
import type { Direction } from '@threes/game-logic';
import { Board } from './Board';
import { NextTilePreview } from './NextTilePreview';
import { useGame } from '../hooks/useGame';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

/* ── Dev settings (toggle here) ────────────────────────── */
const FIXTURE_MODE = false;   // set true to load design-reference board
const SEED = 42;              // RNG seed
const STRATEGY: 'bag' | 'random' = 'bag';

export function GameScreen() {
  const { width: vw, height: vh } = useWindowDimensions();
  const { state, lastMoveEvents, move, restart } = useGame({
    fixtureMode: FIXTURE_MODE,
    seed: SEED,
    nextTileStrategy: STRATEGY,
  });

  // Compute uniform scale to fit the board layout on screen
  const neededH =
    SIZES.boardTopOffset +
    BOARD.height +
    SIZES.nextTileGapFromBoard +
    SIZES.tileHeight +
    SIZES.nextLabelGap +
    SIZES.nextLabelFontSize +
    40;
  const neededW = BOARD.width + 40;
  const scale = Math.min(vw / neededW, vh / neededH, 2.5);

  // Shake counter: incremented on invalid moves
  const [shakeCounter, setShakeCounter] = useState(0);

  const handleSwipe = useCallback((dir: Direction) => {
    const ok = move(dir);
    if (!ok) {
      setShakeCounter(c => c + 1);
    }
  }, [move]);

  const panHandlers = useSwipeGesture(handleSwipe);

  return (
    <View style={styles.root} {...panHandlers}>
      {/* Score display */}
      <View style={[styles.scoreWrapper, { marginTop: 30 * scale }]}>
        <Text style={[styles.scoreText, { fontSize: 20 * scale }]}>
          Score: {state.score}
        </Text>
      </View>

      {/* Board area */}
      <View style={[styles.boardWrapper, { marginTop: (SIZES.boardTopOffset - 60) * scale }]}>
        <Board
          grid={state.grid}
          moveEvents={lastMoveEvents}
          scale={scale}
          shakeCounter={shakeCounter}
        />
      </View>

      {/* Next tile preview */}
      <NextTilePreview value={state.nextTile} scale={scale} />

      {/* Game over overlay */}
      {state.status === 'ended' && (
        <View style={styles.overlay}>
          <Text style={[styles.gameOverText, { fontSize: 32 * scale }]}>
            Game Over
          </Text>
          <TouchableOpacity onPress={restart} style={styles.restartButton}>
            <Text style={[styles.restartText, { fontSize: 16 * scale }]}>
              Tap to restart
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  boardWrapper: {
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  restartButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  restartText: {
    color: '#FFF',
  },
  scoreWrapper: {
    alignItems: 'center',
  },
  scoreText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
