import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAdminDb } from '@/lib/supabase-admin';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data: puzzles, error } = await getAdminDb()
    .from('puzzles')
    .select('date, status');

  if (error || !puzzles) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  type Row = { date: string; status: string };
  const rows = puzzles as Row[];
  const today = new Date().toISOString().slice(0, 10);
  const futureDays = new Set(
    rows
      .filter(p => (p.status === 'published' || p.status === 'approved') && p.date > today)
      .map(p => p.date),
  ).size;

  const pendingCount = rows.filter(p => p.status === 'pending').length;
  const totalReviewed = rows.filter(p => p.status === 'published' || p.status === 'rejected').length;
  const rejected = rows.filter(p => p.status === 'rejected').length;
  const rejectionRate = totalReviewed > 0 ? Math.round((rejected / totalReviewed) * 100) : 0;

  return NextResponse.json({ approvedQueueDays: futureDays, pendingCount, rejectionRate });
}
