'use client';

import { useEffect, useRef, useState } from 'react';
import { trackEvent, EVENTS } from '@/lib/posthog';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type Props = {
  onComplete: () => void;
  durationSeconds?: number;
};

export function InterstitialAd({ onComplete, durationSeconds = 5 }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const pushed = useRef(false);
  const fired = useRef(false);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_INTERSTITIAL_SLOT;
  const hasAdSense = !!(clientId && slotId);

  // Fire analytics event once
  useEffect(() => {
    if (!fired.current) {
      trackEvent(EVENTS.AD_INTERSTITIAL_SHOWN);
      fired.current = true;
    }
  }, []);

  // Push AdSense ad
  useEffect(() => {
    if (!hasAdSense || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}
  }, [hasAdSense]);

  // Countdown
  useEffect(() => {
    if (secondsLeft <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, onComplete]);

  const progress = ((durationSeconds - secondsLeft) / durationSeconds) * 100;

  return (
    <div className="w-full max-w-sm flex flex-col gap-3">
      {/* Ad slot */}
      <div className="w-full h-[250px] bg-slate-800 rounded-xl border border-slate-700/60 flex items-center justify-center overflow-hidden">
        {hasAdSense ? (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-ad-client={clientId}
            data-ad-slot={slotId}
            data-ad-format="rectangle"
          />
        ) : (
          <span className="text-[10px] uppercase tracking-widest text-slate-700 select-none">
            Advertisement
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-slate-500 tabular-nums w-6 text-right">
          {secondsLeft}s
        </span>
      </div>
    </div>
  );
}
