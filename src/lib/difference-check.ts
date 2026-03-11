import type { Difference } from '@/types/puzzle';

/**
 * Check if a tap at (tapXPercent, tapYPercent) is within any unfound difference.
 * All coordinates are 0-100 percentage of image dimensions.
 * Returns the index of the matched difference or -1.
 */
export function findDifferenceAt(
  tapXPercent: number,
  tapYPercent: number,
  differences: Difference[],
  foundIndices: Set<number>
): number {
  for (let i = 0; i < differences.length; i++) {
    if (foundIndices.has(i)) continue;
    const d = differences[i];
    const dx = tapXPercent - d.x;
    const dy = tapYPercent - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= d.radius) return i;
  }
  return -1;
}
