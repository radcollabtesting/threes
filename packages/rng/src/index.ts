/**
 * @threes/rng — Seeded pseudo-random number generator utilities.
 *
 * Uses the Mulberry32 algorithm: a simple, fast, 32-bit PRNG that produces
 * deterministic sequences given the same seed. This guarantees reproducible
 * gameplay when the same seed is provided.
 */

/**
 * Creates a seeded PRNG function that returns values in [0, 1).
 * Each call advances the internal state deterministically.
 *
 * @param seed - Integer seed value. Different seeds produce different sequences.
 * @returns A function that produces the next pseudo-random number in [0, 1).
 */
export function createRng(seed: number): () => number {
  // Ensure seed is a 32-bit integer
  let state = seed | 0;

  return function mulberry32(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates (Knuth) shuffle using the provided seeded RNG.
 * Returns a new array; does not mutate the input.
 */
export function shuffleArray<T>(arr: readonly T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Picks a uniformly random element from a non-empty array using the provided RNG.
 */
export function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Returns a random integer in [min, max) using the provided RNG.
 */
export function randomInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min));
}
