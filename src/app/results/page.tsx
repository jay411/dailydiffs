import Link from 'next/link';

export default function ResultsPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
      <main className="max-w-sm w-full flex flex-col gap-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Session complete
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Results and leaderboard — Day 2+
        </p>
        <Link
          href="/"
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6"
        >
          Back to home
        </Link>
      </main>
    </div>
  );
}
