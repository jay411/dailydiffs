'use client';

import { useCallback, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
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

  return (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
      <div className="relative aspect-video w-full bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
        <Image
          src={imageOriginalUrl}
          alt="Original"
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized={imageOriginalUrl.startsWith('/')}
        />
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
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onClick={(e) => handleImageClick(e as unknown as React.MouseEvent<HTMLDivElement>)}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLDivElement).click()}
          aria-label="Tap to spot differences on original image"
        />
        {showMiss && (
          <div className="absolute inset-0 bg-red-500/20 pointer-events-none animate-pulse" aria-hidden />
        )}
      </div>
      <div className="relative aspect-video w-full bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
        <Image
          src={imageModifiedUrl}
          alt="Modified"
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized={imageModifiedUrl.startsWith('/')}
        />
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
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onClick={(e) => handleImageClick(e as unknown as React.MouseEvent<HTMLDivElement>)}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLDivElement).click()}
          aria-label="Tap to spot differences on modified image"
        />
        {showMiss && (
          <div className="absolute inset-0 bg-red-500/20 pointer-events-none animate-pulse" aria-hidden />
        )}
      </div>
    </div>
  );
}
