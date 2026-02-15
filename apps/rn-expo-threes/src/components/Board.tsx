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

interface MergeIndicator {
  colorIndex: number;
  blocked: boolean;
}

interface MergeIndicators {
  left: MergeIndicator[];
  right: MergeIndicator[];
  top: MergeIndicator[];
  bottom: MergeIndicator[];
}

function getMergeIndicators(grid: Grid, row: number, col: number): MergeIndicators {
  const value = grid[row][col];
  const result: MergeIndicators = { left: [], right: [], top: [], bottom: [] };
  if (value === 0) return result;

  const addUnique = (arr: MergeIndicator[], ci: number, blocked: boolean) => {
    if (!arr.some(i => i.colorIndex === ci)) arr.push({ colorIndex: ci, blocked });
  };

  // Scan left (from col-1 toward 0)
  let blocked = false;
  for (let c = col - 1; c >= 0; c--) {
    const other = grid[row][c];
    if (other !== 0) {
      if (canMerge(value, other)) addUnique(result.left, tileColorIndex(other), blocked);
      blocked = true;
    }
  }
  // Scan right (from col+1 toward end)
  blocked = false;
  for (let c = col + 1; c < SIZES.gridSize; c++) {
    const other = grid[row][c];
    if (other !== 0) {
      if (canMerge(value, other)) addUnique(result.right, tileColorIndex(other), blocked);
      blocked = true;
    }
  }
  // Scan up (from row-1 toward 0)
  blocked = false;
  for (let r = row - 1; r >= 0; r--) {
    const other = grid[r][col];
    if (other !== 0) {
      if (canMerge(value, other)) addUnique(result.top, tileColorIndex(other), blocked);
      blocked = true;
    }
  }
  // Scan down (from row+1 toward end)
  blocked = false;
  for (let r = row + 1; r < SIZES.gridSize; r++) {
    const other = grid[r][col];
    if (other !== 0) {
      if (canMerge(value, other)) addUnique(result.bottom, tileColorIndex(other), blocked);
      blocked = true;
    }
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

  const lineW = 2 * scale;
  const lineL = 8 * scale;
  const lineGap = 2 * scale;
  const dashOn = 2 * scale;
  const dashOff = 1 * scale;

  // Renders a solid or dashed indicator line
  const renderLine = (ind: MergeIndicator, isVertical: boolean) => {
    const color = tileHex(encodeTile(ind.colorIndex, 0));
    if (!ind.blocked) {
      return (
        <View
          key={ind.colorIndex}
          style={isVertical
            ? { width: lineW, height: lineL, marginVertical: lineGap / 2, backgroundColor: color }
            : { width: lineL, height: lineW, marginHorizontal: lineGap / 2, backgroundColor: color }
          }
        />
      );
    }
    // Dashed: alternating color/black segments (2px on, 1px off)
    const segments: React.ReactElement[] = [];
    let pos = 0;
    let segIdx = 0;
    while (pos < lineL) {
      const isOn = segIdx % 2 === 0;
      const segLen = Math.min(isOn ? dashOn : dashOff, lineL - pos);
      segments.push(
        <View
          key={segIdx}
          style={isVertical
            ? { width: lineW, height: segLen, backgroundColor: isOn ? color : '#000000' }
            : { width: segLen, height: lineW, backgroundColor: isOn ? color : '#000000' }
          }
        />,
      );
      pos += segLen;
      segIdx++;
    }
    return (
      <View
        key={ind.colorIndex}
        style={isVertical
          ? { marginVertical: lineGap / 2 }
          : { flexDirection: 'row', marginHorizontal: lineGap / 2 }
        }
      >
        {segments}
      </View>
    );
  };

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
        borderWidth: 2 * scale,
        borderColor: '#000000',
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
          {indicators.left.map(ind => renderLine(ind, true))}
        </View>
      )}
      {indicators.right.length > 0 && (
        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' }}>
          {indicators.right.map(ind => renderLine(ind, true))}
        </View>
      )}
      {indicators.top.length > 0 && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' }}>
          {indicators.top.map(ind => renderLine(ind, false))}
        </View>
      )}
      {indicators.bottom.length > 0 && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' }}>
          {indicators.bottom.map(ind => renderLine(ind, false))}
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
