'use client';

import { useEffect, useRef, useState } from 'react';
import { trackEvent, EVENTS } from '@/lib/posthog';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

type Props = {
  onComplete: () => void;
  onSkip: () => void;
  loading?: boolean;
};

const IMA_SDK_URL = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';

export function RewardedVideoAd({ onComplete, onSkip, loading = false }: Props) {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [adStarted, setAdStarted] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simRunning, setSimRunning] = useState(false);
  const startedRef = useRef(false);

  const adUnitId = process.env.NEXT_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID;

  // Try to load IMA SDK
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.google?.ima) {
      setSdkLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = IMA_SDK_URL;
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => setSdkLoaded(false);
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  // Initialize IMA when SDK is ready and we have an ad unit
  useEffect(() => {
    if (!sdkLoaded || !adUnitId || !adContainerRef.current) return;
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      const { ima } = window.google;
      const adDisplayContainer = new ima.AdDisplayContainer(adContainerRef.current);
      adDisplayContainer.initialize();

      const adsLoader = new ima.AdsLoader(adDisplayContainer);

      adsLoader.addEventListener(
        ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (loadedEvent: any) => {
          const adsManager = loadedEvent.getAdsManager(adContainerRef.current);

          adsManager.addEventListener(ima.AdEvent.Type.STARTED, () => {
            setAdStarted(true);
            trackEvent(EVENTS.AD_REWARDED_STARTED);
          });

          adsManager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
            trackEvent(EVENTS.AD_REWARDED_COMPLETED);
            adsManager.destroy();
            onComplete();
          });

          adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => {
            trackEvent(EVENTS.AD_FAILED_TO_LOAD, { ad_type: 'rewarded' });
            adsManager.destroy();
            // Fall through to simulated mode
          });

          try {
            adsManager.init(640, 360, ima.ViewMode.NORMAL);
            adsManager.start();
          } catch {
            trackEvent(EVENTS.AD_FAILED_TO_LOAD, { ad_type: 'rewarded' });
          }
        },
      );

      adsLoader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => {
        trackEvent(EVENTS.AD_FAILED_TO_LOAD, { ad_type: 'rewarded' });
      });

      const adsRequest = new ima.AdsRequest();
      // Build VAST tag URL from AdMob ad unit ID
      adsRequest.adTagUrl = `https://pubads.g.doubleclick.net/gampad/ads?iu=${encodeURIComponent(adUnitId)}&sz=640x480&env=vp&output=vast&unviewed_position_start=1&correlator=${Date.now()}`;
      adsLoader.requestAds(adsRequest);
    } catch {
      trackEvent(EVENTS.AD_FAILED_TO_LOAD, { ad_type: 'rewarded' });
    }
  }, [sdkLoaded, adUnitId, onComplete]);

  // Simulated progress (placeholder mode or when IMA unavailable)
  const isPlaceholderMode = !adUnitId || !sdkLoaded;

  useEffect(() => {
    if (!simRunning) return;
    if (simProgress >= 100) {
      trackEvent(EVENTS.AD_REWARDED_COMPLETED);
      onComplete();
      return;
    }
    const timer = setTimeout(() => setSimProgress((p) => Math.min(p + 4, 100)), 150);
    return () => clearTimeout(timer);
  }, [simRunning, simProgress, onComplete]);

  function handleWatchAd() {
    if (isPlaceholderMode) {
      trackEvent(EVENTS.AD_REWARDED_STARTED);
      setAdStarted(true);
      setSimRunning(true);
    }
  }

  function handleSkip() {
    trackEvent(EVENTS.AD_REWARDED_SKIPPED);
    onSkip();
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-4">
      {/* Ad container (IMA SDK renders into this) */}
      <div
        ref={adContainerRef}
        className={`w-full rounded-xl border border-slate-700/60 overflow-hidden bg-slate-800 flex flex-col items-center justify-center gap-4 p-6 ${adStarted ? 'h-[200px]' : 'h-auto'}`}
      >
        {!adStarted && (
          <>
            <div className="text-4xl">🎬</div>
            <div className="text-center">
              <p className="text-slate-100 font-bold text-lg mb-1">Unlock Round 5!</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                Watch a short ad to unlock the final round and earn bonus points.
              </p>
            </div>

            {isPlaceholderMode && (
              <button
                type="button"
                onClick={handleWatchAd}
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 transition-colors flex items-center justify-center gap-2"
              >
                ▶ Watch Ad (15s)
              </button>
            )}
          </>
        )}

        {adStarted && isPlaceholderMode && (
          <div className="w-full flex flex-col items-center gap-3">
            <div className="text-slate-300 text-sm font-medium">Ad playing…</div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                style={{ width: `${simProgress}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 tabular-nums">
              {Math.ceil(((100 - simProgress) / 100) * 5)}s remaining
            </div>
          </div>
        )}
      </div>

      {/* Skip link — subtle, below the card */}
      {!adStarted && (
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors text-center"
        >
          Skip → go to results
        </button>
      )}
    </div>
  );
}
