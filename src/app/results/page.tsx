'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useGameSession } from '@/contexts/GameSessionContext';
import { generateShareCard, buildShareText, type ShareCardData } from '@/lib/share-card';

type SessionCompleteResponse = {
  ok?: boolean;
  error?: string;
  streakCount?: number | null;
  longestStreak?: number | null;
  message?: string;
};

type LeaderboardRankResponse = {
  current_user_rank?: number | null;
  entries?: unknown[];
};

export default function ResultsPage() {
  const { roundResults, totalScore, totalTimeSeconds, resetSession } = useGameSession();
  const [streak, setStreak] = useState<{ count: number | null; longest: number | null }>({
    count: null,
    longest: null,
  });
  const [submitted, setSubmitted] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  const puzzleDate = new Date().toISOString().slice(0, 10);

  const fetchRank = useCallback(async () => {
    try {
      const res = await fetch(`/api/leaderboard?tab=daily&date=${puzzleDate}&limit=50`);
      const data: LeaderboardRankResponse = await res.json();
      if (data.current_user_rank != null) setMyRank(data.current_user_rank);
    } catch {}
  }, [puzzleDate]);

  useEffect(() => {
    if (roundResults.length === 0 || submitted) return;

    fetch('/api/session-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: puzzleDate,
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
        // Fetch rank after session is recorded
        fetchRank();
      })
      .catch(() => setSubmitted(true));
  }, [roundResults.length, totalScore, totalTimeSeconds, submitted, fetchRank, puzzleDate]);

  const shareData: ShareCardData = {
    date: puzzleDate,
    totalScore,
    totalTimeSeconds,
    diffsPerRound: roundResults.map((r) => r.differencesFound),
    streakCount: streak.count ?? 0,
  };

  async function handleShareTwitter() {
    const text = buildShareText(shareData);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function handleCopyText() {
    const text = buildShareText(shareData);
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {}
  }

  async function handleShareNative() {
    if (typeof navigator.share !== 'function') {
      handleCopyText();
      return;
    }
    setShareLoading(true);
    try {
      // Try to generate a share card PNG
      const pngDataUrl = await generateShareCard(shareData);
      if (pngDataUrl) {
        const blob = await (await fetch(pngDataUrl)).blob();
        const file = new File([blob], 'dailydiffs.png', { type: 'image/png' });
        await navigator.share({
          title: 'DailyDiffs',
          text: buildShareText(shareData),
          files: [file],
        });
      } else {
        await navigator.share({ title: 'DailyDiffs', text: buildShareText(shareData) });
      }
    } catch {
      // Share cancelled or unsupported — fallback to copy
      handleCopyText();
    } finally {
      setShareLoading(false);
    }
  }

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
              Total: {totalScore.toLocaleString()} pts · {Math.round(totalTimeSeconds)}s
            </p>

            {/* Your Rank widget */}
            {myRank != null && (
              <div className="bg-emerald-950/40 border border-emerald-900/40 rounded-xl py-3 px-4 flex items-center justify-center gap-2">
                <span className="text-2xl">
                  {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🏅'}
                </span>
                <span className="text-sm text-slate-300">
                  You ranked{' '}
                  <strong className="text-emerald-400 text-base">#{myRank}</strong> today
                </span>
              </div>
            )}

            {(streak.count !== null || streak.longest !== null) && (
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                🔥 Streak: {streak.count ?? 0} day{streak.count === 1 ? '' : 's'}
                {streak.longest != null && streak.longest > 0 && (
                  <> · Best: {streak.longest} days</>
                )}
              </p>
            )}

            {/* Share buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleShareTwitter}
                className="flex-1 bg-black hover:bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold transition-colors border border-slate-700"
              >
                𝕏 Share
              </button>
              <button
                type="button"
                onClick={handleCopyText}
                className="flex-1 bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 text-slate-200 rounded-xl py-3 text-sm font-semibold transition-colors"
              >
                {shareCopied ? '✓ Copied!' : '📋 Copy'}
              </button>
              <button
                type="button"
                onClick={handleShareNative}
                disabled={shareLoading}
                className="flex-1 bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-xl py-3 text-sm font-semibold transition-colors"
              >
                {shareLoading ? '…' : '↗️ Share'}
              </button>
            </div>
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
