import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import QRCode from 'qrcode';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTOTPUri, newTOTPSecret, verifyCookieToken, COOKIE_NAME } from '@/lib/admin-2fa';

export default async function AdminSetupPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/');
  }

  // If already authenticated with 2FA, no need to show setup again
  const cookieStore = await cookies();
  const twoFAToken = cookieStore.get(COOKIE_NAME)?.value;
  if (twoFAToken && verifyCookieToken(twoFAToken, user.email)) {
    redirect('/admin');
  }

  const secretSet = !!process.env.ADMIN_TOTP_SECRET;
  let qrDataUrl: string | null = null;
  let secret = process.env.ADMIN_TOTP_SECRET ?? '';

  if (secretSet) {
    const uri = getTOTPUri(user.email);
    qrDataUrl = await QRCode.toDataURL(uri, { width: 200, margin: 2 });
  } else {
    // Show a generated secret for the user to copy into .env.local
    secret = newTOTPSecret();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 w-full max-w-md shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">2FA Setup</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">DailyDiffs Admin · Google Authenticator</p>

        {!secretSet ? (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                Step 1 — Add this to your <code className="font-mono">.env.local</code>:
              </p>
              <code className="block font-mono text-sm bg-white dark:bg-slate-900 rounded-lg p-3 text-slate-800 dark:text-slate-100 break-all select-all">
                ADMIN_TOTP_SECRET={secret}
              </code>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              After adding it, restart the dev server (<code className="font-mono">npm run dev</code>) and come back here to scan the QR code.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Step 1 — Scan this with Google Authenticator:
              </p>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="TOTP QR code"
                  width={200}
                  height={200}
                  className="rounded-xl border border-slate-200 dark:border-slate-700"
                />
              )}
            </div>

            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Or enter this secret manually:
              </p>
              <code className="block font-mono text-sm bg-slate-100 dark:bg-slate-900 rounded-lg p-3 text-slate-800 dark:text-slate-100 break-all select-all">
                {secret}
              </code>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Step 2 — Confirm it works:
              </p>
              <a
                href="/admin/verify"
                className="block text-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 text-sm"
              >
                Go to verification →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
