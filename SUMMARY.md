# Implementation Summary

## What Was Built

A color mixing tile game built on the Threes game engine. Instead of merging numbers, players merge colored tiles by sliding them together. Different colors combine to create new colors through RGB averaging, while same-colored tiles cannot merge.

---

## Game Mechanics

### Color System
Three base colors replace the original 1/2/3 number tiles:
- **Cyan (C)**: RGB(0.3, 1.0, 0.9) — displayed as `#4dffe6`
- **Magenta (M)**: RGB(0.9, 0.3, 1.0) — displayed as `#e64dff`
- **Yellow (Y)**: RGB(1.0, 0.8, 0.3) — displayed as `#ffcc4d`

### Merge Rules (Opposite of Threes)
- **Different colors CAN merge** — any two tiles with different RGB values combine
- **Same colors CANNOT merge** — identical tiles block each other
- Merge result: average the two RGB vectors, round each channel to nearest 0.1

### Color Mixing Results
| Mix | Result | Label | Tier |
|-----|--------|-------|------|
| C + M | (0.6, 0.7, 1.0) | B (Blue) | 1 |
| M + Y | (1.0, 0.6, 0.7) | R (Red) | 1 |
| C + Y | (0.7, 0.9, 0.6) | G (Green) | 1 |
| Blue + Y | deeper mix | — | 2 |
| Red + C | deeper mix | — | 2 |
| ... | converges toward gray | — | 3+ |

### Tile Display
- Base colors (C, M, Y) and primary mixes (R, G, B) show a letter label
- Deeper mixes display as solid color tiles with no letter
- Text color (black/white) chosen automatically based on luminance

### Scoring (Tier-Based)
| Tier | Colors | Score |
|------|--------|-------|
| 0 | C, M, Y (base) | 3 pts each |
| 1 | R, G, B (primary) | 9 pts each |
| 2 | Half blends | 27 pts each |
| 3+ | Deeper mixes | 3^(tier+1) pts |

Score is always enabled and displayed during gameplay.

### Data Model
Each tile encodes RGB color (channels 0–10, representing 0.0–1.0) plus a tier (merge depth) into a single integer:
```
id = tier * 1331 + r * 121 + g * 11 + b + 1
```
- 0 = empty cell
- Positive integers encode (r, g, b, tier)
- Rounding to 11 values per channel limits variance to 1331 unique colors
- This keeps the grid as `number[][]`, minimizing changes to movement/spawn logic

---

## Architecture

### Monorepo (npm workspaces)

