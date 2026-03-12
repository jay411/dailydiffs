import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAdminDb } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json() as { puzzleId: string; reason?: string };
  const { puzzleId, reason } = body;
  if (!puzzleId) return NextResponse.json({ error: 'Missing puzzleId' }, { status: 400 });

  const db = getAdminDb();
  const { error } = await db
    .from('puzzles')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', puzzleId);

  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });

  if (reason) {
    await db.from('generation_logs').insert({
      batch_date: new Date().toISOString().slice(0, 10),
      art_style: 'unknown',
      status: 'rejected',
      rejection_reason: reason,
    });
  }

  return NextResponse.json({ success: true });
}
