import { findDifferenceAt } from '../difference-check';

describe('findDifferenceAt', () => {
  const diffs = [
    { x: 25, y: 40, radius: 5, description: 'a' },
    { x: 70, y: 15, radius: 4, description: 'b' },
    { x: 50, y: 80, radius: 6, description: 'c' },
  ];

  it('returns index when tap is inside a difference', () => {
    expect(findDifferenceAt(25, 40, diffs, new Set())).toBe(0);
    expect(findDifferenceAt(26, 41, diffs, new Set())).toBe(0);
    expect(findDifferenceAt(70, 15, diffs, new Set())).toBe(1);
    expect(findDifferenceAt(50, 80, diffs, new Set())).toBe(2);
  });

  it('returns -1 when tap is outside all differences', () => {
    expect(findDifferenceAt(0, 0, diffs, new Set())).toBe(-1);
    expect(findDifferenceAt(100, 100, diffs, new Set())).toBe(-1);
    expect(findDifferenceAt(30, 50, diffs, new Set())).toBe(-1);
  });

  it('returns -1 for already found differences', () => {
    expect(findDifferenceAt(25, 40, diffs, new Set([0]))).toBe(-1);
    expect(findDifferenceAt(70, 15, diffs, new Set([1]))).toBe(-1);
  });

  it('matches when tap is on the radius boundary', () => {
    expect(findDifferenceAt(30, 40, diffs, new Set())).toBe(0); // 5% away horizontally
    expect(findDifferenceAt(25, 45, diffs, new Set())).toBe(0);
  });

  it('returns closest difference when circles overlap (not first in array)', () => {
    // Two circles that overlap: A at (20,50) r=15, B at (35,50) r=15. Tap at (28,50) is in both.
    const overlapping = [
      { x: 20, y: 50, radius: 15 },
      { x: 35, y: 50, radius: 15 },
    ];
    // Tap at (28,50): dist to A = 8, dist to B = 7 → should match B (index 1)
    expect(findDifferenceAt(28, 50, overlapping, new Set())).toBe(1);
    // Tap at (22,50): dist to A = 2, dist to B = 13 → should match A (index 0)
    expect(findDifferenceAt(22, 50, overlapping, new Set())).toBe(0);
  });
});
