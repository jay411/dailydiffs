'use client';

import { useEffect, useRef } from 'react';
import { trackEvent, EVENTS } from '@/lib/posthog';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function BannerAd() {
  const slotRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT;
  const hasAdSense = !!(clientId && slotId);

  useEffect(() => {
    if (!hasAdSense || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
      trackEvent(EVENTS.AD_BANNER_LOADED);
    } catch {
      trackEvent(EVENTS.AD_FAILED_TO_LOAD, { ad_type: 'banner' });
    }
  }, [hasAdSense]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center
        h-[50px] xl:h-[90px] bg-slate-900 border-t border-slate-700/60"
      aria-label="Advertisement"
    >
      {hasAdSense ? (
        <ins
          ref={slotRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <span className="text-[10px] uppercase tracking-widest text-slate-700 select-none">
          Advertisement
        </span>
      )}
    </div>
  );
}
