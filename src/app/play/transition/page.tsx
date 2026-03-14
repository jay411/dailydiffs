import { Suspense } from 'react';
import { TransitionContent } from './TransitionContent';

export default function TransitionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <TransitionContent />
    </Suspense>
  );
}
