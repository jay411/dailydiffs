import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  let body: { invite_code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const invite_code =
    typeof body.invite_code === 'string' ? body.invite_code.trim().toUpperCase() : '';
  if (!invite_code) {
    return NextResponse.json({ error: 'invite_code is required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Look up group by invite code
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, invite_code')
    .eq('invite_code', invite_code)
    .single();

  if (groupError || !group) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
  }

  // Upsert membership (idempotent — already a member is OK)
  const { error: joinError } = await supabase
    .from('group_members')
    .upsert({ group_id: group.id, user_id: user.id }, { onConflict: 'group_id,user_id' });

  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    group: { id: group.id, name: group.name, invite_code: group.invite_code },
  });
}
