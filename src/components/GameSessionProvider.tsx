'use client';

import { GameSessionProvider as Provider } from '@/contexts/GameSessionContext';

export function GameSessionProvider({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}
