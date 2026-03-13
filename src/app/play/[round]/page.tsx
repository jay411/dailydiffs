'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePuzzle } from '@/hooks/usePuzzle';
import { useGameState, clearRoundStartTime } from '@/hooks/useGameState';
import { useGameSession } from '@/contexts/GameSessionContext';
import { GameCanvas } from '@/components/GameCanvas';
import { Timer } from '@/components/Timer';
import { getPuzzleDateForNow } from '@/lib/puzzle-date';

// Placeholder leaderboard — wire up to /api/leaderboard when ready
const PLACEHOLDER_LB = [
  { rank: 1, username: 'jayraval', score: 1240, streak: 7 },
  { rank: 2, username: 'ada_codes', score: 1180, streak: 5 },
  { rank: 3, username: 'bob_42', score: 1120, streak: 3 },
  { rank: 4, username: 'sara', score: 980, streak: 1 },
  { rank: 5, username: 'mike', score: 940, streak: 0 },
];

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

function rankColor(rank: number) {
  if (rank === 1) return 'text-amber-400 font-bold';
  if (rank === 2) return 'text-slate-400';
  if (rank === 3) return 'text-amber-700';
  return 'text-slate-500';
}

export default function PlayRoundPage() {
  const params = useParams();
  const router = useRouter();
  const round = Number(params?.round) || 1;
  const { puzzleDate } = getPuzzleDateForNow();
  const { puzzle, loading, error } = usePuzzle(puzzleDate, round);
  const totalDiffs = puzzle?.differences_json?.length ?? 5;
  const { foundIndices, markFound, allFound, timeSeconds } = useGameState(totalDiffs, {
    puzzleDate,
    round,
  });
  const { addRoundResult } = useGameSession();
  const [activeSheet, setActiveSheet] = useState<'scores' | 'group' | 'share' | null>(null);

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-900">
        <p className="text-slate-400 animate-pulse">Loading puzzle…</p>
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-slate-900">
        <p className="text-red-400">{error || 'Puzzle not found'}</p>
        <Link href="/play/1" className="text-emerald-500 hover:underline">Try again</Link>
      </div>
    );
  }

  const differences = puzzle.differences_json;

  function handleContinue() {
    addRoundResult({
      round,
      differencesFound: foundIndices.size,
      totalDifferences: differences.length,
      timeSeconds,
    });
    clearRoundStartTime(puzzleDate, round);
    if (round === 1) {
      router.push('/auth/login?next=/play/2');
    } else {
      router.push(round < 5 ? `/play/transition?from=${round}` : '/results');
    }
  }

  // Ticker text — duplicated so the loop is seamless
  const tickerSegment = PLACEHOLDER_LB.map(
    (e) =>
      `${RANK_EMOJI[e.rank - 1] ?? `${e.rank}.`} @${e.username} — ${e.score.toLocaleString()} pts${e.streak > 0 ? ` 🔥${e.streak}` : ''}`
  ).join('   ·   ');

  return (
    <div className="h-dvh flex flex-col bg-slate-900 overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 h-12 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <span className="font-extrabold text-base tracking-tight text-slate-100">DailyDiffs</span>
        <span className="text-slate-400 text-sm">Round {round}/5 · {puzzle.art_style}</span>
        <Timer seconds={timeSeconds} />
      </header>

      {/* ── Subheader — streak + username ── */}
      <div className="flex items-center gap-3 px-4 h-9 bg-slate-800/50 border-b border-slate-700/40 flex-shrink-0">
        <span className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
          🔥 — streak
        </span>
        <span className="text-xs text-slate-500 ml-auto hidden sm:block">Next puzzle: 8 AM</span>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex min-h-0">

        {/* Left panel — desktop only */}
        <aside className="hidden xl:flex w-60 bg-slate-800/40 border-r border-slate-700/40 flex-col p-4 gap-5 flex-shrink-0 overflow-y-auto">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Today&apos;s Top
            </p>
            {PLACEHOLDER_LB.map((e) => (
              <div
                key={e.rank}
                className="flex justify-between items-center py-1.5 border-b border-slate-700/40 text-sm"
              >
                <span className="text-slate-300 truncate max-w-[130px]">
                  {RANK_EMOJI[e.rank - 1] ?? `${e.rank}.`} @{e.username}
                </span>
                <span className={rankColor(e.rank)}>{e.score.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              My Group
            </p>
            <p className="text-xs text-slate-600 italic mb-2">No group yet</p>
            <button
              type="button"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              + Create or join a group
            </button>
          </div>
        </aside>

        {/* Center — game canvas */}
        <main className="flex-1 flex flex-col items-center justify-start xl:justify-center px-4 pt-4 pb-3 gap-3 min-w-0 min-h-0">
          <GameCanvas
            imageOriginalUrl={puzzle.image_original_url}
            imageModifiedUrl={puzzle.image_modified_url}
            differences={differences}
            foundIndices={foundIndices}
            onFound={markFound}
          />

          {/* Progress dots */}
          <div className="flex gap-2" aria-label="Difference progress">
            {differences.map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                  foundIndices.has(i) ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Completion banner */}
          {allFound && (
            <div className="flex flex-col items-center gap-3 mt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-base font-semibold text-emerald-400">
                All {differences.length} found in {timeSeconds}s! 🎉
              </p>
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold py-3 px-8 transition-all"
              >
                {round === 1
                  ? 'Continue — sign in to save score'
                  : round < 5
                  ? 'Next Round →'
                  : 'See Results'}
              </button>
            </div>
          )}
        </main>

        {/* Right panel — desktop only */}
        <aside className="hidden xl:flex w-44 bg-slate-800/40 border-l border-slate-700/40 flex-col p-4 gap-4 flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Share
            </p>
            <div className="flex gap-2">
              {[
                { icon: '𝕏', label: 'Twitter' },
                { icon: '📋', label: 'Copy' },
                { icon: '🔗', label: 'Link' },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg py-2 text-sm transition-colors"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          {/* Ad slot */}
          <div className="flex-1 bg-slate-900/60 border border-dashed border-slate-700/60 rounded-xl flex items-center justify-center">
            <span className="text-[10px] text-slate-700 uppercase tracking-widest rotate-0">
              Ad
            </span>
          </div>
        </aside>
      </div>

      {/* ── Bottom ticker — desktop only ── */}
      <div className="hidden xl:flex h-9 bg-slate-800/60 border-t border-slate-700/40 overflow-hidden items-center flex-shrink-0">
        {/* Duplicate content so seamless loop works: first half scrolls to reveal second copy */}
        <div
          className="whitespace-nowrap flex text-xs text-slate-500"
          style={{ animation: 'ticker 30s linear infinite' }}
        >
          <span className="pr-16">🏆&nbsp;&nbsp;{tickerSegment}</span>
          <span className="pr-16">🏆&nbsp;&nbsp;{tickerSegment}</span>
        </div>
      </div>

      {/* ── Mobile ad strip ── */}
      <div className="xl:hidden mx-3 mb-1.5 h-11 bg-slate-800/50 border border-dashed border-slate-700/40 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] text-slate-700 uppercase tracking-widest">Advertisement</span>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="xl:hidden flex h-14 bg-slate-800 border-t border-slate-700 flex-shrink-0">
        {(
          [
            { id: null, icon: '🎮', label: 'Game' },
            { id: 'scores', icon: '🏆', label: 'Scores' },
            { id: 'group', icon: '👥', label: 'Group' },
            { id: 'share', icon: '↗️', label: 'Share' },
          ] as const
        ).map(({ id, icon, label }) => {
          const isActive = id === null ? activeSheet === null : activeSheet === id;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActiveSheet(id === null ? null : activeSheet === id ? null : id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-sky-400' : 'text-slate-500'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Mobile bottom sheets ── */}
      {activeSheet && (
        <div
          className="xl:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setActiveSheet(null)}
        >
          <div
            className="absolute bottom-14 left-0 right-0 bg-slate-800 border-t border-slate-700 rounded-t-2xl pt-3 px-4 pb-6 max-h-[65vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4" />

            {(activeSheet === 'scores' || activeSheet === 'group') && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Today&apos;s Leaderboard
                </p>
                {PLACEHOLDER_LB.map((e) => (
                  <div
                    key={e.rank}
                    className="flex justify-between items-center py-2.5 border-b border-slate-700/60 text-sm"
                  >
                    <span className="text-slate-300">
                      {RANK_EMOJI[e.rank - 1] ?? `${e.rank}.`} @{e.username}
                    </span>
                    <span className={rankColor(e.rank)}>{e.score.toLocaleString()}</span>
                  </div>
                ))}
                <div className="mt-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    My Group
                  </p>
                  <p className="text-xs text-slate-600 italic mb-2">No group yet</p>
                  <button
                    type="button"
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    + Create or join a group
                  </button>
                </div>
              </>
            )}

            {activeSheet === 'share' && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Share Result
                </p>
                <div className="flex gap-3">
                  {[
                    { icon: '𝕏', label: 'Twitter' },
                    { icon: '📋', label: 'Copy' },
                    { icon: '🔗', label: 'Link' },
                  ].map(({ icon, label }) => (
                    <button
                      key={label}
                      type="button"
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl py-5 text-xl transition-colors"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
