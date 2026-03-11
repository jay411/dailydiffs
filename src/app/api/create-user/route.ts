import { NextResponse } from 'next/server';
import { validateUsername } from '@/lib/validate-username';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  let body: { username?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const validation = validateUsername(username);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { error } = await supabase.from('users').insert({
    id: user.id,
    email: user.email ?? null,
    username,
    auth_provider: user.app_metadata?.provider ?? 'google',
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username is taken' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
