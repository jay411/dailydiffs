/**
 * Unlock time is 8 AM in the user's local timezone (per GAMEPLAY.md).
 * Before 8 AM: yesterday's puzzle is still "today's" playable set; show countdown to next unlock.
 */

const UNLOCK_HOUR = 8;

export type PuzzleDateResult = {
  /** Date string (YYYY-MM-DD) to use for fetching puzzles */
  puzzleDate: string;
  /** True if it's before 8 AM local, so we're showing countdown / "yesterday" puzzle */
  isBeforeUnlock: boolean;
  /** Hours until 8 AM (0–23), only meaningful when isBeforeUnlock */
  hoursUntilUnlock: number;
  /** Minutes until next full hour (0–59) */
  minutesUntilUnlock: number;
};

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getPuzzleDateForNow(now: Date = new Date()): PuzzleDateResult {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const isBeforeUnlock = hours < UNLOCK_HOUR;

  if (isBeforeUnlock) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const totalMinutesUntil = UNLOCK_HOUR * 60 - (hours * 60 + minutes);
    const hoursUntil = Math.floor(totalMinutesUntil / 60);
    const minutesUntil = totalMinutesUntil % 60;
    return {
      puzzleDate: toDateString(yesterday),
      isBeforeUnlock: true,
      hoursUntilUnlock: Math.max(0, hoursUntil),
      minutesUntilUnlock: Math.max(0, minutesUntil),
    };
  }

  return {
    puzzleDate: toDateString(now),
    isBeforeUnlock: false,
    hoursUntilUnlock: 0,
    minutesUntilUnlock: 0,
  };
}

/** Human-readable countdown to 8 AM, e.g. "2h 30m" or "45m" */
export function formatCountdownToUnlock(now: Date = new Date()): string {
  const { isBeforeUnlock, hoursUntilUnlock, minutesUntilUnlock } =
    getPuzzleDateForNow(now);
  if (!isBeforeUnlock) return '';
  if (hoursUntilUnlock > 0) {
    return `${hoursUntilUnlock}h ${minutesUntilUnlock}m`;
  }
  return `${minutesUntilUnlock}m`;
}
