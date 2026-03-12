'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminStats, PendingPuzzle } from './page';
import { PuzzleCard } from './PuzzleCard';

interface GenerateProgress {
  round: number;
  status: 'pending' | 'running' | 'done' | 'error';
  message?: string;
}

const ROUNDS = [1, 2, 3, 4, 5] as const;

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function groupByDate(puzzles: PendingPuzzle[]): Record<string, PendingPuzzle[]> {
  return puzzles.reduce<Record<string, PendingPuzzle[]>>((acc, p) => {
    (acc[p.date] ??= []).push(p);
    return acc;
  }, {});
}

export function AdminClient({ stats, pendingPuzzles }: { stats: AdminStats; pendingPuzzles: PendingPuzzle[] }) {
  const router = useRouter();
  const [generateDate, setGenerateDate] = useState(tomorrow());
  const [progress, setProgress] = useState<GenerateProgress[]>([]);
  const [generating, setGenerating] = useState(false);

  async function handleGenerateDay() {
    setGenerating(true);
    setProgress(ROUNDS.map(r => ({ round: r, status: 'pending' })));

    for (const round of ROUNDS) {
      setProgress(prev => prev.map(p => p.round === round ? { ...p, status: 'running' } : p));
      try {
        const res = await fetch('/api/generate-puzzles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: generateDate, roundNumber: round }),
        });
        const json = await res.json() as { success?: boolean; error?: string; qaScore?: number };
        if (!res.ok) throw new Error(json.error ?? 'Generation failed');
        setProgress(prev => prev.map(p =>
          p.round === round ? { ...p, status: 'done', message: `QA: ${json.qaScore}/10` } : p,
        ));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error';
        setProgress(prev => prev.map(p => p.round === round ? { ...p, status: 'error', message: msg } : p));
      }
    }

    setGenerating(false);
    router.refresh();
  }

  const grouped = groupByDate(pendingPuzzles);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">DailyDiffs Admin</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {([
          ['Queue', `${stats.approvedQueueDays} days`, 'bg-emerald-50 dark:bg-emerald-900/20'],
          ['Pending Review', `${stats.pendingCount} pairs`, 'bg-amber-50 dark:bg-amber-900/20'],
          ['Rejection Rate', `${stats.rejectionRate}%`, 'bg-slate-100 dark:bg-slate-800'],
        ] as const).map(([label, value, cls]) => (
          <div key={label} className={`rounded-xl p-4 ${cls}`}>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Generate */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 mb-8 border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-100">Generate Puzzles</h2>
        <div className="flex gap-3 items-end mb-4 flex-wrap">
          <div>
            <label className="block text-sm text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={generateDate}
              min={tomorrow()}
              onChange={e => setGenerateDate(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={handleGenerateDay}
            disabled={generating}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2 px-5 text-sm"
          >
            {generating ? 'Generating…' : 'Generate Day (5 rounds)'}
          </button>
        </div>

        {progress.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {progress.map(p => (
              <div key={p.round} className="flex items-center gap-1.5 text-sm">
                <span className={p.status === 'done' ? 'text-emerald-600' : p.status === 'error' ? 'text-red-500' : p.status === 'running' ? 'text-amber-500' : 'text-slate-400'}>
                  {p.status === 'done' ? '✓' : p.status === 'error' ? '✗' : p.status === 'running' ? '◌' : '○'}
                </span>
                <span className="text-slate-600 dark:text-slate-400">R{p.round}</span>
                {p.message && <span className="text-xs text-slate-400">{p.message}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review */}
      <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">Pending Review ({stats.pendingCount})</h2>
      {Object.keys(grouped).length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">No puzzles pending review.</p>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, puzzles]) => (
            <div key={date} className="mb-6">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">{date}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {puzzles
                  .sort((a, b) => a.roundNumber - b.roundNumber)
                  .map(puzzle => (
                    <PuzzleCard key={puzzle.id} puzzle={puzzle} onAction={() => router.refresh()} />
                  ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
