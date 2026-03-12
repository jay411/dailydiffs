import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin, getAdminDb } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json() as { puzzleId: string };
  const { puzzleId } = body;
  if (!puzzleId) return NextResponse.json({ error: 'Missing puzzleId' }, { status: 400 });

  const admin = getSupabaseAdmin(); // for storage
  const db = getAdminDb();          // for DB

  // Fetch the puzzle row
  const { data: puzzle, error: fetchErr } = await db
    .from('puzzles')
    .select('status, image_original_url, image_modified_url')
    .eq('id', puzzleId)
    .single() as { data: { status: string; image_original_url: string; image_modified_url: string } | null; error: unknown };

  if (fetchErr || !puzzle) {
    return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
  }

  if (puzzle.status !== 'pending') {
    return NextResponse.json({ error: 'Puzzle is not pending' }, { status: 400 });
  }

  // Copy images from puzzles-pending to puzzles (public) bucket
  const origPath = puzzle.image_original_url;
  const modPath = puzzle.image_modified_url;

  for (const path of [origPath, modPath]) {
    const { data: file, error: dlErr } = await admin.storage.from('puzzles-pending').download(path);
    if (dlErr || !file) {
      return NextResponse.json({ error: `Failed to download ${path}: ${dlErr?.message}` }, { status: 500 });
    }
    const { error: ulErr } = await admin.storage
      .from('puzzles')
      .upload(path, await file.arrayBuffer(), { contentType: 'image/png', upsert: true });
    if (ulErr) {
      return NextResponse.json({ error: `Failed to upload ${path}: ${ulErr.message}` }, { status: 500 });
    }
  }

  // Build public URLs
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const publicOrigUrl = `${baseUrl}/storage/v1/object/public/puzzles/${origPath}`;
  const publicModUrl = `${baseUrl}/storage/v1/object/public/puzzles/${modPath}`;

  // Update puzzle row
  const { error: updateErr } = await db
    .from('puzzles')
    .update({
      status: 'published',
      image_original_url: publicOrigUrl,
      image_modified_url: publicModUrl,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', puzzleId);

  if (updateErr) {
    return NextResponse.json({ error: (updateErr as { message: string }).message }, { status: 500 });
  }

  // Delete from pending bucket
  await admin.storage.from('puzzles-pending').remove([origPath, modPath]);

  return NextResponse.json({ success: true });
}
