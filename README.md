# Threes — Monorepo

A Threes-like tile-merging game with two front-end implementations sharing a single game-logic core.

## Repository Structure

```
threes/
├── packages/
│   ├── rng/              Seeded PRNG (Mulberry32)
│   ├── design-tokens/    Colors, sizes, animation timing
│   └── game-logic/       Pure TS game engine (no UI)
├── apps/
│   ├── web-canvas-threes/  Vite + HTML5 Canvas app
│   └── rn-expo-threes/     React Native Expo app
├── package.json            Root workspace config
└── README.md
```

## Quick Start

### Install dependencies

```bash
npm install
```

### Run the Web (Canvas) app

```bash
npm run dev:web
# → opens http://localhost:5173
```

**Controls:** Arrow keys to move, R to restart. Touch/mouse swipe also works.

### Run the React Native (Expo) app

```bash
npm run dev:rn
# → starts Expo dev server; scan QR with Expo Go
```

### Run Tests

```bash
# Game-logic unit tests (Jest)
npm test

# Web app tests (Vitest) — if added
npm run test:web
```

## Configuration

### RNG Seed

Both apps accept a seed for deterministic gameplay:

- **Web:** query param `?seed=123`
- **RN:** edit `SEED` constant in `apps/rn-expo-threes/src/components/GameScreen.tsx`

### Fixture Mode (Design Reference Board)

Loads the exact board from the Figma design screenshot:

```
[3, 3, _, 2]
[6, _, _, 1]
[_, _, _, _]
[_, _, _, _]
next: 2
```

- **Web:** query param `?fixture=1`
- **RN:** set `FIXTURE_MODE = true` in `GameScreen.tsx`

### Next-Tile Strategy

- `bag` (default) — shuffled bag of [1×4, 2×4, 3×4]
- `random` — uniform random from {1, 2, 3}

**Web:** `?strategy=bag` or `?strategy=random`

### Scoring

Disabled by default (design has no score UI). Enable:

- **Web:** `?score=1`
- **RN:** add `scoringEnabled: true` to `useGame()` config

## Game Rules Summary

- 4×4 grid. Tile values: 1, 2, 3, 6, 12, 24, …
- Swipe moves all tiles **one cell** (not to edge)
- Merge: 1+2→3, n+n→2n (for n≥3). 1+1 and 2+2 do NOT merge.
- Each tile merges at most once per move
- New tile spawns on the **opposite edge** of the swipe direction
- Game ends when no valid move exists in any direction
