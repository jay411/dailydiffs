import { computeStreakAfterPlay } from '../streak';

describe('computeStreakAfterPlay', () => {
  it('starts streak at 1 when never played', () => {
    const result = computeStreakAfterPlay({
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedDate: null,
      today: '2026-03-11',
    });
    expect(result.newStreakCount).toBe(1);
    expect(result.newLongestStreak).toBe(1);
  });

  it('increments streak when last played yesterday', () => {
    const result = computeStreakAfterPlay({
      currentStreak: 3,
      longestStreak: 5,
      lastPlayedDate: '2026-03-10',
      today: '2026-03-11',
    });
    expect(result.newStreakCount).toBe(4);
    expect(result.newLongestStreak).toBe(5);
  });

  it('updates longest when new streak exceeds it', () => {
    const result = computeStreakAfterPlay({
      currentStreak: 6,
      longestStreak: 6,
      lastPlayedDate: '2026-03-10',
      today: '2026-03-11',
    });
    expect(result.newStreakCount).toBe(7);
    expect(result.newLongestStreak).toBe(7);
  });

  it('resets to 1 when last played was more than 1 day ago', () => {
    const result = computeStreakAfterPlay({
      currentStreak: 5,
      longestStreak: 10,
      lastPlayedDate: '2026-03-09',
      today: '2026-03-11',
    });
    expect(result.newStreakCount).toBe(1);
    expect(result.newLongestStreak).toBe(10);
  });

  it('keeps streak unchanged when already played today (same day)', () => {
    const result = computeStreakAfterPlay({
      currentStreak: 2,
      longestStreak: 2,
      lastPlayedDate: '2026-03-11',
      today: '2026-03-11',
    });
    expect(result.newStreakCount).toBe(2);
    expect(result.newLongestStreak).toBe(2);
  });
});
