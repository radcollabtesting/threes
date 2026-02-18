/**
 * "Next" tile preview displayed below the board.
 * Shows the upcoming tile value with the correct color, and a "next" label.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '@threes/design-tokens';
import { tileLabel, tileMergeCombos } from '@threes/game-logic';
import { Tile } from './Tile';

interface NextTilePreviewProps {
  value: number;
  scale: number;
  colorBlindMode?: boolean;
}

export function NextTilePreview({ value, scale, colorBlindMode = true }: NextTilePreviewProps) {
  if (value === 0) return null;

  const label = tileLabel(value);
  const combos = tileMergeCombos(value);

  return (
    <View
      style={[styles.container, { marginTop: SIZES.nextTileGapFromBoard * scale }]}
      accessible
      accessibilityLabel={`Next tile: ${label ?? 'color'}`}
    >
      <Tile value={value} scale={scale} colorBlindMode={colorBlindMode} />
      <Text
        style={[
          styles.label,
          { fontSize: SIZES.nextLabelFontSize * scale, marginTop: SIZES.nextLabelGap * scale },
        ]}
      >
        next
      </Text>
      {combos.length > 0 && (
        <View style={[styles.comboRow, { marginTop: 4 * scale, gap: 4 * scale }]}>
          {combos.map((combo, i) => {
            const dotSize = 10 * scale;
            const fontSize = 7 * scale;
            return (
              <View key={i} style={[styles.comboItem, { gap: 2 * scale }]}>
                <View style={[styles.comboDot, {
                  width: dotSize, height: dotSize, borderRadius: dotSize / 2,
                  backgroundColor: combo.partnerHex,
                }]}>
                  <Text style={[styles.comboLabel, { fontSize, color: '#000' }]}>
                    {combo.partnerLabel}
                  </Text>
                </View>
                <Text style={[styles.arrow, { fontSize, color: COLORS.nextLabelText }]}>→</Text>
                <View style={[styles.comboDot, {
                  width: dotSize, height: dotSize, borderRadius: dotSize / 2,
                  backgroundColor: combo.resultHex,
                }]}>
                  <Text style={[styles.comboLabel, { fontSize, color: '#000' }]}>
                    {combo.resultLabel}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
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
  comboRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comboItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comboDot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  comboLabel: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  arrow: {
    fontWeight: 'bold',
  },
});
