import type { LeaderboardEntry, Player } from "@/types";

/** Maximum points awarded for an instant correct answer. */
export const MAX_POINTS = 1000;
/** Minimum points awarded for a correct answer at the very last moment. */
export const MIN_POINTS = 500;

/**
 * Calculate the score for a single answer.
 *
 * Mirrors Kahoot's behaviour: a correct answer earns between MIN_POINTS and
 * MAX_POINTS. The faster the response, the closer to MAX_POINTS. A wrong (or
 * missing) answer earns 0.
 *
 * @param isCorrect   Whether the chosen option was correct.
 * @param timeUsedMs  Milliseconds elapsed between question start and the answer.
 * @param durationMs  Total time allotted for the question (e.g. 20000).
 */
export function calculateScore(
  isCorrect: boolean,
  timeUsedMs: number,
  durationMs: number
): number {
  if (!isCorrect) return 0;

  // Clamp the fraction of time used into the [0, 1] range.
  const fraction = Math.min(Math.max(timeUsedMs / durationMs, 0), 1);

  // Linearly interpolate from MAX_POINTS (instant) down to MIN_POINTS (buzzer).
  const points = MAX_POINTS - (MAX_POINTS - MIN_POINTS) * fraction;

  return Math.round(points);
}

/**
 * Build a ranked leaderboard from the current player list.
 * Players are sorted by score (descending); ties are broken alphabetically so
 * the order is stable and deterministic.
 */
export function buildLeaderboard(players: Player[]): LeaderboardEntry[] {
  return [...players]
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
    .map((player, index) => ({
      rank: index + 1,
      username: player.username,
      score: player.score,
    }));
}
