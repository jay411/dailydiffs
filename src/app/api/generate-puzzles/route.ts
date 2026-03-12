import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin, getAdminDb } from '@/lib/supabase-admin';
import {
  generateScenePrompt,
  generateImage,
  editImage,
  checkImageSafety,
  scoreQuality,
  extractDifferenceCoordinates,
  buildImagePrompt,
  getArtStyleName,
} from '@/lib/gemini';

// Allow up to 5 minutes on Vercel Pro
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json() as { date: string; roundNumber: number };
  const { date, roundNumber } = body;

  if (!date || !roundNumber || roundNumber < 1 || roundNumber > 5) {
    return NextResponse.json({ error: 'Invalid date or roundNumber (must be 1–5)' }, { status: 400 });
  }

  const startTime = Date.now();
  const admin = getSupabaseAdmin(); // for storage operations
  const db = getAdminDb();          // for DB operations (untyped escape hatch)
  const artStyle = getArtStyleName(roundNumber);

  try {
    // Step 1: Generate scene description + difference instructions
    const sceneData = await generateScenePrompt(roundNumber);

    // Step 2: Generate base image
    const imagePrompt = buildImagePrompt(roundNumber, sceneData.scene);
    const originalBuffer = await generateImage(imagePrompt);

    // Step 3: Apply differences to create modified image
    const modifiedBuffer = await editImage(originalBuffer, sceneData.differences);

    // Step 4: Safety check both images
    const [origSafety, modSafety] = await Promise.all([
      checkImageSafety(originalBuffer),
      checkImageSafety(modifiedBuffer),
    ]);

    if (!origSafety.safe || !modSafety.safe) {
      const issues = [...origSafety.issues, ...modSafety.issues];
      await db.from('generation_logs').insert({
        batch_date: date,
        art_style: artStyle,
        prompt_used: sceneData.scene,
        generation_time_seconds: (Date.now() - startTime) / 1000,
        status: 'rejected',
        rejection_reason: `Safety check failed: ${issues.join(', ')}`,
      });
      return NextResponse.json({ error: 'Safety check failed', issues }, { status: 422 });
    }

    // Step 5: QA scoring
    const qa = await scoreQuality(originalBuffer, modifiedBuffer);

    if (qa.score < 4 || qa.score > 9) {
      await db.from('generation_logs').insert({
        batch_date: date,
        art_style: artStyle,
        prompt_used: sceneData.scene,
        generation_time_seconds: (Date.now() - startTime) / 1000,
        qa_score: qa.score,
        status: 'rejected',
        rejection_reason: `QA score out of range: ${qa.score}. Issues: ${qa.issues.join(', ')}`,
      });
      return NextResponse.json({ error: 'QA score out of range', score: qa.score, issues: qa.issues }, { status: 422 });
    }

    // Step 6: Extract difference coordinates
    const differences = await extractDifferenceCoordinates(originalBuffer, modifiedBuffer);

    // Step 7: Upload to puzzles-pending bucket
    const origPath = `${date}/${roundNumber}_original.png`;
    const modPath = `${date}/${roundNumber}_modified.png`;

    const { error: origUploadErr } = await admin.storage
      .from('puzzles-pending')
      .upload(origPath, originalBuffer, { contentType: 'image/png', upsert: true });

    if (origUploadErr) {
      return NextResponse.json({ error: `Storage upload failed: ${origUploadErr.message}` }, { status: 500 });
    }

    const { error: modUploadErr } = await admin.storage
      .from('puzzles-pending')
      .upload(modPath, modifiedBuffer, { contentType: 'image/png', upsert: true });

    if (modUploadErr) {
      return NextResponse.json({ error: `Storage upload failed: ${modUploadErr.message}` }, { status: 500 });
    }

    // Step 8: Upsert puzzle row in DB (paths stored, not full URLs — pending bucket is private)
    const { data: puzzle, error: dbErr } = await db
      .from('puzzles')
      .upsert({
        date,
        round_number: roundNumber,
        art_style: artStyle,
        image_original_url: origPath,
        image_modified_url: modPath,
        differences_json: differences,
        difficulty_score: qa.score,
        status: 'pending',
      }, { onConflict: 'date,round_number' })
      .select()
      .single();

    if (dbErr || !puzzle) {
      return NextResponse.json({ error: `DB insert failed: ${dbErr?.message}` }, { status: 500 });
    }

    // Step 9: Log generation
    await db.from('generation_logs').insert({
      batch_date: date,
      art_style: artStyle,
      prompt_used: sceneData.scene,
      generation_time_seconds: (Date.now() - startTime) / 1000,
      qa_score: qa.score,
      status: 'generated',
    });

    return NextResponse.json({ success: true, puzzleId: puzzle.id, qaScore: qa.score });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await db.from('generation_logs').insert({
      batch_date: date,
      art_style: artStyle,
      generation_time_seconds: (Date.now() - startTime) / 1000,
      status: 'failed',
      rejection_reason: message,
    }).catch(() => null); // don't fail if logging fails
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
