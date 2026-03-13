import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getPuzzleDateForNow } from '@/lib/puzzle-date';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { puzzleDate } = getPuzzleDateForNow();

  const { error } = await supabase
    .from('game_sessions')
    .update({ watched_ad_for_round5: true })
    .eq('user_id', user.id)
    .eq('date', puzzleDate);

  if (error) {
    return NextResponse.json({ error: 'Failed to record ad watch' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
