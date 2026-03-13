import posthog from 'posthog-js';

export const EVENTS = {
  HOME_PAGE_VIEWED: 'home_page_viewed',
  PUZZLE_STARTED: 'puzzle_started',
  DIFFERENCE_FOUND: 'difference_found',
  DIFFERENCE_WRONG_TAP: 'difference_wrong_tap',
  ROUND_COMPLETED: 'round_completed',
  SESSION_COMPLETED: 'session_completed',
  LOGIN_GATE_SHOWN: 'login_gate_shown',
  LOGIN_COMPLETED: 'login_completed',
  AD_BANNER_LOADED: 'ad_banner_loaded',
  AD_INTERSTITIAL_SHOWN: 'ad_interstitial_shown',
  AD_REWARDED_STARTED: 'ad_rewarded_started',
  AD_REWARDED_COMPLETED: 'ad_rewarded_completed',
  AD_REWARDED_SKIPPED: 'ad_rewarded_skipped',
  AD_FAILED_TO_LOAD: 'ad_failed_to_load',
  SHARE_CLICKED: 'share_clicked',
  LEADERBOARD_VIEWED: 'leaderboard_viewed',
  STREAK_MILESTONE: 'streak_milestone',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

let initialized = false;

export function initPostHog() {
  if (typeof window === 'undefined' || initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    capture_pageview: false, // we handle manually
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
  });
  initialized = true;
}

export function trackEvent(name: EventName, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.capture(name, properties);
}

export function identifyUser(userId: string, traits: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.identify(userId, traits);
}
