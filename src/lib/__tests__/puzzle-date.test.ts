import {
  getPuzzleDateForNow,
  formatCountdownToUnlock,
} from '../puzzle-date';

describe('getPuzzleDateForNow', () => {
  it('returns today when at or after 8 AM', () => {
    const noon = new Date('2026-03-11T12:00:00');
    const result = getPuzzleDateForNow(noon);
    expect(result.puzzleDate).toBe('2026-03-11');
    expect(result.isBeforeUnlock).toBe(false);
    expect(result.hoursUntilUnlock).toBe(0);
    expect(result.minutesUntilUnlock).toBe(0);
  });

  it('returns yesterday and countdown when before 8 AM', () => {
    const sixAM = new Date('2026-03-11T06:00:00');
    const result = getPuzzleDateForNow(sixAM);
    expect(result.puzzleDate).toBe('2026-03-10');
    expect(result.isBeforeUnlock).toBe(true);
    expect(result.hoursUntilUnlock).toBe(2);
    expect(result.minutesUntilUnlock).toBe(0);
  });

  it('computes minutes until 8 AM correctly', () => {
    const sevenThirty = new Date('2026-03-11T07:30:00');
    const result = getPuzzleDateForNow(sevenThirty);
    expect(result.puzzleDate).toBe('2026-03-10');
    expect(result.isBeforeUnlock).toBe(true);
    expect(result.hoursUntilUnlock).toBe(0);
    expect(result.minutesUntilUnlock).toBe(30);
  });
});

describe('formatCountdownToUnlock', () => {
  it('returns empty string when at or after 8 AM', () => {
    expect(formatCountdownToUnlock(new Date('2026-03-11T08:00:00'))).toBe('');
    expect(formatCountdownToUnlock(new Date('2026-03-11T14:00:00'))).toBe('');
  });

  it('returns countdown string when before 8 AM', () => {
    const s = formatCountdownToUnlock(new Date('2026-03-11T06:00:00'));
    expect(s).toMatch(/\d+h \d+m/);
  });
});
