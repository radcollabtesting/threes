/**
 * "Next" tile preview displayed below the board.
 * Shows the upcoming tile value with the correct color, and a "next" label.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '@threes/design-tokens';
import { tileLabel } from '@threes/game-logic';
import { Tile } from './Tile';

interface NextTilePreviewProps {
  value: number;
  scale: number;
}

export function NextTilePreview({ value, scale }: NextTilePreviewProps) {
  if (value === 0) return null;

  const label = tileLabel(value);
  return (
    <View
      style={[styles.container, { marginTop: SIZES.nextTileGapFromBoard * scale }]}
      accessible
      accessibilityLabel={`Next tile: ${label ?? 'color'}`}
    >
      <Tile value={value} scale={scale} />
      <Text
        style={[
          styles.label,
          { fontSize: SIZES.nextLabelFontSize * scale, marginTop: SIZES.nextLabelGap * scale },
        ]}
      >
        next
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    color: COLORS.nextLabelText,
    fontWeight: '400',
  },
});
