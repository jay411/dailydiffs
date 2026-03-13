'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { findDifferenceAt } from '@/lib/difference-check';
import type { Difference } from '@/types/puzzle';
import { DifferenceMarker } from './DifferenceMarker';

type Props = {
  imageOriginalUrl: string;
  imageModifiedUrl: string;
  differences: Difference[];
  foundIndices: Set<number>;
  onFound: (index: number) => void;
};

export function GameCanvas({
  imageOriginalUrl,
  imageModifiedUrl,
  differences,
  foundIndices,
  onFound,
}: Props) {
  const [showMiss, setShowMiss] = useState(false);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
      const idx = findDifferenceAt(xPercent, yPercent, differences, foundIndices);
      if (idx >= 0) {
        onFound(idx);
      } else {
        setShowMiss(true);
        setTimeout(() => setShowMiss(false), 300);
      }
    },
    [differences, foundIndices, onFound]
  );

  const images = [
    { src: imageOriginalUrl, alt: 'Original', label: 'ORIGINAL' },
    { src: imageModifiedUrl, alt: 'Modified', label: 'MODIFIED' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {images.map(({ src, alt, label }) => (
        <div key={label} className="flex flex-col gap-2">
          <div className="relative aspect-[4/3] w-full bg-slate-800 rounded-xl overflow-hidden border border-slate-700/60">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-contain"
              sizes="(max-width: 1280px) 50vw, 40vw"
              unoptimized={src.startsWith('/')}
            />
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider z-10 pointer-events-none">
              {label}
            </div>
            {differences.map((d, i) => (
              <DifferenceMarker
                key={i}
                xPercent={d.x}
                yPercent={d.y}
                radiusPercent={d.radius}
                found={foundIndices.has(i)}
              />
            ))}
            <div
              role="button"
              tabIndex={0}
              className="absolute inset-0 w-full h-full cursor-crosshair z-20"
              onClick={(e) => handleImageClick(e as unknown as React.MouseEvent<HTMLDivElement>)}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLDivElement).click()}
              aria-label={`Tap to spot differences on ${alt.toLowerCase()} image`}
            />
            {showMiss && (
              <div className="absolute inset-0 bg-red-500/20 pointer-events-none animate-pulse z-30" aria-hidden />
            )}
          </div>
          <p className="text-center text-sm text-slate-400">
            <span className="text-emerald-400 font-semibold">{foundIndices.size}</span>
            <span className="text-slate-500">/{differences.length} found</span>
          </p>
        </div>
      ))}
    </div>
  );
}
