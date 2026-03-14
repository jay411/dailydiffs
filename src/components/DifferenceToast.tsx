'use client';

type Props = {
  message: string | null;
};

/**
 * Small toast shown when the user finds a difference.
 * Renders nothing when message is null.
 */
export function DifferenceToast({ message }: Props) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute left-1/2 -translate-x-1/2 top-2 z-40 px-4 py-2 rounded-lg bg-emerald-900/95 border border-emerald-600/60 text-emerald-100 text-sm font-medium shadow-lg"
    >
      <span className="text-emerald-300 mr-1.5">✓</span>
      {message}
    </div>
  );
}
