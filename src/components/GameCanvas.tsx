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

// Container is always aspect-[4/3]
const CONTAINER_RATIO = 4 / 3;

/**
 * Computes the rendered image frame within the container as percentages,
 * accounting for object-contain empty space (pillarboxing / letterboxing).
 * Returns CSS style values for left, top, width, height.
 */
function getImageFrame(nat: { w: number; h: number }) {
  const imageRatio = nat.w / nat.h;
  if (imageRatio < CONTAINER_RATIO) {
    // Image is taller → pillarboxing (empty left/right)
    const renderedWidthPct = (imageRatio / CONTAINER_RATIO) * 100;
    const offsetPct = (100 - renderedWidthPct) / 2;
    return { left: `${offsetPct}%`, top: '0%', width: `${renderedWidthPct}%`, height: '100%' };
  } else {
    // Image is wider → letterboxing (empty top/bottom)
    const renderedHeightPct = (CONTAINER_RATIO / imageRatio) * 100;
    const offsetPct = (100 - renderedHeightPct) / 2;
    return { left: '0%', top: `${offsetPct}%`, width: '100%', height: `${renderedHeightPct}%` };
  }
}

export function GameCanvas({
  imageOriginalUrl,
  imageModifiedUrl,
  differences,
  foundIndices,
  onFound,
}: Props) {
  const [showMiss, setShowMiss] = useState(false);
  // Stored in state (not ref) so the marker overlay re-renders after image loads.
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0) {
      setNaturalSize((prev) => prev ?? { w: img.naturalWidth, h: img.naturalHeight });
    }
  }, []);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      let xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      let yPercent = ((e.clientY - rect.top) / rect.height) * 100;

      // Remap container-space click to image-space coordinates.
      if (naturalSize) {
        const imageRatio = naturalSize.w / naturalSize.h;
        if (imageRatio < CONTAINER_RATIO) {
          const renderedWidthPct = (imageRatio / CONTAINER_RATIO) * 100;
          const offsetPct = (100 - renderedWidthPct) / 2;
          xPercent = (xPercent - offsetPct) / renderedWidthPct * 100;
        } else {
          const renderedHeightPct = (CONTAINER_RATIO / imageRatio) * 100;
          const offsetPct = (100 - renderedHeightPct) / 2;
          yPercent = (yPercent - offsetPct) / renderedHeightPct * 100;
        }
        // Click landed in empty letterbox/pillarbox area — ignore
        if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;
      }

      const idx = findDifferenceAt(xPercent, yPercent, differences, foundIndices);
      if (idx >= 0) {
        onFound(idx);
      } else {
        setShowMiss(true);
        setTimeout(() => setShowMiss(false), 300);
      }
    },
    [differences, foundIndices, onFound, naturalSize]
  );

  // Inner frame sits exactly over the rendered image area so marker
  // x/y percentages align with image coordinates, not container coordinates.
  const imageFrame = naturalSize ? getImageFrame(naturalSize) : null;

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
              onLoad={handleImageLoad}
            />
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider z-10 pointer-events-none">
              {label}
            </div>
            {imageFrame && (
              <div className="absolute pointer-events-none z-10" style={imageFrame}>
                {differences.map((d, i) => (
                  <DifferenceMarker
                    key={i}
                    xPercent={d.x}
                    yPercent={d.y}
                    radiusPercent={d.radius}
                    found={foundIndices.has(i)}
                  />
                ))}
              </div>
            )}
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
