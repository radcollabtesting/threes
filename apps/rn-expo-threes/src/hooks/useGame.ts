/**
 * React hook that owns a ThreesGame instance and exposes state + actions.
 * Forces re-render on every move so the UI stays in sync.
 */

import { useState, useCallback, useRef } from 'react';
import { ThreesGame, type Direction, type GameState, type GameConfig, type MoveEvent } from '@threes/game-logic';

export interface UseGameReturn {
  state: GameState;
  lastMoveEvents: MoveEvent[];
  /** Returns true if the move was valid */
  move: (dir: Direction) => boolean;
  restart: () => void;
}

export function useGame(configOverrides?: Partial<GameConfig>): UseGameReturn {
  const gameRef = useRef<ThreesGame>(new ThreesGame(configOverrides));
  const [state, setState] = useState<GameState>(gameRef.current.getState());
  const [lastMoveEvents, setLastMoveEvents] = useState<MoveEvent[]>([]);

  const move = useCallback((dir: Direction): boolean => {
    const game = gameRef.current;
    const ok = game.move(dir);
    if (ok) {
      setLastMoveEvents(game.lastMoveEvents);
    }
    // Always update state (even on invalid move the UI reads it)
    setState(game.getState());
    return ok;
  }, []);

  const restart = useCallback(() => {
    gameRef.current.restart();
    setLastMoveEvents([]);
    setState(gameRef.current.getState());
  }, []);

  return { state, lastMoveEvents, move, restart };
}
