'use client';

export function Timer({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <time dateTime={`PT${m}M${s}S`} className="tabular-nums font-medium">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </time>
  );
}
