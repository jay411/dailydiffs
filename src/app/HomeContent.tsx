'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPuzzleDateForNow, formatCountdownToUnlock } from '@/lib/puzzle-date';

type Profile = {
  username: string;
  streakCount: number;
  longestStreak: number;
  lastPlayedDate: string | null;
  totalGames: number;
};

export function HomeContent() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data: { profile?: Profile | null }) => {
        setProfile(data.profile ?? null);
      })
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    const update = () => {
      const { isBeforeUnlock } = getPuzzleDateForNow();
      setCountdown(isBeforeUnlock ? formatCountdownToUnlock() : '');
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  const streakLabel =
    profile != null
      ? `Streak: ${profile.streakCount} day${profile.streakCount === 1 ? '' : 's'}`
      : 'Streak: —';
  const nextLabel = countdown
    ? `Next puzzle in ${countdown}`
    : 'Next puzzle: 8 AM';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <main className="flex flex-col items-center gap-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          DailyDiffs
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-center">
          Spot the difference. 5 new puzzles every day at 8 AM.
        </p>
        <Link
          href="/play/1"
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 text-center transition-colors shadow-lg"
        >
          Play Today&apos;s Puzzle
        </Link>
        <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400">
          <span>{streakLabel}</span>
          <span>{nextLabel}</span>
        </div>
      </main>
    </div>
  );
}
