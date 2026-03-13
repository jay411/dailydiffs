import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
  time_seconds: number;
  streak: number;
  is_current_user: boolean;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  current_user_rank: number | null;
  date: string;
  tab: 'daily' | 'alltime';
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') === 'alltime' ? 'alltime' : 'daily';
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100);
  const today = new Date().toISOString().slice(0, 10);
  const date =
    typeof searchParams.get('date') === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('date')!)
      ? searchParams.get('date')!
      : today;

  const supabase = await createServerSupabaseClient();

  // Get current user (optional — leaderboard is public)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  if (tab === 'daily') {
    // Join daily_leaderboard with users to get username + streak
    const { data, error } = await supabase
      .from('daily_leaderboard')
      .select('rank, total_score, total_time_seconds, user_id, users(username, streak_count)')
      .eq('date', date)
      .order('rank', { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const entries: LeaderboardEntry[] = (data ?? []).map((row: {
      rank: number;
      total_score: number;
      total_time_seconds: number;
      user_id: string;
      users: { username: string; streak_count: number } | null;
    }) => ({
      rank: row.rank,
      username: row.users?.username ?? 'unknown',
      score: row.total_score,
      time_seconds: row.total_time_seconds,
      streak: row.users?.streak_count ?? 0,
      is_current_user: row.user_id === currentUserId,
    }));

    const currentUserRank =
      entries.find((e) => e.is_current_user)?.rank ?? null;

    // If current user isn't in top N, fetch their rank separately
    let finalUserRank = currentUserRank;
    if (currentUserId && finalUserRank === null) {
      const { data: myRow } = await supabase
        .from('daily_leaderboard')
        .select('rank')
        .eq('date', date)
        .eq('user_id', currentUserId)
        .single();
      finalUserRank = myRow?.rank ?? null;
    }

    return NextResponse.json({
      entries,
      current_user_rank: finalUserRank,
      date,
      tab: 'daily',
    } satisfies LeaderboardResponse);
  }

  // All-time: sum total_score from game_sessions, rank by total
  const { data: allData, error: allError } = await supabase
    .from('game_sessions')
    .select('user_id, total_score, total_time_seconds, users(username, streak_count)')
    .order('total_score', { ascending: false });

  if (allError) {
    return NextResponse.json({ error: allError.message }, { status: 500 });
  }

  // Aggregate by user
  type UserAgg = {
    user_id: string;
    username: string;
    score: number;
    time_seconds: number;
    streak: number;
  };
  const aggregated = new Map<string, UserAgg>();
  for (const row of (allData ?? []) as {
    user_id: string;
    total_score: number;
    total_time_seconds: number;
    users: { username: string; streak_count: number } | null;
  }[]) {
    const existing = aggregated.get(row.user_id);
    if (existing) {
      existing.score += row.total_score;
      existing.time_seconds += row.total_time_seconds;
    } else {
      aggregated.set(row.user_id, {
        user_id: row.user_id,
        username: row.users?.username ?? 'unknown',
        score: row.total_score,
        time_seconds: row.total_time_seconds,
        streak: row.users?.streak_count ?? 0,
      });
    }
  }

  // Sort and rank
  const sorted = Array.from(aggregated.values()).sort(
    (a, b) => b.score - a.score || a.time_seconds - b.time_seconds,
  );

  const entries: LeaderboardEntry[] = sorted.slice(0, limit).map((u, i) => ({
    rank: i + 1,
    username: u.username,
    score: u.score,
    time_seconds: u.time_seconds,
    streak: u.streak,
    is_current_user: u.user_id === currentUserId,
  }));

  const currentUserRank = entries.find((e) => e.is_current_user)?.rank ?? null;
  let finalUserRank = currentUserRank;
  if (currentUserId && finalUserRank === null) {
    const idx = sorted.findIndex((u) => u.user_id === currentUserId);
    finalUserRank = idx >= 0 ? idx + 1 : null;
  }

  return NextResponse.json({
    entries,
    current_user_rank: finalUserRank,
    date,
    tab: 'alltime',
  } satisfies LeaderboardResponse);
}
