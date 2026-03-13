'use client';

import Image from 'next/image';
import type { PendingPuzzle } from './page';
import { DifferenceMarker } from '@/components/DifferenceMarker';

export function ExpandedPuzzleView({
  puzzle,
  onClose,
  onApprove,
  onReject,
  onRegenerate,
}: {
  puzzle: PendingPuzzle;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRegenerate: () => void;
}) {
  const foundSet = new Set<number>();

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Puzzle expanded view"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {puzzle.date} · Round {puzzle.roundNumber} · {puzzle.artStyle}
            {puzzle.difficultyScore !== null && <span className="ml-2 text-sm text-slate-400">QA {puzzle.difficultyScore}/10</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Side-by-side images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Original */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Original</p>
            <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
              {puzzle.originalSignedUrl && (
                <Image src={puzzle.originalSignedUrl} alt="Original" fill className="object-contain" unoptimized />
              )}
            </div>
          </div>
          {/* Modified with difference markers */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Modified (differences circled)</p>
            <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
              {puzzle.modifiedSignedUrl && (
                <Image src={puzzle.modifiedSignedUrl} alt="Modified" fill className="object-contain" unoptimized />
              )}
              {puzzle.differences.map((d, i) => (
                <DifferenceMarker
                  key={i}
                  xPercent={d.x}
                  yPercent={d.y}
                  radiusPercent={d.radius}
                  found={foundSet.has(i)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Differences list */}
        {puzzle.differences.length > 0 && (
          <ul className="mb-4 space-y-1">
            {puzzle.differences.map((d, i) => (
              <li key={i} className="text-sm text-slate-600 dark:text-slate-300">
                {i + 1}. {d.description ?? `Difference at (${d.x.toFixed(0)}%, ${d.y.toFixed(0)}%)`}
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => { onReject(); onClose(); }}
            className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm"
          >
            ✗ Reject
          </button>
          <button
            type="button"
            onClick={() => { onRegenerate(); onClose(); }}
            className="px-5 py-2 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-semibold text-sm"
          >
            🔄 Regenerate
          </button>
          <button
            type="button"
            onClick={() => { onApprove(); onClose(); }}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
          >
            ✓ Approve
          </button>
        </div>
      </div>
    </div>
  );
}
