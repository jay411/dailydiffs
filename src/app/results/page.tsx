'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGameSession } from '@/contexts/GameSessionContext';

type SessionCompleteResponse = {
  ok?: boolean;
  error?: string;
  streakCount?: number | null;
  longestStreak?: number | null;
  message?: string;
};

export default function ResultsPage() {
  const { roundResults, totalScore, totalTimeSeconds, resetSession } =
    useGameSession();
  const [streak, setStreak] = useState<{
    count: number | null;
    longest: number | null;
  }>({ count: null, longest: null });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (roundResults.length === 0 || submitted) return;

    const date = new Date().toISOString().slice(0, 10);
    fetch('/api/session-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        roundsCompleted: roundResults.length,
        totalScore,
        totalTimeSeconds,
        watchedAdForRound5: false,
      }),
    })
      .then((res) => res.json() as Promise<SessionCompleteResponse>)
      .then((data) => {
        setSubmitted(true);
        if (data.ok && data.streakCount != null && data.longestStreak != null) {
          setStreak({ count: data.streakCount, longest: data.longestStreak });
        }
      })
      .catch(() => setSubmitted(true));
  }, [roundResults.length, totalScore, totalTimeSeconds, submitted]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
      <main className="max-w-sm w-full flex flex-col gap-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Session complete
        </h1>

        {roundResults.length > 0 ? (
          <>
            <div className="text-left space-y-2 text-sm text-slate-600 dark:text-slate-400">
              {roundResults.map((r) => (
                <div
                  key={r.round}
                  className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700"
                >
                  <span>Round {r.round}</span>
                  <span>
                    {r.differencesFound}/{r.totalDifferences} · {Math.round(r.timeSeconds)}s ·{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {r.roundScore} pts
                    </strong>
                  </span>
                </div>
              ))}
            </div>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Total: {totalScore} pts · {Math.round(totalTimeSeconds)}s
            </p>
            {(streak.count !== null || streak.longest !== null) && (
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                🔥 Streak: {streak.count ?? 0} day{streak.count === 1 ? '' : 's'}
                {streak.longest != null && streak.longest > 0 && (
                  <> · Best: {streak.longest} days</>
                )}
              </p>
            )}
          </>
        ) : (
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            No round data. Play a round to see results.
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            onClick={() => resetSession()}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6"
          >
            Back to home
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Leaderboard
          </Link>
        </div>
      </main>
    </div>
  );
}
