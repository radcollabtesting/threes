/**
 * A single tile — rounded rectangle with the tile's color.
 * Named colors (C, M, Y, R, G, B) display their letter.
 * Deeper mixes display as solid color with no label.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZES } from '@threes/design-tokens';
import { tileHex, tileTextColor, tileLabel } from '@threes/game-logic';

interface TileProps {
  value: number;
  scale?: number;
}

export function Tile({ value, scale = 1 }: TileProps) {
  const fill = tileHex(value);
  const textColor = tileTextColor(value);
  const label = tileLabel(value);
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
        },
      ]}
      accessible
      accessibilityLabel={label ? `Tile ${label}` : `Color tile`}
      accessibilityRole="text"
    >
      {label && (
        <Text
          style={[
            styles.text,
            { color: textColor, fontSize },
          ]}
        >
          {label}
        </Text>
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
});
