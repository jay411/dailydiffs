'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useGameState(totalDifferences: number) {
  const [foundIndices, setFoundIndices] = useState<Set<number>>(new Set());
  const [startTime] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((Math.floor((Date.now() - startTime) / 1000)));
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
