import type { Difference } from '@/types/puzzle';

/**
 * Check if a tap at (tapXPercent, tapYPercent) hits an unfound difference.
 * All coordinates are 0-100 percentage of image dimensions (same space as
 * rendered image in the 4:3 container with object-contain).
 *
 * When multiple difference circles overlap, returns the one whose *center* is
 * closest to the tap so the highlighted diff matches what the user clicked on.
 * Returns the index of the matched difference or -1.
 */
export function findDifferenceAt(
  tapXPercent: number,
  tapYPercent: number,
  differences: Difference[],
  foundIndices: Set<number>
): number {
  let bestIndex = -1;
  let bestDist = Infinity;

  for (let i = 0; i < differences.length; i++) {
    if (foundIndices.has(i)) continue;
    const d = differences[i];
    const dx = tapXPercent - d.x;
    const dy = tapYPercent - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const effectiveRadius = Math.max(d.radius, 5);
    if (dist <= effectiveRadius && dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return bestIndex;
}
