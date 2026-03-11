'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePuzzle } from '@/hooks/usePuzzle';
import { useGameState, clearRoundStartTime } from '@/hooks/useGameState';
import { useGameSession } from '@/contexts/GameSessionContext';
import { GameCanvas } from '@/components/GameCanvas';
import { Timer } from '@/components/Timer';
import { getPuzzleDateForNow } from '@/lib/puzzle-date';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-slate-600 dark:text-slate-400">Loading puzzle...</p>
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-red-600 dark:text-red-400">{error || 'Puzzle not found'}</p>
        <Link href="/" className="text-emerald-600 hover:underline">Back to home</Link>
      </div>
    );
  }

  const differences = puzzle.differences_json;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <Link href="/" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          DailyDiffs
        </Link>
        <span className="text-slate-600 dark:text-slate-400">
          Round {round}/5 · {puzzle.art_style}
        </span>
        <div className="flex items-center gap-4">
          <Timer seconds={timeSeconds} />
          <span className="text-slate-600 dark:text-slate-400">
            {foundIndices.size}/{differences.length} found
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 gap-4">
        <GameCanvas
          imageOriginalUrl={puzzle.image_original_url}
          imageModifiedUrl={puzzle.image_modified_url}
          differences={differences}
          foundIndices={foundIndices}
          onFound={markFound}
        />

        <div className="flex gap-2" aria-label="Difference progress">
          {differences.map((_, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full ${
                foundIndices.has(i) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>

        {allFound && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <p className="text-lg font-medium text-emerald-700 dark:text-emerald-400">
              All differences found in {timeSeconds}s!
            </p>
            {round === 1 ? (
              <Link
                href="/auth/login?next=/play/2"
                onClick={() => {
                  addRoundResult({
                    round,
                    differencesFound: foundIndices.size,
                    totalDifferences: differences.length,
                    timeSeconds,
                  });
                  clearRoundStartTime(puzzleDate, round);
                }}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6"
              >
                Continue to Round 2 (sign in)
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  addRoundResult({
                    round,
                    differencesFound: foundIndices.size,
                    totalDifferences: differences.length,
                    timeSeconds,
                  });
                  clearRoundStartTime(puzzleDate, round);
                  router.push(round < 5 ? `/play/transition?from=${round}` : '/results');
                }}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6"
              >
                {round < 5 ? 'Next round' : 'See results'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
