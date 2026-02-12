/**
 * Score history persistence via localStorage.
 *
 * Stores scores as a JSON array (newest first).
 */

const STORAGE_KEY = 'threes-scores';

export interface ScoreEntry {
  score: number;
  date: string; // ISO 8601
}

/** Load all scores from localStorage, newest first. */
export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ScoreEntry[];
  } catch {
    return [];
  }
}

/**
 * Save a new score. Returns the updated list (newest first)
 * and the index of the newly added entry.
 */
export function saveScore(score: number): { scores: ScoreEntry[]; newIndex: number } {
  const scores = loadScores();
  const entry: ScoreEntry = {
    score,
    date: new Date().toISOString(),
  };
  scores.unshift(entry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // localStorage unavailable — scores won't persist
  }
  return { scores, newIndex: 0 };
}
