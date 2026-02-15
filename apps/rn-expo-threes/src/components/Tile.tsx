/**
 * A single tile — rounded rectangle with the tile's color.
 * Named colors (C, M, Y, R, G, B) display their letter.
 * Secondary/Brown/Black display as solid color with no label.
 * White dots in top-right corner indicate backward merge bonus.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZES } from '@threes/design-tokens';
import { tileHex, tileTextColor, tileLabel, tileDots, getMergePartners, encodeTile } from '@threes/game-logic';

interface TileProps {
  value: number;
  scale?: number;
}

export function Tile({ value, scale = 1 }: TileProps) {
  const fill = tileHex(value);
  const textColor = tileTextColor(value);
  const label = tileLabel(value);
  const dots = tileDots(value);
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
      accessibilityLabel={label ? `Tile ${label}${dots > 0 ? ` ${dots} dot${dots > 1 ? 's' : ''}` : ''}` : `Color tile`}
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
      {(() => {
        const partners = getMergePartners(value);
        if (partners.length === 0) return null;
        return (
          <View style={styles.hintsContainer}>
            {partners.map((ci, i) => (
              <View
                key={ci}
                style={[
                  styles.hintDot,
                  {
                    backgroundColor: tileHex(encodeTile(ci, 0)),
                    width: 5 * scale,
                    height: 5 * scale,
                    borderRadius: 2.5 * scale,
                    marginLeft: i > 0 ? 2 * scale : 0,
                  },
                ]}
              />
            ))}
          </View>
        );
      })()}
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
  hintsContainer: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  hintDot: {
    borderWidth: 0.5,
    borderColor: '#000000',
  },
});
