import Link from 'next/link';

type Props = { searchParams: Promise<{ from?: string }> };

export default async function TransitionPage({ searchParams }: Props) {
  const { from } = await searchParams;
  const fromRound = from ? parseInt(from, 10) : 1;
  const nextRound = fromRound + 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
      <main className="max-w-sm w-full flex flex-col gap-6 text-center">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Round {fromRound} complete
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Ad placeholder (5s) — Day 5
        </p>
        <Link
          href={nextRound <= 5 ? `/play/${nextRound}` : '/results'}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6"
        >
          {nextRound <= 5 ? `Round ${nextRound}` : 'See results'}
        </Link>
      </main>
    </div>
  );
}
