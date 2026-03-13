import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: groupId } = await params;
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Verify caller is a member of the group
  const { data: membership } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
  }

  // Get group info
  const { data: group } = await supabase
    .from('groups')
    .select('id, name, invite_code')
    .eq('id', groupId)
    .single();

  // Get all member IDs
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  const memberIds = (members ?? []).map((m: { user_id: string }) => m.user_id);

  // Get today's scores for all members from daily_leaderboard
  const { data: scores, error } = await supabase
    .from('daily_leaderboard')
    .select('user_id, total_score, total_time_seconds, users(username, streak_count)')
    .eq('date', today)
    .in('user_id', memberIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sort by score desc, time asc, then add rank
  const sorted = ((scores ?? []) as {
    user_id: string;
    total_score: number;
    total_time_seconds: number;
    users: { username: string; streak_count: number } | null;
  }[])
    .sort((a, b) => b.total_score - a.total_score || a.total_time_seconds - b.total_time_seconds)
    .map((row, i) => ({
      rank: i + 1,
      username: row.users?.username ?? 'unknown',
      score: row.total_score,
      time_seconds: row.total_time_seconds,
      streak: row.users?.streak_count ?? 0,
      is_current_user: row.user_id === user.id,
    }));

  // Members who haven't played today appear at the bottom without a score
  const playedIds = new Set((scores ?? []).map((s: { user_id: string }) => s.user_id));
  const notPlayed = memberIds
    .filter((id) => !playedIds.has(id))
    .map((id) => ({ user_id: id }));

  // Fetch usernames for those who haven't played
  let notPlayedEntries: Array<{ rank: null; username: string; score: null; time_seconds: null; streak: number; is_current_user: boolean }> = [];
  if (notPlayed.length > 0) {
    const { data: userRows } = await supabase
      .from('users')
      .select('id, username, streak_count')
      .in('id', notPlayed.map((m) => m.user_id));
    notPlayedEntries = (userRows ?? []).map((u: { id: string; username: string; streak_count: number }) => ({
      rank: null,
      username: u.username,
      score: null,
      time_seconds: null,
      streak: u.streak_count ?? 0,
      is_current_user: u.id === user.id,
    }));
  }

  return NextResponse.json({
    ok: true,
    group: group ? { id: group.id, name: group.name, invite_code: group.invite_code } : null,
    date: today,
    entries: [...sorted, ...notPlayedEntries],
  });
}
