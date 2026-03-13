import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length < 1 || name.length > 50) {
    return NextResponse.json(
      { error: 'Group name must be 1–50 characters' },
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

  // Create the group
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name, created_by: user.id })
    .select('id, name, invite_code')
    .single();

  if (groupError || !group) {
    return NextResponse.json(
      { error: groupError?.message ?? 'Failed to create group' },
      { status: 500 },
    );
  }

  // Auto-join as creator
  const { error: joinError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id });

  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    group: {
      id: group.id,
      name: group.name,
      invite_code: group.invite_code,
    },
  });
}
