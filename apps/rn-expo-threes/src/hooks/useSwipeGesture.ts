/**
 * React hook for swipe gesture detection using PanResponder.
 * Implements axis-lock and minimum-distance thresholds from design tokens.
 */

import { useRef } from 'react';
import { PanResponder, type GestureResponderHandlers } from 'react-native';
import { SIZES, INPUT } from '@threes/design-tokens';
import type { Direction } from '@threes/game-logic';

export function useSwipeGesture(
  onSwipe: (direction: Direction) => void,
): GestureResponderHandlers {
  const minDist = Math.max(INPUT.minSwipeDistance, SIZES.tileWidth * 0.25);
  const busyRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderRelease: (_evt, gesture) => {
        if (busyRef.current) return;

        const { dx, dy } = gesture;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);

        if (Math.max(ax, ay) < minDist) return; // too short

        let direction: Direction | null = null;
        if (ax > ay * INPUT.axisLockRatio) {
          direction = dx > 0 ? 'right' : 'left';
        } else if (ay > ax * INPUT.axisLockRatio) {
          direction = dy > 0 ? 'down' : 'up';
        }

        if (direction) {
          busyRef.current = true;
          onSwipe(direction);
          setTimeout(() => { busyRef.current = false; }, 160);
        }
      },
    }),
  ).current;

  return panResponder.panHandlers;
}
