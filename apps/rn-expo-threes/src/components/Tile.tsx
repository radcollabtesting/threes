/**
 * A single tile — rounded rectangle with the tile value.
 * Colors and sizing follow the design tokens.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZES } from '@threes/design-tokens';
import { tileColors } from '@threes/design-tokens';

interface TileProps {
  value: number;
  scale?: number;
}

export function Tile({ value, scale = 1 }: TileProps) {
  const { fill, text } = tileColors(value);
  const w = SIZES.tileWidth * scale;
  const h = SIZES.tileHeight * scale;
  const fontSize = value >= 100
    ? SIZES.tileFontSizeLarge * scale
    : SIZES.tileFontSize * scale;

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
      accessibilityLabel={`Tile ${value}`}
      accessibilityRole="text"
    >
      <Text
        style={[
          styles.text,
          { color: text, fontSize },
        ]}
      >
        {value}
      </Text>
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
