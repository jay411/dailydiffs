'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useGameSession } from '@/contexts/GameSessionContext';
import { getPuzzleDateForNow } from '@/lib/puzzle-date';
import { InterstitialAd } from '@/components/ads/InterstitialAd';
import { RewardedVideoAd } from '@/components/ads/RewardedVideoAd';
import { trackEvent, EVENTS } from '@/lib/posthog';
import type { LeaderboardEntry } from '@/app/api/leaderboard/route';

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

export function TransitionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromParam = searchParams.get('from');
  const fromRound = fromParam ? parseInt(fromParam, 10) : 1;
  const nextRound = fromRound + 1;
  const isRound5Unlock = fromRound === 4;

  const { getRoundResult, totalScore, setWatchedAdForRound5 } = useGameSession();
  const roundResult = getRoundResult(fromRound);
  const { puzzleDate } = getPuzzleDateForNow();

  const [adComplete, setAdComplete] = useState(false);
  const [lbEntries, setLbEntries] = useState<LeaderboardEntry[]>([]);
  const [unlocking, setUnlocking] = useState(false);
  const redirectedRef = useRef(false);

  // Guard: from=5 or invalid — redirect to results
  useEffect(() => {
    if (fromRound >= 5 && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace('/results');
    }
  }, [fromRound, router]);

  // Fetch mini leaderboard
  useEffect(() => {
    fetch(`/api/leaderboard?date=${puzzleDate}&limit=5`)
      .then((r) => r.json())
      .then((data: { entries?: LeaderboardEntry[] }) => {
        if (data.entries) setLbEntries(data.entries);
      })
      .catch(() => {});
  }, [puzzleDate]);

  const handleInterstitialComplete = useCallback(() => {
    setAdComplete(true);
  }, []);

  const handleRewardedComplete = useCallback(async () => {
    setUnlocking(true);
    try {
      await fetch('/api/unlock-round5', { method: 'POST' });
    } catch {}
    setWatchedAdForRound5(true);
    setUnlocking(false);
    router.push('/play/5');
  }, [router, setWatchedAdForRound5]);

  const handleRewardedSkip = useCallback(() => {
    router.push('/results');
  }, [router]);

  if (fromRound >= 5) return null;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col pb-[50px] xl:pb-[90px]">
      {/* Header */}
      <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 flex-shrink-0">
        <span className="font-extrabold text-base tracking-tight text-slate-100">DailyDiffs</span>
        <span className="ml-auto text-slate-400 text-sm">
          Round {isRound5Unlock ? 5 : nextRound} of 5
        </span>
      </header>

      {/* Body — side-by-side desktop, stacked mobile */}
      <div className="flex-1 flex flex-col xl:flex-row">

        {/* Left / Top: round stats + mini leaderboard */}
        <div className="xl:w-1/2 xl:border-r border-b xl:border-b-0 border-slate-700/40 p-6 xl:p-8 flex flex-col gap-6">

          {/* Round result */}
          <div>
            <h1 className="text-lg font-bold text-slate-100 mb-4">
              ✅ Round {fromRound} Complete
            </h1>
            {roundResult ? (
              <div className="bg-slate-800/60 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Differences</span>
                  <span className="text-slate-200 font-semibold">
                    {roundResult.differencesFound} / {roundResult.totalDifferences}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Time</span>
                  <span className="text-slate-200 font-semibold">
                    {Math.round(roundResult.timeSeconds)}s
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-700 pt-2.5">
                  <span className="text-slate-400">Round score</span>
                  <span className="text-emerald-400 font-bold">
                    +{roundResult.roundScore.toLocaleString()} pts
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Session total</span>
                  <span className="text-slate-100 font-bold">
                    {totalScore.toLocaleString()} pts
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/60 rounded-xl p-4 text-sm text-slate-500 italic">
                No round data found.
              </div>
            )}
          </div>

          {/* Mini leaderboard */}
          {lbEntries.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                Today&apos;s Rankings
              </p>
              <div>
                {lbEntries.map((e) => (
                  <div
                    key={e.rank}
                    className={`flex justify-between items-center py-2 border-b border-slate-700/40 text-sm ${
                      e.is_current_user
                        ? 'bg-emerald-950/30 -mx-2 px-2 rounded text-emerald-400'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate max-w-[180px]">
                      {RANK_EMOJI[e.rank - 1] ?? `${e.rank}.`} @{e.username}
                      {e.is_current_user && (
                        <span className="text-emerald-500 text-[10px] ml-1">you</span>
                      )}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {e.score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/leaderboard"
                className="block mt-2 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                View full leaderboard →
              </Link>
            </div>
          )}
        </div>

        {/* Right / Bottom: ad + CTA */}
        <div className="xl:w-1/2 flex flex-col items-center justify-center p-6 xl:p-8 gap-4">
          {isRound5Unlock ? (
            <RewardedVideoAd
              onComplete={handleRewardedComplete}
              onSkip={handleRewardedSkip}
              loading={unlocking}
            />
          ) : (
            <>
              <InterstitialAd onComplete={handleInterstitialComplete} />

              {/* Next Round button — grayed out until countdown completes */}
              <Link
                href={`/play/${nextRound}`}
                aria-disabled={!adComplete}
                onClick={(e) => {
                  if (!adComplete) {
                    e.preventDefault();
                    return;
                  }
                  trackEvent(EVENTS.PUZZLE_STARTED, { round: nextRound });
                }}
                className={`w-full max-w-sm rounded-xl py-3 px-6 font-semibold text-center transition-all ${
                  adComplete
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed select-none'
                }`}
              >
                {adComplete ? `Round ${nextRound} →` : `Round ${nextRound} (wait…)`}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
