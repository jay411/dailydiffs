'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  calculateRoundScore,
  calculateSessionScore,
  type RoundResultInput,
} from '@/lib/scoring';

export type RoundResultEntry = RoundResultInput & { roundScore: number };

const STORAGE_KEY = 'dailydiffs_session';
const WATCHED_AD_KEY = 'dailydiffs_watched_ad_r5';

function loadWatchedAd(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(WATCHED_AD_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveWatchedAd(value: boolean) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(WATCHED_AD_KEY, String(value));
  } catch {}
}

function loadFromStorage(): RoundResultEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RoundResultEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(entries: RoundResultEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

type GameSessionContextValue = {
  roundResults: RoundResultEntry[];
  addRoundResult: (input: RoundResultInput) => void;
  resetSession: () => void;
  totalScore: number;
  totalTimeSeconds: number;
  getRoundResult: (round: number) => RoundResultEntry | undefined;
  watchedAdForRound5: boolean;
  setWatchedAdForRound5: (value: boolean) => void;
};

const GameSessionContext = createContext<GameSessionContextValue | null>(null);

export function GameSessionProvider({ children }: { children: ReactNode }) {
  const [roundResults, setRoundResults] = useState<RoundResultEntry[]>(loadFromStorage);
  const [watchedAdForRound5, setWatchedAdForRound5Raw] = useState<boolean>(loadWatchedAd);

  const setWatchedAdForRound5 = useCallback((value: boolean) => {
    setWatchedAdForRound5Raw(value);
    saveWatchedAd(value);
  }, []);

  const addRoundResult = useCallback((input: RoundResultInput) => {
    const { roundScore } = calculateRoundScore(input);
    const entry: RoundResultEntry = { ...input, roundScore };
    setRoundResults((prev) => {
      const filtered = prev.filter((r) => r.round !== input.round);
      const next = [...filtered, entry].sort((a, b) => a.round - b.round);
      saveToStorage(next);
      return next;
    });
  }, []);

  const resetSession = useCallback(() => {
    setRoundResults([]);
    saveToStorage([]);
    setWatchedAdForRound5Raw(false);
    saveWatchedAd(false);
  }, []);

  const getRoundResult = useCallback(
    (round: number) => roundResults.find((r) => r.round === round),
    [roundResults],
  );

  const { totalScore, totalTimeSeconds } = useMemo(
    () => calculateSessionScore(roundResults),
    [roundResults],
  );

  const value = useMemo<GameSessionContextValue>(
    () => ({
      roundResults,
      addRoundResult,
      resetSession,
      totalScore,
      totalTimeSeconds,
      getRoundResult,
      watchedAdForRound5,
      setWatchedAdForRound5,
    }),
    [
      roundResults,
      addRoundResult,
      resetSession,
      totalScore,
      totalTimeSeconds,
      getRoundResult,
      watchedAdForRound5,
      setWatchedAdForRound5,
    ],
  );

  return (
    <GameSessionContext.Provider value={value}>
      {children}
    </GameSessionContext.Provider>
  );
}

export function useGameSession() {
  const ctx = useContext(GameSessionContext);
  if (!ctx) {
    throw new Error('useGameSession must be used within GameSessionProvider');
  }
  return ctx;
}
