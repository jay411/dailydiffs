'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UsernamePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!data.available && data.valid) {
        setError('Username is taken');
        setSubmitting(false);
        return;
      }
      if (!data.valid) {
        setError(data.error || 'Invalid username');
        setSubmitting(false);
        return;
      }
      const createRes = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (!createRes.ok) {
        setError('Could not create profile');
        setSubmitting(false);
        return;
      }
      router.push('/play/2');
    } catch {
      setError('Something went wrong');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
      <main className="max-w-sm w-full flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center">
          Choose a username
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-center text-sm">
          3–16 characters, letters, numbers, underscores. Must start with a letter.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100"
            maxLength={16}
            autoComplete="username"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting || username.length < 3}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 px-4"
          >
            {submitting ? 'Saving…' : 'Start playing'}
          </button>
        </form>
        <Link href="/" className="text-center text-slate-500 hover:underline text-sm">
          Back to home
        </Link>
      </main>
    </div>
  );
}
