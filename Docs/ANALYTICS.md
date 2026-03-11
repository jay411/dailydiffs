# ANALYTICS.md — DailyDiffs Tracking & Metrics

## Analytics Provider

**PostHog** (free tier — 1M events/month)

Setup: Add PostHog script to layout.tsx. Initialize with project API key.

## Core Events

### Gameplay Events

```
puzzle_started
  Properties: { date, round, art_style }
  When: User enters a round and images load

difference_found
  Properties: { round, diff_index, time_to_find_seconds, x, y }
  When: User correctly taps a difference

difference_wrong_tap
  Properties: { round, x, y }
  When: User taps but misses all differences

round_completed
  Properties: { round, art_style, time_seconds, score, diffs_found, diffs_total }
  When: All differences found or round ends

round_skipped
  Properties: { round }
  When: User skips Round 5 (declines rewarded ad)

session_completed
  Properties: { rounds_completed, total_score, total_time_seconds, watched_ad }
  When: User finishes all rounds or exits after Round 4
```

### Auth Events

```
login_gate_shown
  Properties: { after_round: 1 }
  When: Login wall appears after Round 1

login_completed
  Properties: { method: 'google' | 'email' }
  When: User successfully authenticates

login_abandoned
  Properties: {}
  When: User leaves /auth/login without completing login (track via page exit)
```

### Ad Events

```
ad_banner_loaded
  Properties: { page }
  When: Bottom banner ad successfully loads

ad_interstitial_shown
  Properties: { between_rounds: '1-2' | '2-3' | '3-4' }
  When: Interstitial ad displays on transition screen

ad_rewarded_started
  Properties: {}
  When: User clicks "Watch video" to unlock Round 5

ad_rewarded_completed
  Properties: {}
  When: Rewarded video finishes playing fully

ad_rewarded_skipped
  Properties: {}
  When: User clicks "Skip — see my results" instead of watching

ad_failed_to_load
  Properties: { ad_type: 'banner' | 'interstitial' | 'rewarded', error }
  When: Any ad fails to load
```

### Social Events

```
share_clicked
  Properties: { platform: 'twitter' | 'instagram' | 'reddit' | 'copy' | 'native' }
  When: User taps any share button

leaderboard_viewed
  Properties: { tab: 'today' | 'all_time' }
  When: User opens leaderboard page
```

### Engagement Events

```
streak_milestone
  Properties: { streak_count }
  When: User hits 3, 7, 14, 30, 50, or 100 day streak

return_visit
  Properties: { days_since_last_visit }
  When: Returning user starts a new session

home_page_viewed
  Properties: { logged_in: boolean, has_played_today: boolean }
  When: User lands on home page
```

## Key Funnels

### Main Conversion Funnel
```
home_page_viewed
  → puzzle_started (Round 1)
    → round_completed (Round 1)
      → login_gate_shown
        → login_completed
          → puzzle_started (Round 2)
            → round_completed (Round 4)
              → ad_rewarded_started
                → ad_rewarded_completed
                  → round_completed (Round 5)
                    → share_clicked
```

Track drop-off at each step. The critical conversion points:
1. Home → Round 1 start (are people clicking play?)
2. Round 1 complete → Login (are people signing up?)
3. Round 4 → Rewarded ad (are people watching the ad?)
4. Results → Share (are people sharing?)

### Retention Funnel
```
Day 0: First session
Day 1: Return visit
Day 3: Still playing
Day 7: Weekly retention
Day 14: Two-week retention
Day 30: Monthly retention
```

## Key Metrics to Track

### Daily Dashboard (check every morning)

| Metric              | What It Tells You                          |
|---------------------|--------------------------------------------|
| DAU                 | Total unique players today                 |
| New users           | First-time players today                   |
| Sessions completed  | Full playthroughs (all 5 rounds)           |
| Login conversion    | % of Round 1 players who sign up           |
| Ad watch rate       | % who watch rewarded ad for Round 5        |
| Share rate          | % who share results                        |
| Average score       | Game difficulty calibration                |
| Average session time| Engagement depth                           |

### Weekly Review

| Metric              | What It Tells You                          |
|---------------------|--------------------------------------------|
| D1 retention        | % returning next day                       |
| D7 retention        | % returning after a week                   |
| Streak distribution | How many users have active streaks          |
| Revenue (ad)        | Total ad revenue this week                 |
| Revenue per user    | ARPDAU                                     |
| Art style engagement| Which styles get highest completion rates   |
| Share conversion    | New users acquired through sharing         |

## PostHog Setup

### Installation

Add to layout.tsx:
```javascript
// lib/posthog.ts
import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageviews: true,
      capture_pageleaves: true,
    })
  }
}
```

### User Identification

After login:
```javascript
posthog.identify(user.id, {
  email: user.email,
  display_name: user.display_name,
  auth_provider: user.auth_provider,
  created_at: user.created_at
})
```

### Event Tracking Pattern

```javascript
// Example: tracking a found difference
posthog.capture('difference_found', {
  round: currentRound,
  diff_index: foundDiffIndex,
  time_to_find_seconds: timeSinceRoundStart,
  x: tapX,
  y: tapY
})
```

## Sentry Error Monitoring

### Setup
Add Sentry SDK to capture runtime errors:
```
npm install @sentry/nextjs
```

### Key Errors to Monitor
- Image load failures (broken puzzle images)
- Auth callback failures
- Ad SDK errors
- Supabase connection errors
- Game state corruption (score calculation mismatches)

### Alert Rules
- Alert if image load failure rate > 5% in any hour
- Alert if auth error rate > 10% in any hour
- Alert if zero sessions completed in past 2 hours (during peak hours)

## Environment Variables

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_XXXXXXXXXXXX
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_SENTRY_DSN=https://XXXX@sentry.io/XXXX
```
