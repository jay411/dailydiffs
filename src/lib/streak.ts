/**
 * Pure streak logic matching GAMEPLAY.md and DB trigger update_user_streak.
 * Used for testing and for any client-side display that needs to predict next streak.
 */

export type StreakInput = {
  /** Current streak count before this play */
  currentStreak: number;
  /** Longest streak so far */
  longestStreak: number;
  /** Last played date YYYY-MM-DD or null if never */
  lastPlayedDate: string | null;
  /** Today's date YYYY-MM-DD */
  today: string;
};

export type StreakResult = {
  newStreakCount: number;
  newLongestStreak: number;
};

function parseYYYYMMDD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const dA = parseYYYYMMDD(a);
  const dB = parseYYYYMMDD(b);
  return Math.round((dB.getTime() - dA.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Given user state and today's date, returns new streak count and longest streak
 * after recording a game played today.
 */
export function computeStreakAfterPlay(input: StreakInput): StreakResult {
  const { currentStreak, longestStreak, lastPlayedDate, today } = input;

  if (!lastPlayedDate) {
    return {
      newStreakCount: 1,
      newLongestStreak: Math.max(longestStreak, 1),
    };
  }

  const days = daysBetween(lastPlayedDate, today);

  if (days === 1) {
    const newCount = currentStreak + 1;
    return {
      newStreakCount: newCount,
      newLongestStreak: Math.max(longestStreak, newCount),
    };
  }

  if (days === 0) {
    return {
      newStreakCount: currentStreak,
      newLongestStreak: longestStreak,
    };
  }

  return {
    newStreakCount: 1,
    newLongestStreak: Math.max(longestStreak, 1),
  };
}
