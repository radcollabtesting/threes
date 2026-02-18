/**
 * Small CMY reference triangle showing base-tier cross-color merge rules:
 *   C + M → B,  M + Y → R,  Y + C → G
 *
 * Renders as an SVG-like triangle using absolute-positioned Views.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MixTriangleProps {
  scale: number;
}

export function MixTriangle({ scale }: MixTriangleProps) {
  const triSize = 36 * scale;
  const nodeR = 7 * scale;
  const h = triSize * Math.sqrt(3) / 2;

  // Relative positions within the container
  const containerW = triSize + nodeR * 2 + 4 * scale;
  const containerH = h + nodeR * 2 + 4 * scale;
  const cx = containerW / 2;
  const topY = nodeR + 2 * scale;

  // Vertices
  const cyanPos  = { x: cx, y: topY };
  const magPos   = { x: cx - triSize / 2, y: topY + h };
  const yelPos   = { x: cx + triSize / 2, y: topY + h };

  // Edge midpoints
  const midCM = { x: (cyanPos.x + magPos.x) / 2, y: (cyanPos.y + magPos.y) / 2 };
  const midMY = { x: (magPos.x + yelPos.x) / 2,  y: (magPos.y + yelPos.y) / 2 };
  const midYC = { x: (yelPos.x + cyanPos.x) / 2, y: (yelPos.y + cyanPos.y) / 2 };

  const fontSize = 8 * scale;
  const resultSize = nodeR * 1.1;

  return (
    <View style={{ width: containerW, height: containerH }}>
      {/* Result labels on edges */}
      {[
        { pos: midCM, label: 'B', color: '#5764F5', bg: 'rgba(0,0,0,0.7)' },
        { pos: midMY, label: 'R', color: '#EB5560', bg: 'rgba(0,0,0,0.7)' },
        { pos: midYC, label: 'G', color: '#77D054', bg: 'rgba(0,0,0,0.7)' },
      ].map((r, i) => (
        <View
          key={`result-${i}`}
          style={[styles.node, {
            left: r.pos.x - resultSize,
            top: r.pos.y - resultSize,
            width: resultSize * 2,
            height: resultSize * 2,
            borderRadius: resultSize,
            backgroundColor: r.bg,
          }]}
        >
          <Text style={[styles.label, { fontSize, color: r.color }]}>{r.label}</Text>
        </View>
      ))}

      {/* Vertex circles (C, M, Y) */}
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
