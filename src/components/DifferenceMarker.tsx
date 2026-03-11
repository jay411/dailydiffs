'use client';

type Props = {
  xPercent: number;
  yPercent: number;
  radiusPercent: number;
  found: boolean;
};

export function DifferenceMarker({ xPercent, yPercent, radiusPercent, found }: Props) {
  if (!found) return null;
  return (
    <div
      className="absolute pointer-events-none rounded-full border-3 border-emerald-500 bg-emerald-400/30 animate-pulse"
      style={{
        left: `${xPercent}%`,
        top: `${yPercent}%`,
        width: `${radiusPercent * 2}%`,
        height: `${radiusPercent * 2}%`,
        transform: 'translate(-50%, -50%)',
      }}
      aria-hidden
    />
  );
}
