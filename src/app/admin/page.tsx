import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { AdminClient } from './AdminClient';
import type { Difference } from '@/types/puzzle';

export interface PendingPuzzle {
  id: string;
  date: string;
  roundNumber: number;
  artStyle: string;
  difficultyScore: number | null;
  originalSignedUrl: string;
  modifiedSignedUrl: string;
  differences: Difference[];
}

export interface AdminStats {
  approvedQueueDays: number;
  pendingCount: number;
  rejectionRate: number;
}

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/');
  }

  const admin = getSupabaseAdmin();

  const { data: puzzles } = await admin
    .from('puzzles')
    .select('id, date, round_number, art_style, difficulty_score, status, image_original_url, image_modified_url, differences_json')
    .order('date', { ascending: false });

  const today = new Date().toISOString().slice(0, 10);
  const allPuzzles = puzzles ?? [];

  // Stats
  const approvedQueueDays = new Set(
    allPuzzles
      .filter(p => (p.status === 'published' || p.status === 'approved') && p.date > today)
      .map((p) => p.date as string),
  ).size;
  const pendingCount = allPuzzles.filter(p => p.status === 'pending').length;
  const totalReviewed = allPuzzles.filter(p => p.status === 'published' || p.status === 'rejected').length;
  const rejected = allPuzzles.filter(p => p.status === 'rejected').length;
  const rejectionRate = totalReviewed > 0 ? Math.round((rejected / totalReviewed) * 100) : 0;

  // Pending puzzles with signed URLs (1-hour expiry)
  const pending = allPuzzles.filter(p => p.status === 'pending');
  const pendingPuzzles: PendingPuzzle[] = await Promise.all(
    pending.map(async (p) => {
      const origPath = p.image_original_url as string;
      const modPath = p.image_modified_url as string;
      const [orig, mod] = await Promise.all([
        admin.storage.from('puzzles-pending').createSignedUrl(origPath, 3600),
        admin.storage.from('puzzles-pending').createSignedUrl(modPath, 3600),
      ]);
      return {
        id: p.id as string,
        date: p.date as string,
        roundNumber: p.round_number as number,
        artStyle: p.art_style as string,
        difficultyScore: p.difficulty_score as number | null,
        originalSignedUrl: orig.data?.signedUrl ?? '',
        modifiedSignedUrl: mod.data?.signedUrl ?? '',
        differences: Array.isArray(p.differences_json) ? (p.differences_json as Difference[]) : [],
      };
    }),
  );

  const stats: AdminStats = { approvedQueueDays, pendingCount, rejectionRate };

  return <AdminClient stats={stats} pendingPuzzles={pendingPuzzles} />;
}
