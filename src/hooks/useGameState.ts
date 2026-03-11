'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const TIMER_STORAGE_KEY = 'dailydiffs_round_start';

function getStorageKey(puzzleDate: string, round: number): string {
  return `${TIMER_STORAGE_KEY}_${puzzleDate}_${round}`;
}

function readStoredStartTime(puzzleDate: string, round: number): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(getStorageKey(puzzleDate, round));
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
    sessionStorage.setItem(getStorageKey(puzzleDate, round), String(startTime));
  } catch {
    // ignore
  }
}

/** Call when leaving a round after completion so the next time they play this round they get a fresh timer. */
export function clearRoundStartTime(puzzleDate: string, round: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(getStorageKey(puzzleDate, round));
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
  const [foundIndices, setFoundIndices] = useState<Set<number>>(new Set());
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
      return next;
    });
  }, []);

  const allFound = foundIndices.size >= totalDifferences;
  const timeSeconds = elapsedSeconds;

  return { foundIndices, markFound, allFound, timeSeconds };
}
