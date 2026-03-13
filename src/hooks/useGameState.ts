'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const TIMER_STORAGE_KEY = 'dailydiffs_round_start';
const FOUND_STORAGE_KEY = 'dailydiffs_round_found';

function getTimerKey(puzzleDate: string, round: number): string {
  return `${TIMER_STORAGE_KEY}_${puzzleDate}_${round}`;
}

function getFoundKey(puzzleDate: string, round: number): string {
  return `${FOUND_STORAGE_KEY}_${puzzleDate}_${round}`;
}

function readStoredStartTime(puzzleDate: string, round: number): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(getTimerKey(puzzleDate, round));
    if (!raw) return null;
    const t = parseInt(raw, 10);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

function writeStoredStartTime(puzzleDate: string, round: number, startTime: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(getTimerKey(puzzleDate, round), String(startTime));
  } catch {
    // ignore
  }
}

function readStoredFoundIndices(puzzleDate: string, round: number): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(getFoundKey(puzzleDate, round));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function writeStoredFoundIndices(puzzleDate: string, round: number, found: Set<number>): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(getFoundKey(puzzleDate, round), JSON.stringify([...found]));
  } catch {
    // ignore
  }
}

/** Call when leaving a round after completion so the next time they play this round they get a fresh timer. */
export function clearRoundStartTime(puzzleDate: string, round: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(getTimerKey(puzzleDate, round));
    sessionStorage.removeItem(getFoundKey(puzzleDate, round));
  } catch {
    // ignore
  }
}

export function useGameState(totalDifferences: number, options?: { puzzleDate: string; round: number }) {
  const storedStart = options ? readStoredStartTime(options.puzzleDate, options.round) : null;
  const [startTime] = useState(() => {
    const t = storedStart ?? Date.now();
    if (options && !storedStart) {
      writeStoredStartTime(options.puzzleDate, options.round, t);
    }
    return t;
  });

  const [foundIndices, setFoundIndices] = useState<Set<number>>(() =>
    options ? readStoredFoundIndices(options.puzzleDate, options.round) : new Set()
  );

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime]);

  const markFound = useCallback((index: number) => {
    setFoundIndices((prev) => {
      const next = new Set(prev);
      next.add(index);
      if (options) {
        writeStoredFoundIndices(options.puzzleDate, options.round, next);
      }
      return next;
    });
  }, [options]);

  const allFound = foundIndices.size >= totalDifferences;
  const timeSeconds = elapsedSeconds;

  return { foundIndices, markFound, allFound, timeSeconds };
}
