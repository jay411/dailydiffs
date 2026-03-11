import { NextResponse } from 'next/server';
import { validateUsername } from '@/lib/validate-username';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  let body: { username?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, available: false, error: 'Invalid body' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const validation = validateUsername(username);
  if (!validation.valid) {
    return NextResponse.json({ valid: false, available: false, error: validation.error }, { status: 200 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ valid: true, available: false, error: 'Check failed' }, { status: 500 });
    }
    return NextResponse.json({ valid: true, available: !data }, { status: 200 });
  } catch {
    return NextResponse.json({ valid: true, available: false, error: 'Check failed' }, { status: 500 });
  }
}
