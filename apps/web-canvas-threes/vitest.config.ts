import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@threes/game-logic': path.resolve(__dirname, '../../packages/game-logic/src/index.ts'),
      '@threes/design-tokens': path.resolve(__dirname, '../../packages/design-tokens/src/index.ts'),
      '@threes/rng': path.resolve(__dirname, '../../packages/rng/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