```
threes/
├── packages/           Shared libraries (no UI)
│   ├── rng/            Seeded pseudo-random number generator (Mulberry32)
│   ├── design-tokens/  Visual constants (sizes, timing, input thresholds)
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
- Layout sizes, animation timings, input thresholds
- Removed hardcoded tile colors — colors now computed dynamically from tile data

#### `@threes/game-logic`
Core engine modules:
- **color.ts** — Tile encoding/decoding, RGB mixing, hex conversion, labels, base tile constants (CYAN, MAGENTA, YELLOW)
- **types.ts** — `Direction`, `Grid`, `GameConfig`, `MoveResult`, `MoveEvent`, etc.
- **config.ts** — `DEFAULT_CONFIG` with bag strategy and scoring enabled by default
- **board.ts** — Grid creation, cloning, empty-cell queries, color fixture board
- **merge.ts** — `canMerge(a, b)` returns true for different colors, `mergeResult(a, b)` calls `mixColors`
- **move.ts** — `applyMove(grid, direction)` with one-step movement, merge-once-per-turn enforcement, and animation event generation
- **spawn.ts** — Spawn-edge calculation and position selection with changed-line preference
- **next-tile.ts** — Bag and random generators producing only C/M/Y tiles
- **score.ts** — `scoreTile(v) = 3^(tier+1)` based on tile tier
- **game.ts** — `ThreesGame` class orchestrating the full turn flow

---

## Design Decisions

### Color Encoding as Numbers
Tile IDs are integers encoding (r, g, b, tier). This preserves `CellValue = number` and `Grid = number[][]`, meaning the movement engine, spawn logic, and board utilities required zero changes. Only merge rules, scoring, next-tile generation, and rendering needed updates.

### RGB Rounding to 0.1 Steps
Each RGB channel rounds to the nearest 0.1 (11 possible values: 0.0–1.0). This:
- Limits total unique colors to 1331
- Makes the game harder (colors converge toward gray with deep mixing)
- Makes visual differences more noticeable between tiles

### One-Step Movement (Preserved)
Tiles move exactly one cell per swipe, same as the original Threes mechanics.

### Merge-Once Flag (Preserved)
A 2D boolean array prevents chain reactions within a single turn.

### Spawn on Changed Lines (Preserved)
New tiles spawn on the opposite edge, preferring rows/columns that changed.

### Bag Generator (Default)
Pool of `[C×4, M×4, Y×4]` shuffled with seeded RNG, ensuring balanced color distribution.

### Scoring Always Enabled
The color game always tracks and displays score, unlike the original which had scoring behind a feature flag.

---

## Apps

### Web Canvas (`apps/web-canvas-threes`)
- **Vite** dev server with TypeScript
- **HTML5 Canvas** rendering with dynamic tile colors from `tileHex()` / `tileTextColor()`
- Score displayed at top of screen during gameplay
- Named colors show letter labels; deeper mixes show solid color only
- Query-param configuration: `?seed=`, `?fixture=1`, `?strategy=`, `?score=0`

### React Native Expo (`apps/rn-expo-threes`)
- **Expo SDK 52** with TypeScript
- Tile component uses `tileHex()`, `tileTextColor()`, `tileLabel()` from game-logic
- Score displayed above the board
- Accessibility labels use color names where available

---

## Tests

### Game-Logic Test Suite (Jest / ts-jest)
6 test files, 82 tests covering all game mechanics:

1. **color.test.ts** — Encoding/decoding round-trips, base tile constants, RGB/tier extraction, same-color detection, color mixing (C+M=Blue, M+Y=Red, C+Y=Green), commutativity, hex output, text color contrast, named labels
2. **merge.test.ts** — Different colors merge, same colors don't, empty cells don't, merged colors can merge with others, merge-once enforcement
3. **move.test.ts** — One-step movement, no multi-cell slide, cascading fills, color merges during movement, merged-once enforcement, changedLines tracking, validity checks, game-over detection
4. **spawn.test.ts** — Correct spawn edge per direction, changed-line filtering, fallback cascade, null when board full
5. **game.test.ts** — Initialization with base colors, fixture mode, move mechanics, scoring, deterministic seeds, restart
6. **determinism.test.ts** — Identical seed → identical sequence, different seeds → different games, full replay reproducibility, bag generator determinism

---

## Spec Compliance Checklist

| Spec Item | Status |
|-----------|--------|
| 4×4 grid with color tiles | Done |
| Three base colors: Cyan, Magenta, Yellow | Done |
| Base colors display with C/M/Y letters | Done |
| Custom hex colors (C: #4dffe6, M: #e64dff, Y: #ffcc4d) | Done |
| Different colors can merge | Done |
| Same colors cannot merge | Done |
| RGB averaging for color mixing | Done |
| RGB rounded to nearest 0.1 | Done |
| C+M=Blue, M+Y=Red, C+Y=Green | Done |
| Primary colors labeled R/G/B | Done |
| Deeper mixes show color only (no letter) | Done |
| Tier-based scoring: 3, 9, 27, 81, ... | Done |
| Scoring always enabled | Done |
| One-step movement per swipe | Done |
| Merge-once-per-turn flag | Done |
| Only C/M/Y tiles spawn | Done |
| Bag next-tile generator (default) | Done |
| Spawn on opposite edge | Done |
| Seeded RNG for determinism | Done |
| Game-over when no valid moves | Done |
| Animations (slide, merge pop, spawn, shake) | Done |
| Swipe detection with axis-lock | Done |
| Keyboard controls (web) | Done |
| Score display during gameplay | Done |
| Per-tile score labels on game over | Done |
| Unit tests for all core rules (82 tests) | Done |
