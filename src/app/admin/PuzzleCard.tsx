'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { PendingPuzzle } from './page';
import { ExpandedPuzzleView } from './ExpandedPuzzleView';

const ART_STYLE_EMOJI: Record<string, string> = {
  cartoon: '🎨',
  pixel: '👾',
  watercolor: '🖌️',
  isometric: '🏠',
  photorealistic: '📷',
};

export function PuzzleCard({ puzzle, onAction }: { puzzle: PendingPuzzle; onAction: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzleId: puzzle.id }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? 'Approve failed');
      }
      onAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzleId: puzzle.id }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? 'Reject failed');
      }
      onAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-puzzles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: puzzle.date, roundNumber: puzzle.roundNumber }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? 'Regenerate failed');
      }
      onAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  const emoji = ART_STYLE_EMOJI[puzzle.artStyle] ?? '🖼️';

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        {/* Thumbnail */}
        <button
          type="button"
          className="relative aspect-square bg-slate-100 dark:bg-slate-700 w-full hover:opacity-90 transition-opacity"
          onClick={() => setExpanded(true)}
          aria-label={`Expand Round ${puzzle.roundNumber}`}
        >
          {puzzle.originalSignedUrl ? (
            <Image src={puzzle.originalSignedUrl} alt="Original" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex items-center justify-center h-full text-3xl">{emoji}</div>
          )}
        </button>

        <div className="p-2 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">R{puzzle.roundNumber} {emoji}</span>
            {puzzle.difficultyScore !== null && (
              <span className="text-xs text-slate-400">QA {puzzle.difficultyScore}/10</span>
            )}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 text-xs py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium"
            >
              ✓
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={loading}
              className="flex-1 text-xs py-1 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium"
            >
              ✗
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={loading}
              title="Regenerate"
              className="flex-1 text-xs py-1 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white font-medium"
            >
              {loading ? '…' : '🔄'}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <ExpandedPuzzleView puzzle={puzzle} onClose={() => setExpanded(false)} onApprove={handleApprove} onReject={handleReject} onRegenerate={handleRegenerate} />
      )}
    </>
  );
}
