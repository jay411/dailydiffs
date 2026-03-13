'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { LeaderboardResponse, LeaderboardEntry } from '@/app/api/leaderboard/route';

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

function rankColor(rank: number) {
  if (rank === 1) return 'text-amber-400 font-bold';
  if (rank === 2) return 'text-slate-300 font-semibold';
  if (rank === 3) return 'text-amber-700 font-semibold';
  return 'text-slate-400';
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'daily' | 'alltime'>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const today = new Date().toISOString().slice(0, 10);
    const url =
      tab === 'daily'
        ? `/api/leaderboard?tab=daily&date=${today}&limit=50`
        : `/api/leaderboard?tab=alltime&limit=50`;

    fetch(url)
      .then((r) => r.json())
      .then((data: LeaderboardResponse & { error?: string }) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setEntries(data.entries ?? []);
        setMyRank(data.current_user_rank ?? null);
      })
      .catch(() => setError('Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-4 px-4 h-14 bg-slate-800 border-b border-slate-700">
        <Link href="/play/1" className="text-slate-400 hover:text-slate-200 transition-colors text-sm">
          ← Back
        </Link>
        <h1 className="font-extrabold text-base tracking-tight">Leaderboard</h1>
        {myRank && (
          <span className="ml-auto text-xs text-slate-400">
            Your rank: <span className="text-emerald-400 font-semibold">#{myRank}</span>
          </span>
        )}
      </header>

      {/* Tab switcher */}
      <div className="flex gap-1 p-4 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => setTab('daily')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'daily'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setTab('alltime')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'alltime'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          All-Time
        </button>
      </div>

      {/* Table */}
      <main className="max-w-2xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="flex justify-center py-16">
            <p className="text-slate-500 animate-pulse">Loading…</p>
          </div>
        ) : error ? (
          <p className="text-red-400 text-center py-16">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-500 text-center py-16 italic">
            {tab === 'daily' ? 'No one has played yet today. Be first!' : 'No scores yet.'}
          </p>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[40px_1fr_80px_70px] gap-x-3 text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-2 px-2">
              <span>#</span>
              <span>Player</span>
              <span className="text-right">Score</span>
              <span className="text-right">Time</span>
            </div>

            {entries.map((entry) => (
              <div
                key={entry.rank}
                className={`grid grid-cols-[40px_1fr_80px_70px] gap-x-3 items-center px-2 py-3 rounded-lg border-b border-slate-800 transition-colors ${
                  entry.is_current_user
                    ? 'bg-emerald-950/40 border-emerald-900/40'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                {/* Rank */}
                <span className={`text-sm ${rankColor(entry.rank)}`}>
                  {RANK_EMOJI[entry.rank - 1] ?? `${entry.rank}`}
                </span>

                {/* Username + streak */}
                <div className="min-w-0">
                  <span
                    className={`text-sm font-medium truncate block ${
                      entry.is_current_user ? 'text-emerald-400' : 'text-slate-200'
                    }`}
                  >
                    @{entry.username}
                    {entry.is_current_user && (
                      <span className="text-[10px] ml-1.5 text-emerald-600">you</span>
                    )}
                  </span>
                  {entry.streak > 0 && (
                    <span className="text-[10px] text-slate-600">🔥 {entry.streak}d</span>
                  )}
                </div>

                {/* Score */}
                <span className={`text-sm text-right tabular-nums ${rankColor(entry.rank)}`}>
                  {entry.score.toLocaleString()}
                </span>

                {/* Time */}
                <span className="text-xs text-slate-500 text-right tabular-nums">
                  {formatTime(entry.time_seconds)}
                </span>
              </div>
            ))}

            {/* Current user rank if not in top 50 */}
            {myRank && myRank > 50 && (
              <p className="text-center text-xs text-slate-500 mt-6">
                Your rank: <span className="text-emerald-400 font-semibold">#{myRank}</span> (not in top 50)
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
