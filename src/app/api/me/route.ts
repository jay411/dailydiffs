import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ user: null, profile: null }, { status: 200 });
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('username, streak_count, longest_streak, last_played_date, total_games')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json(
      { user: { id: user.id, email: user.email }, profile: null },
      { status: 200 },
    );
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile: {
      username: profile.username,
      streakCount: profile.streak_count ?? 0,
      longestStreak: profile.longest_streak ?? 0,
      lastPlayedDate: profile.last_played_date,
      totalGames: profile.total_games ?? 0,
    },
  });
}
