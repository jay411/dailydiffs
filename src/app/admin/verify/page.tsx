'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json() as { error?: string };

      if (!res.ok) {
        setError(json.error ?? 'Verification failed');
        setCode('');
        inputRef.current?.focus();
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 w-full max-w-sm shadow-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Admin Verification</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter the 6-digit code from Google Authenticator
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            autoFocus
            className="text-center text-3xl font-mono tracking-widest rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 text-sm"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-4">
          Session valid for 24 hours · <a href="/admin/setup" className="underline">Setup / QR code</a>
        </p>
      </div>
    </div>
  );
}
