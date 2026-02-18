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
  Switch,
  useWindowDimensions,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import { COLORS, SIZES, BOARD, DARK_THEME, LIGHT_THEME, type ThemeColors } from '@threes/design-tokens';
import type { Direction } from '@threes/game-logic';
import { Board } from './Board';
import { NextTilePreview } from './NextTilePreview';
import { MixTriangle } from './MixTriangle';
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

  // Color blind mode: when true, letter labels shown on tiles
  const [colorBlindMode, setColorBlindMode] = useState(true);

  // Dark mode: defaults to device color scheme
  const deviceScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState(deviceScheme !== 'light');
  const theme = darkMode ? DARK_THEME : LIGHT_THEME;

  const handleSwipe = useCallback((dir: Direction) => {
    const ok = move(dir);
    if (!ok) {
      setShakeCounter(c => c + 1);
    }
  }, [move]);

  const panHandlers = useSwipeGesture(handleSwipe);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]} {...panHandlers}>
      {/* Settings toggles */}
      <View style={[styles.toggleGroup, { marginTop: 8 }]}>
        <View style={[styles.cbToggle]}>
          <Switch
            value={colorBlindMode}
            onValueChange={setColorBlindMode}
            trackColor={{ false: '#555', true: '#4CAF50' }}
            thumbColor="#FFF"
          />
          <Text style={[styles.cbLabel, { color: theme.uiText }]}>Color Blind</Text>
        </View>
        <View style={[styles.cbToggle]}>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#555', true: '#4CAF50' }}
            thumbColor="#FFF"
          />
          <Text style={[styles.cbLabel, { color: theme.uiText }]}>Dark Mode</Text>
        </View>
      </View>

      {/* Score + mix triangle row */}
      <View style={[styles.scoreRow, { marginTop: 30 * scale }]}>
        <View style={{ width: 60 * scale }} />
        <Text style={[styles.scoreText, { fontSize: 20 * scale, color: theme.scoreText }]}>
          Score: {state.score}
        </Text>
        <MixTriangle scale={scale} />
      </View>

      {/* Board area */}
      <View style={[styles.boardWrapper, { marginTop: (SIZES.boardTopOffset - 60) * scale }]}>
        <Board
          grid={state.grid}
          moveEvents={lastMoveEvents}
          scale={scale}
          shakeCounter={shakeCounter}
          colorBlindMode={colorBlindMode}
          emptyCellColor={theme.emptyCellSlot}
        />
      </View>

      {/* Next tile preview */}
      <NextTilePreview value={state.nextTile} scale={scale} colorBlindMode={colorBlindMode} />

      {/* Game over overlay */}
      {state.status === 'ended' && (
        <View style={[styles.overlay, { backgroundColor: theme.overlayBackground }]}>
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
    alignItems: 'center',
  },
  boardWrapper: {
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  scoreText: {
    fontWeight: 'bold',
  },
  toggleGroup: {
    alignSelf: 'flex-end',
    gap: 4,
  },
  cbToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    gap: 6,
  },
  cbLabel: {
    fontWeight: 'bold',
    fontSize: 12,
  },
});
