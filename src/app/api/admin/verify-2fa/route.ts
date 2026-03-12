import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyTOTP, issueCookieToken, COOKIE_NAME } from '@/lib/admin-2fa';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json() as { code: string };
  const { code } = body;

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
  }

  if (!verifyTOTP(code)) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
  }

  const token = issueCookieToken(user.email);
  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60,
    path: '/admin',
  });
  return res;
}
