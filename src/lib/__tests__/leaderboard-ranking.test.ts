/**
 * Leaderboard ranking logic tests.
 * Tests the sort + rank algorithm used in /api/leaderboard (all-time tab)
 * and /api/groups/[id]/leaderboard without hitting the database.
 */

type UserSession = {
  user_id: string;
  username: string;
  total_score: number;
  total_time_seconds: number;
};

/** Mirrors the aggregation + sort logic in /api/leaderboard (alltime) */
function aggregateAndRank(
  sessions: UserSession[],
): Array<{ rank: number; user_id: string; score: number; time_seconds: number }> {
  const agg = new Map<string, { user_id: string; username: string; score: number; time_seconds: number }>();
  for (const s of sessions) {
    const existing = agg.get(s.user_id);
    if (existing) {
      existing.score += s.total_score;
      existing.time_seconds += s.total_time_seconds;
    } else {
      agg.set(s.user_id, {
        user_id: s.user_id,
        username: s.username,
        score: s.total_score,
        time_seconds: s.total_time_seconds,
      });
    }
  }

  return Array.from(agg.values())
    .sort((a, b) => b.score - a.score || a.time_seconds - b.time_seconds)
    .map((u, i) => ({ rank: i + 1, user_id: u.user_id, score: u.score, time_seconds: u.time_seconds }));
}

/** Mirrors daily group leaderboard sort in /api/groups/[id]/leaderboard */
function rankGroupEntries(
  entries: Array<{ user_id: string; total_score: number; total_time_seconds: number }>,
): Array<{ rank: number; user_id: string }> {
  return entries
    .sort((a, b) => b.total_score - a.total_score || a.total_time_seconds - b.total_time_seconds)
    .map((e, i) => ({ rank: i + 1, user_id: e.user_id }));
}

describe('leaderboard all-time aggregation and ranking', () => {
  it('ranks by total score descending', () => {
    const sessions: UserSession[] = [
      { user_id: 'u1', username: 'alice', total_score: 500, total_time_seconds: 120 },
      { user_id: 'u2', username: 'bob', total_score: 700, total_time_seconds: 90 },
      { user_id: 'u3', username: 'carol', total_score: 300, total_time_seconds: 200 },
    ];
    const ranked = aggregateAndRank(sessions);
    expect(ranked[0].user_id).toBe('u2');
    expect(ranked[1].user_id).toBe('u1');
    expect(ranked[2].user_id).toBe('u3');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[2].rank).toBe(3);
  });

  it('breaks ties by total_time_seconds ascending', () => {
    const sessions: UserSession[] = [
      { user_id: 'u1', username: 'fast', total_score: 800, total_time_seconds: 60 },
      { user_id: 'u2', username: 'slow', total_score: 800, total_time_seconds: 120 },
    ];
    const ranked = aggregateAndRank(sessions);
    expect(ranked[0].user_id).toBe('u1'); // faster time wins on tie
    expect(ranked[1].user_id).toBe('u2');
  });

  it('aggregates multiple sessions for the same user', () => {
    const sessions: UserSession[] = [
      { user_id: 'u1', username: 'alice', total_score: 400, total_time_seconds: 80 },
      { user_id: 'u1', username: 'alice', total_score: 600, total_time_seconds: 100 }, // second day
      { user_id: 'u2', username: 'bob', total_score: 900, total_time_seconds: 150 },
    ];
    const ranked = aggregateAndRank(sessions);
    // u1 total = 1000, u2 = 900 → u1 wins
    expect(ranked[0].user_id).toBe('u1');
    expect(ranked[0].score).toBe(1000);
    expect(ranked[1].user_id).toBe('u2');
    expect(ranked[1].score).toBe(900);
  });

  it('handles empty input', () => {
    expect(aggregateAndRank([])).toEqual([]);
  });

  it('handles single user', () => {
    const ranked = aggregateAndRank([
      { user_id: 'u1', username: 'solo', total_score: 250, total_time_seconds: 45 },
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].score).toBe(250);
  });

  it('assigns sequential ranks with no gaps', () => {
    const sessions: UserSession[] = [
      { user_id: 'u3', username: 'c', total_score: 100, total_time_seconds: 100 },
      { user_id: 'u1', username: 'a', total_score: 900, total_time_seconds: 50 },
      { user_id: 'u2', username: 'b', total_score: 500, total_time_seconds: 75 },
    ];
    const ranked = aggregateAndRank(sessions);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
});

describe('group leaderboard daily ranking', () => {
  it('ranks members by score descending', () => {
    const entries = [
      { user_id: 'u1', total_score: 300, total_time_seconds: 90 },
      { user_id: 'u2', total_score: 800, total_time_seconds: 60 },
      { user_id: 'u3', total_score: 500, total_time_seconds: 120 },
    ];
    const ranked = rankGroupEntries(entries);
    expect(ranked[0].user_id).toBe('u2');
    expect(ranked[1].user_id).toBe('u3');
    expect(ranked[2].user_id).toBe('u1');
  });

  it('breaks ties by time ascending', () => {
    const entries = [
      { user_id: 'u1', total_score: 600, total_time_seconds: 200 },
      { user_id: 'u2', total_score: 600, total_time_seconds: 100 },
    ];
    const ranked = rankGroupEntries(entries);
    expect(ranked[0].user_id).toBe('u2');
  });

  it('handles single member', () => {
    const ranked = rankGroupEntries([{ user_id: 'u1', total_score: 999, total_time_seconds: 30 }]);
    expect(ranked[0].rank).toBe(1);
  });
});

describe('share card text generation', () => {
  it('includes score and date in share text', () => {
    const { buildShareText } = require('../share-card') as typeof import('../share-card');
    const text = buildShareText({
      date: '2026-03-12',
      totalScore: 1234,
      totalTimeSeconds: 95,
      diffsPerRound: [5, 4, 5, 3, 5],
      streakCount: 7,
    });
    expect(text).toContain('2026-03-12');
    expect(text).toContain('1,234');
    expect(text).toContain('streak');
  });

  it('omits streak line when streak is 0', () => {
    const { buildShareText } = require('../share-card') as typeof import('../share-card');
    const text = buildShareText({
      date: '2026-03-12',
      totalScore: 500,
      totalTimeSeconds: 120,
      diffsPerRound: [5, 5],
      streakCount: 0,
    });
    expect(text).not.toContain('streak');
  });

  it('formats time in minutes when >= 60 seconds', () => {
    const { buildShareText } = require('../share-card') as typeof import('../share-card');
    const text = buildShareText({
      date: '2026-03-12',
      totalScore: 400,
      totalTimeSeconds: 125,
      diffsPerRound: [5],
      streakCount: 0,
    });
    expect(text).toMatch(/2m/);
  });
});
