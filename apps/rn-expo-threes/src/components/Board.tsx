/**
 * The 4×4 game board.
 * Renders empty cell slots as a background layer, then tiles on top.
 * Uses Animated for move/merge/spawn animations.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { COLORS, SIZES, ANIMATION } from '@threes/design-tokens';
import { tileColors } from '@threes/design-tokens';
import type { Grid, MoveEvent } from '@threes/game-logic';
import { canMerge, tileColorIndex, tileHex, encodeTile } from '@threes/game-logic';

interface MergeIndicators {
  left: number[];
  right: number[];
  top: number[];
  bottom: number[];
}

function getMergeIndicators(grid: Grid, row: number, col: number): MergeIndicators {
  const value = grid[row][col];
  const result: MergeIndicators = { left: [], right: [], top: [], bottom: [] };
  if (value === 0) return result;

  const addUnique = (arr: number[], ci: number) => {
    if (!arr.includes(ci)) arr.push(ci);
  };

  for (let c = 0; c < col; c++) {
    const other = grid[row][c];
    if (other !== 0 && canMerge(value, other)) addUnique(result.left, tileColorIndex(other));
  }
  for (let c = col + 1; c < SIZES.gridSize; c++) {
    const other = grid[row][c];
    if (other !== 0 && canMerge(value, other)) addUnique(result.right, tileColorIndex(other));
  }
  for (let r = 0; r < row; r++) {
    const other = grid[r][col];
    if (other !== 0 && canMerge(value, other)) addUnique(result.top, tileColorIndex(other));
  }
  for (let r = row + 1; r < SIZES.gridSize; r++) {
    const other = grid[r][col];
    if (other !== 0 && canMerge(value, other)) addUnique(result.bottom, tileColorIndex(other));
  }

  return result;
}

interface BoardProps {
  grid: Grid;
  moveEvents: MoveEvent[];
  scale: number;
  /** Triggers a shake animation when incremented */
  shakeCounter: number;
}

export function Board({ grid, moveEvents, scale, shakeCounter }: BoardProps) {
  const s = scale;
  const tw = SIZES.tileWidth * s;
  const th = SIZES.tileHeight * s;
  const gx = SIZES.gapX * s;
  const gy = SIZES.gapY * s;
  const br = SIZES.tileBorderRadius * s;

  const boardW = tw * SIZES.gridSize + gx * (SIZES.gridSize - 1);
  const boardH = th * SIZES.gridSize + gy * (SIZES.gridSize - 1);

  // ── Shake animation ────────────────────────────────────
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shakeCounter > 0) {
      shakeAnim.setValue(0);
      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: ANIMATION.shakeDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    }
  }, [shakeCounter]);

  const shakeTranslate = shakeAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -ANIMATION.shakeAmplitude * s, 0, ANIMATION.shakeAmplitude * s, 0],
  });

  // ── Spawn animations ───────────────────────────────────
  // Track which cells just spawned so we can animate them
  const spawnKeys = new Set<string>();
  for (const ev of moveEvents) {
    if (ev.type === 'spawn') {
      spawnKeys.add(`${ev.to.row},${ev.to.col}`);
    }
  }

  return (
    <Animated.View
      style={[
        styles.boardContainer,
        {
          width: boardW,
          height: boardH,
          transform: [{ translateX: shakeTranslate }],
        },
      ]}
      accessibilityRole="grid"
      accessibilityLabel="Game board"
    >
      {/* Empty cell slots */}
      {Array.from({ length: SIZES.gridSize }, (_, r) =>
        Array.from({ length: SIZES.gridSize }, (_, c) => (
          <View
            key={`slot-${r}-${c}`}
            style={[
              styles.cell,
              {
                width: tw,
                height: th,
                borderRadius: br,
                backgroundColor: COLORS.emptyCellSlot,
                position: 'absolute',
                left: c * (tw + gx),
                top: r * (th + gy),
              },
            ]}
          />
        )),
      )}

      {/* Tiles */}
      {grid.flatMap((row, r) =>
        row.map((val, c) => {
          if (val === 0) return null;
          const key = `${r},${c}`;
          const isSpawn = spawnKeys.has(key);
          const indicators = getMergeIndicators(grid, r, c);
          return (
            <AnimatedTile
              key={`tile-${r}-${c}-${val}`}
              value={val}
              row={r}
              col={c}
              tileWidth={tw}
              tileHeight={th}
              gapX={gx}
              gapY={gy}
              borderRadius={br}
              scale={s}
              animateSpawn={isSpawn}
              indicators={indicators}
            />
          );
        }),
      )}
    </Animated.View>
  );
}

/* ── Animated individual tile ──────────────────────────── */

interface AnimatedTileProps {
  value: number;
  row: number;
  col: number;
  tileWidth: number;
  tileHeight: number;
  gapX: number;
  gapY: number;
  borderRadius: number;
  scale: number;
  animateSpawn: boolean;
  indicators: MergeIndicators;
}

function AnimatedTile({
  value, row, col,
  tileWidth, tileHeight, gapX, gapY, borderRadius,
  scale, animateSpawn, indicators,
}: AnimatedTileProps) {
  const { fill, text } = tileColors(value);
  const fontSize = value >= 100
    ? SIZES.tileFontSizeLarge * scale
    : SIZES.tileFontSize * scale;

  const x = col * (tileWidth + gapX);
  const y = row * (tileHeight + gapY);

  // Spawn animation: fade + scale in
  const spawnAnim = useRef(new Animated.Value(animateSpawn ? 0 : 1)).current;

  useEffect(() => {
    if (animateSpawn) {
      spawnAnim.setValue(0);
      Animated.timing(spawnAnim, {
        toValue: 1,
        duration: ANIMATION.spawnDuration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [animateSpawn]);

  const animatedScale = spawnAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const lineW = 1 * scale;
  const lineL = 5 * scale;
  const gap = 2 * scale;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: tileWidth,
        height: tileHeight,
        borderRadius,
        backgroundColor: fill,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: spawnAnim,
        transform: [{ scale: animatedScale }],
      }}
      accessible
      accessibilityLabel={`Tile ${value} at row ${row + 1} column ${col + 1}`}
    >
      <Animated.Text
        style={{
          color: text,
          fontSize,
          fontWeight: 'bold',
        }}
      >
        {value}
      </Animated.Text>

      {/* Merge direction indicators */}
      {indicators.left.length > 0 && (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center' }}>
          {indicators.left.map((ci) => (
            <View key={ci} style={{ width: lineW, height: lineL, marginVertical: gap / 2, backgroundColor: tileHex(encodeTile(ci, 0)) }} />
          ))}
        </View>
      )}
      {indicators.right.length > 0 && (
        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' }}>
          {indicators.right.map((ci) => (
            <View key={ci} style={{ width: lineW, height: lineL, marginVertical: gap / 2, backgroundColor: tileHex(encodeTile(ci, 0)) }} />
          ))}
        </View>
      )}
      {indicators.top.length > 0 && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' }}>
          {indicators.top.map((ci) => (
            <View key={ci} style={{ width: lineL, height: lineW, marginHorizontal: gap / 2, backgroundColor: tileHex(encodeTile(ci, 0)) }} />
          ))}
        </View>
      )}
      {indicators.bottom.length > 0 && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' }}>
          {indicators.bottom.map((ci) => (
            <View key={ci} style={{ width: lineL, height: lineW, marginHorizontal: gap / 2, backgroundColor: tileHex(encodeTile(ci, 0)) }} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  boardContainer: {
    position: 'relative',
  },
  cell: {},
});
