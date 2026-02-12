/**
 * Audio manager for merge sound effects.
 *
 * Plays a random track from /audio/3/ or /audio/6/ whenever
 * a merge produces a tile of that value.
 */

const TRACK_COUNT = 5;

const pools: Record<number, HTMLAudioElement[]> = {
  3: Array.from({ length: TRACK_COUNT }, (_, i) => new Audio(`/audio/3/${i + 1}.mp3`)),
  6: Array.from({ length: TRACK_COUNT }, (_, i) => new Audio(`/audio/6/${i + 1}.mp3`)),
};

/** Play a random audio clip for the given merge value (3 or 6). */
export function playMergeSound(value: number): void {
  const pool = pools[value];
  if (!pool) return;

  const track = pool[Math.floor(Math.random() * pool.length)];
  track.currentTime = 0;
  track.play().catch(() => {
    // Browser may block autoplay before user interaction — ignore silently
  });
}
