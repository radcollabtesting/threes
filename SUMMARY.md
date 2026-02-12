# Implementation Summary

## What Was Built

A complete Threes-like tile-merging game implemented as a TypeScript monorepo with two front-end apps sharing a common game-logic core.

---

## Architecture

### Monorepo (npm workspaces)

```
threes/
├── packages/           Shared libraries (no UI)
│   ├── rng/            Seeded pseudo-random number generator (Mulberry32)
│   ├── design-tokens/  Visual constants from the Figma reference
│   └── game-logic/     Pure game engine + Jest test suite
├── apps/
│   ├── web-canvas-threes/   HTML5 Canvas + Vite + TypeScript
│   └── rn-expo-threes/      React Native + Expo + TypeScript
```

### Package Details

#### `@threes/rng`
- **Mulberry32** PRNG — deterministic, fast, 32-bit
- Utilities: `createRng`, `shuffleArray`, `pickRandom`, `randomInt`
- Every random decision in the game flows through a seeded RNG instance

#### `@threes/design-tokens`
- All colors, sizes, animation timings, and input thresholds
- Derived directly from the Figma design reference screenshots
- `tileColors(value)` helper maps tile values to fill + text colors

#### `@threes/game-logic`
Core engine modules:
- **types.ts** — `Direction`, `Grid`, `GameConfig`, `MoveResult`, `MoveEvent`, etc.
- **config.ts** — `DEFAULT_CONFIG` with all spec-required defaults
- **board.ts** — Grid creation, cloning, empty-cell queries, fixture board
- **merge.ts** — `canMerge(a, b)` and `mergeResult(a, b)` per Threes rules
- **move.ts** — `applyMove(grid, direction)` with one-step movement, merge-once-per-turn enforcement, and animation event generation
- **spawn.ts** — Spawn-edge calculation and position selection with changed-line preference and fallback cascade
- **next-tile.ts** — Bag and random generators, both seeded
- **score.ts** — `scoreTile(v) = 3^(log₂(v/3)+1)` behind feature flag
- **game.ts** — `ThreesGame` class orchestrating the full turn flow

---

## Design Decisions

### One-Step Movement (Not Slide-to-Edge)
Unlike 2048, tiles move exactly one cell per swipe. Processing order is front-to-back relative to the swipe direction, so a tile that vacates its cell allows the trailing tile to advance into it.

### Merge-Once Flag
A 2D boolean array `merged[][]` tracks which destination cells have already received a merge this turn. This prevents chain reactions (e.g., `[3,3,3]` → `[6,3,_]` not `[6,_,_]`).

### Spawn on Changed Lines
`config.spawnOnlyOnChangedLine` (default: true) restricts spawn candidates to rows/columns that actually changed during the move. Falls back to any empty edge cell, then any empty cell on the board.

### Bag vs. Random Next-Tile
The default "bag" generator uses `[1×4, 2×4, 3×4]` shuffled with the seeded RNG, refilling when exhausted. This ensures balanced tile distribution.

### Feature Flags
- `scoringEnabled` (default: false) — design has no score UI
- `accessibilityDotEnabled` (default: false) — non-color cue for 1 vs 2 tiles
- `fixtureMode` (default: false) — loads the exact design-reference board

---

## Apps

### Web Canvas (`apps/web-canvas-threes`)
- **Vite** dev server with TypeScript
- **HTML5 Canvas** rendering (full custom renderer)
- `requestAnimationFrame` game loop
- Keyboard (arrow keys + R) and touch/mouse swipe input
- Animations: slide (120ms ease-out), merge pop (140ms), spawn fade-in (120ms), invalid-move shake (90ms)
- Query-param configuration: `?seed=`, `?fixture=1`, `?strategy=`, `?score=1`
- Responsive scaling based on viewport size

### React Native Expo (`apps/rn-expo-threes`)
- **Expo SDK 52** with TypeScript
- React components: `Board`, `Tile`, `NextTilePreview`, `GameScreen`
- Custom hooks: `useGame` (game state management), `useSwipeGesture` (PanResponder)
- `Animated` API for spawn fade-in and board shake
- Metro configured for monorepo workspace resolution
- Dev settings as constants in `GameScreen.tsx`

---

## Tests

### Game-Logic Test Suite (Jest / ts-jest)
5 test files covering the spec requirements:

1. **merge.test.ts** — All merge rules (1+2→3, n+n→2n, 1+1 no, 2+2 no, unequal no, empty no)
2. **move.test.ts** — One-step movement, no multi-cell slide, cascading fills, merge during move, merged-once enforcement, changedLines tracking, validity checks, game-over detection
3. **spawn.test.ts** — Correct spawn edge per direction, changed-line filtering, fallback cascade, null when board full
4. **game.test.ts** — Initialization, fixture mode, valid/invalid move contracts, spawn + next-tile update, restart
5. **determinism.test.ts** — Identical seed → identical sequence, different seeds → different games, full replay reproducibility, bag generator determinism

---

## Spec Compliance Checklist

| Spec Item | Status |
|-----------|--------|
| 4×4 grid, values 1/2/3/6/12/… | Done |
| One-step movement (not slide-to-edge) | Done |
| Merge rules (1+2→3, n+n→2n, no 1+1, no 2+2) | Done |
| Merge-once-per-turn flag | Done |
| Invalid move = no spawn, no turn consumed | Done |
| Spawn on opposite edge | Done |
| spawnOnlyOnChangedLine config (default true) | Done |
| Bag next-tile generator (default) | Done |
| Random next-tile generator (alternative) | Done |
| Seeded RNG for determinism | Done |
| Fixture mode (design reference board) | Done |
| 9 random start tiles (default) | Done |
| Scoring behind feature flag (default OFF) | Done |
| Game-over when no valid moves | Done |
| Design-matched colors and layout | Done |
| Animations (slide, merge pop, spawn, shake) | Done |
| Swipe detection with axis-lock | Done |
| Keyboard controls (web) | Done |
| Accessibility labels | Done |
| Reduced-motion respect (shake disabled) | Done |
| Shared game logic between both apps | Done |
| Unit tests for all core rules | Done |
