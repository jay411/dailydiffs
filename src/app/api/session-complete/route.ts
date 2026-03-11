import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export type SessionCompleteBody = {
  date: string; // YYYY-MM-DD
  roundsCompleted: number;
  totalScore: number;
  totalTimeSeconds: number;
  watchedAdForRound5?: boolean;
};

export async function POST(request: Request) {
  let body: SessionCompleteBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const date =
    typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : null;
  const roundsCompleted =
    typeof body.roundsCompleted === 'number' && body.roundsCompleted >= 0
      ? Math.min(5, Math.floor(body.roundsCompleted))
      : null;
  const totalScore =
    typeof body.totalScore === 'number' && body.totalScore >= 0
      ? Math.floor(body.totalScore)
      : null;
  const totalTimeSeconds =
    typeof body.totalTimeSeconds === 'number' && body.totalTimeSeconds >= 0
      ? body.totalTimeSeconds
      : null;

  if (
    date === null ||
    roundsCompleted === null ||
    totalScore === null ||
    totalTimeSeconds === null
  ) {
    return NextResponse.json(
      { error: 'Missing or invalid date, roundsCompleted, totalScore, totalTimeSeconds' },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { error: upsertError } = await supabase.from('game_sessions').upsert(
    {
      user_id: user.id,
      date,
      rounds_completed: roundsCompleted,
      total_score: totalScore,
      total_time_seconds: totalTimeSeconds,
      watched_ad_for_round5: Boolean(body.watchedAdForRound5),
    },
    { onConflict: 'user_id,date' },
  );

  if (upsertError) {
    return NextResponse.json(
      { error: upsertError.message },
      { status: 500 },
    );
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('streak_count, longest_streak')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json(
      {
        ok: true,
        streakCount: null,
        longestStreak: null,
        message: 'Session saved; streak unavailable',
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    streakCount: userRow.streak_count ?? 0,
    longestStreak: userRow.longest_streak ?? 0,
  });
}
