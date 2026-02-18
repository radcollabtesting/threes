/**
 * Nested CMY + RGB reference triangle showing all cross-color merge rules:
 *   Outer:  C + M → B,  M + Y → R,  Y + C → G
 *   Inner:  B + R → I,  R + G → O,  B + G → T
 *
 * Renders using absolute-positioned Views (no SVG lines needed).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MixTriangleProps {
  scale: number;
}

export function MixTriangle({ scale }: MixTriangleProps) {
  const triSize = 44 * scale;
  const nodeR = 7 * scale;
  const innerNodeR = 5.5 * scale;
  const h = triSize * Math.sqrt(3) / 2;

  // Relative positions within the container
  const containerW = triSize + nodeR * 2 + 4 * scale;
  const containerH = h + nodeR * 2 + 4 * scale;
  const cx = containerW / 2;
  const topY = nodeR + 2 * scale;

  // Outer vertices (C, M, Y)
  const cyanPos  = { x: cx, y: topY };
  const magPos   = { x: cx - triSize / 2, y: topY + h };
  const yelPos   = { x: cx + triSize / 2, y: topY + h };

  // Inner vertices (B, R, G) at outer edge midpoints
  const bluePos  = { x: (cyanPos.x + magPos.x) / 2, y: (cyanPos.y + magPos.y) / 2 };
  const redPos   = { x: (magPos.x + yelPos.x) / 2,  y: (magPos.y + yelPos.y) / 2 };
  const greenPos = { x: (yelPos.x + cyanPos.x) / 2, y: (yelPos.y + cyanPos.y) / 2 };

  // Inner edge midpoints (I, O, T)
  const midBR = { x: (bluePos.x + redPos.x) / 2, y: (bluePos.y + redPos.y) / 2 };
  const midRG = { x: (redPos.x + greenPos.x) / 2, y: (redPos.y + greenPos.y) / 2 };
  const midBG = { x: (bluePos.x + greenPos.x) / 2, y: (bluePos.y + greenPos.y) / 2 };

  const fontSize = 8 * scale;
  const smFontSize = 6 * scale;
  const resultSize = smFontSize * 0.7;

  return (
    <View style={{ width: containerW, height: containerH }}>
      {/* Inner result labels (I, O, T) */}
      {[
        { pos: midBR, label: 'I', color: '#964EF5' },
        { pos: midRG, label: 'O', color: '#E98028' },
        { pos: midBG, label: 'T', color: '#58AC91' },
      ].map((r, i) => (
        <View
          key={`inner-result-${i}`}
          style={[styles.node, {
            left: r.pos.x - resultSize,
            top: r.pos.y - resultSize,
            width: resultSize * 2,
            height: resultSize * 2,
            borderRadius: resultSize,
            backgroundColor: 'rgba(0,0,0,0.7)',
          }]}
        >
          <Text style={[styles.label, { fontSize: smFontSize, color: r.color }]}>{r.label}</Text>
        </View>
      ))}

      {/* Inner vertex circles (B, R, G) */}
      {[
        { pos: bluePos,  color: '#5764F5', label: 'B', textColor: '#FFF' },
        { pos: redPos,   color: '#EB5560', label: 'R', textColor: '#FFF' },
        { pos: greenPos, color: '#77D054', label: 'G', textColor: '#000' },
      ].map((v, i) => (
        <View
          key={`inner-vertex-${i}`}
          style={[styles.node, {
            left: v.pos.x - innerNodeR,
            top: v.pos.y - innerNodeR,
            width: innerNodeR * 2,
            height: innerNodeR * 2,
            borderRadius: innerNodeR,
            backgroundColor: v.color,
            borderWidth: 1 * scale,
            borderColor: '#000',
          }]}
        >
          <Text style={[styles.label, { fontSize: 7 * scale, color: v.textColor }]}>{v.label}</Text>
        </View>
      ))}

      {/* Outer vertex circles (C, M, Y) */}
      {[
        { pos: cyanPos, color: '#87FBE9', label: 'C', textColor: '#000' },
        { pos: magPos,  color: '#CA4DF2', label: 'M', textColor: '#FFF' },
        { pos: yelPos,  color: '#F4CF5F', label: 'Y', textColor: '#000' },
      ].map((v, i) => (
        <View
          key={`vertex-${i}`}
          style={[styles.node, {
            left: v.pos.x - nodeR,
            top: v.pos.y - nodeR,
            width: nodeR * 2,
            height: nodeR * 2,
            borderRadius: nodeR,
            backgroundColor: v.color,
            borderWidth: 1.5 * scale,
            borderColor: '#000',
          }]}
        >
          <Text style={[styles.label, { fontSize, color: v.textColor }]}>{v.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
