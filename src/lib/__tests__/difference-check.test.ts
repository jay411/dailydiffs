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
});
