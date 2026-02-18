/**
 * A single tile — rounded rectangle with the tile's color.
 * Named colors (C, M, Y, R, G, B) display their letter.
 * Secondary/Brown/Black display as solid color with no label.
 * White dots in top-right corner indicate scoring tier.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZES } from '@threes/design-tokens';
import { tileHex, tileTextColor, tileLabel, tileDisplayDots, tileNextHex, tileNextLabel } from '@threes/game-logic';

interface TileProps {
  value: number;
  scale?: number;
  /** When true, letter labels shown on tiles (default true) */
  colorBlindMode?: boolean;
}

export function Tile({ value, scale = 1, colorBlindMode = true }: TileProps) {
  const fill = tileHex(value);
  const textColor = tileTextColor(value);
  const label = tileLabel(value);
  const dots = tileDisplayDots(value);
  const nextHex = tileNextHex(value);
  const nextLbl = tileNextLabel(value);
  const w = SIZES.tileWidth * scale;
  const h = SIZES.tileHeight * scale;
  const fontSize = SIZES.tileFontSize * scale;

  return (
    <View
      style={[
        styles.tile,
        {
          width: w,
          height: h,
          borderRadius: SIZES.tileBorderRadius * scale,
          backgroundColor: fill,
          borderWidth: 2 * scale,
          borderColor: '#000000',
        },
      ]}
      accessible
      accessibilityLabel={label ? `Tile ${label}${nextLbl ? ` merges into ${nextLbl}` : ''}${dots > 0 ? ` ${dots} dot${dots > 1 ? 's' : ''}` : ''}` : `Color tile`}
      accessibilityRole="text"
    >
      {colorBlindMode && label && (
        <Text
          style={[
            styles.text,
            { color: textColor, fontSize },
          ]}
        >
          {label}
        </Text>
      )}
      {dots > 0 && (
        <View style={styles.dotsContainer}>
          {Array.from({ length: Math.min(dots, 5) }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: 6 * scale,
                  height: 6 * scale,
                  borderRadius: 3 * scale,
                  marginLeft: i > 0 ? 2 * scale : 0,
                },
              ]}
            />
          ))}
        </View>
      )}
      {nextHex && !colorBlindMode && (
        <View
          style={[
            styles.nextIndicator,
            {
              width: 3 * scale,
              height: 3 * scale,
              borderRadius: 1 * scale,
              backgroundColor: nextHex,
              borderWidth: 1 * scale,
              borderColor: '#000000',
              bottom: 3 * scale,
            },
          ]}
        />
      )}
      {nextHex && nextLbl && colorBlindMode && (
        <View style={[styles.nextLabelContainer, { bottom: 2 * scale }]}>
          <Text style={[styles.nextLabelText, { color: textColor, fontSize: 8 * scale }]}>
            {'\u2192 '}
          </Text>
          <View
            style={{
              width: 5 * scale,
              height: 5 * scale,
              borderRadius: 2.5 * scale,
              backgroundColor: nextHex,
              borderWidth: 0.5 * scale,
              borderColor: '#000000',
              marginRight: 2 * scale,
            }}
          />
          <Text style={[styles.nextLabelText, { color: textColor, fontSize: 8 * scale }]}>
            {nextLbl}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: 'bold',
  },
  dotsContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
  },
  dot: {
    backgroundColor: '#FFFFFF',
  },
  nextIndicator: {
    position: 'absolute',
    alignSelf: 'center',
  },
  nextLabelContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  nextLabelText: {
    fontWeight: 'bold',
  },
});
