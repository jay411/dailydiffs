'use client';

import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=/auth/username`,
      },
    });
    if (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
      <main className="max-w-sm w-full flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center">
          Sign in to continue
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-center text-sm">
          Save your streak and play rounds 2–5.
        </p>
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold py-3 px-4 text-center"
        >
          Continue with Google
        </button>
        <p className="text-slate-500 dark:text-slate-500 text-center text-xs">
          4 more rounds waiting…
        </p>
        <Link href="/" className="text-center text-slate-500 hover:underline text-sm">
          Back to home
        </Link>
      </main>
    </div>
  );
}
