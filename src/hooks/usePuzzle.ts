'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { Puzzle, Difference } from '@/types/puzzle';

function parsePuzzle(row: { differences_json: unknown } & Record<string, unknown>): Puzzle {
  const diffs = Array.isArray(row.differences_json)
    ? (row.differences_json as Difference[])
    : (typeof row.differences_json === 'string'
        ? (JSON.parse(row.differences_json) as Difference[])
        : []);
  return { ...row, differences_json: diffs } as Puzzle;
}

/** Demo puzzle when Supabase is not configured or no published puzzle exists (Day 1 fallback). */
function getDemoPuzzle(roundNumber: number): Puzzle {
  const styles = ['cartoon', 'pixel', 'watercolor', 'isometric', 'photorealistic'];
  const base = 'https://placehold.co/600x400/e2e8f0/64748b?text=Original';
  const modified = 'https://placehold.co/600x400/cbd5e1/475569?text=Modified';
  const differences: Difference[] = [
    { x: 25, y: 40, radius: 5, description: 'diff 1' },
    { x: 70, y: 15, radius: 4, description: 'diff 2' },
    { x: 50, y: 80, radius: 6, description: 'diff 3' },
    { x: 10, y: 55, radius: 4, description: 'diff 4' },
    { x: 85, y: 65, radius: 5, description: 'diff 5' },
  ];
  return {
    id: 'demo',
    date: new Date().toISOString().slice(0, 10),
    round_number: roundNumber,
    art_style: styles[roundNumber - 1] ?? 'cartoon',
    image_original_url: base,
    image_modified_url: modified,
    differences_json: differences,
    status: 'published',
  };
}

export function usePuzzle(date: string, roundNumber: number) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPuzzle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: e } = await supabase
        .from('puzzles')
        .select('*')
        .eq('date', date)
        .eq('round_number', roundNumber)
        .eq('status', 'published')
        .single();
      if (e || !data) {
        setPuzzle(getDemoPuzzle(roundNumber));
        setError(null);
        return;
      }
      setPuzzle(parsePuzzle(data));
    } catch {
      setPuzzle(getDemoPuzzle(roundNumber));
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [date, roundNumber]);

  useEffect(() => {
    fetchPuzzle();
  }, [fetchPuzzle]);

  return { puzzle, loading, error, refetch: fetchPuzzle };
}
