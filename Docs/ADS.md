# ADS.md — DailyDiffs Monetization & Ad Placements

## Revenue Model

DailyDiffs monetizes through three ad placements per session:
1. Persistent bottom banner (always visible)
2. 5-second interstitial between rounds (3 per session)
3. Rewarded video to unlock Round 5 (1 per session)

## Ad Placements

### 1. Bottom Banner (Persistent)
- **Type:** Display banner (320x50 mobile, 728x90 desktop)
- **SDK:** Google AdSense
- **Position:** Fixed to bottom of viewport on every page
- **When:** Always visible during gameplay, results, leaderboard
- **Expected eCPM:** $1-2
- **Notes:**
  - Must not overlap game images or tap targets
  - Minimum 44px gap between banner and nearest interactive element
  - Banner loads asynchronously — don't block page render

### 2. Round Interstitial (Between Rounds)
- **Type:** 5-second display ad
- **SDK:** Google AdSense (auto ads) or custom overlay
- **Position:** Full-screen overlay on /play/transition page
- **When:** Shown 3 times per session:
  - Between Round 1 → Round 2 (after login)
  - Between Round 2 → Round 3
  - Between Round 3 → Round 4
- **Expected eCPM:** $4-8
- **Behavior:**
  ```
  1. Round completes → transition screen loads
  2. Show round summary (diffs found, time, score)
  3. 5-second ad loads in designated zone
  4. Countdown timer: "Next round in 5... 4... 3... 2... 1..."
  5. "Next Round" button appears after countdown
  6. User taps → proceeds to next round
  ```
- **Notes:**
  - "Next Round" button must NOT appear before ad timer completes
  - If ad fails to load, still show the 5-second wait with round summary
  - No close/skip button during the 5 seconds

### 3. Rewarded Video (Round 5 Unlock)
- **Type:** Rewarded video ad (15-30 seconds)
- **SDK:** Google AdMob (web — google.ima SDK)
- **Position:** Full-screen video before Round 5
- **When:** After Round 4 completes, before Round 5 starts
- **Expected eCPM:** $15-30
- **Behavior:**
  ```
  1. Round 4 completes → transition screen
  2. Show Round 4 summary
  3. Display rewarded ad prompt:
     ┌──────────────────────────────────┐
     │                                  │
     │  🔓 Unlock the Final Round!     │
     │                                  │
     │  Round 5: Photorealistic (Hard) │
     │  The ultimate challenge awaits   │
     │                                  │
     │  [▶ Watch a short video]        │
     │                                  │
     │  [Skip — see my results]        │
     │                                  │
     └──────────────────────────────────┘
  4a. User watches video → ad plays → on complete → Round 5 starts
  4b. User skips → redirect to /results (only 4 rounds scored)
  ```
- **Notes:**
  - Must verify ad completion server-side before granting Round 5
  - Store `watched_ad_for_round5: true` in game_sessions table
  - If ad fails to load, offer Round 5 for free (don't block the player)
  - Track ad_rewarded_started vs ad_rewarded_completed to measure drop-off

## Revenue Per Session Estimate

| Ad Type         | eCPM (est.) | Impressions/User | Revenue/User  |
|-----------------|-------------|------------------|---------------|
| Bottom banner   | $1-2        | 1                | $0.001-0.002  |
| Interstitial    | $4-8        | 3                | $0.012-0.024  |
| Rewarded video  | $15-30      | 0.5 (50% watch)  | $0.008-0.015  |
| **Total/session** |           |                  | **~$0.02-0.04** |

## SDK Integration

### Google AdSense (Banner + Interstitial)

Add to `<head>` in layout.tsx:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXX" crossorigin="anonymous"></script>
```

Banner component pattern:
```
AdBanner.tsx:
- Renders an <ins class="adsbygoogle"> element
- Calls (adsbygoogle = window.adsbygoogle || []).push({}) on mount
- Props: format ('auto' | 'fixed'), slot (ad unit ID)
- Fixed to bottom of viewport with CSS position: fixed
```

### Google AdMob Web (Rewarded Video)

Uses Google IMA SDK for web rewarded ads:
```html
<script src="https://imasdk.googleapis.com/js/sdkloader/ima3.js"></script>
```

Rewarded ad flow:
```
RewardedAdButton.tsx:
1. On mount: request ad from IMA SDK
2. On user click "Watch video": play ad
3. Listen for COMPLETE event → grant Round 5 access
4. Listen for SKIPPED/ERROR event → handle gracefully
5. Send verification to server: POST /api/unlock-round5
```

## AdSense Approval

- AdSense requires site review before ads serve
- Apply as early as possible (Day 5 or sooner)
- Requirements: real content, privacy policy, sufficient pages
- Approval takes 1-3 days (sometimes longer)
- **Launch with placeholder ad spaces** — grey boxes with "Ad" text
- Swap in real ads once approved

### Placeholder Ad Component
```
Before AdSense approval, show:
┌─────────────────────────┐
│    Advertisement        │
│    [placeholder]        │
└─────────────────────────┘

Style: light grey background, subtle border, "Advertisement" text
This maintains layout spacing so nothing shifts when real ads activate
```

## GDPR / Privacy Compliance

- Add cookie consent banner for EU users
- AdSense requires consent before loading personalized ads
- If no consent → load non-personalized ads (lower eCPM but still revenue)
- Add privacy policy page (required for AdSense approval)
- Mention data collection in privacy policy: analytics, ad personalization

## Ad-Related Environment Variables

```env
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_ADSENSE_BANNER_SLOT=XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_INTERSTITIAL_SLOT=XXXXXXXXXX
NEXT_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID=ca-app-pub-XXXXXXX/XXXXXXX
```

## Key Rules

1. Never show more than one ad at a time (banner excluded — it's passive)
2. Never block gameplay with an ad that can't be dismissed
3. If any ad fails to load, fail gracefully — never block the player
4. Rewarded ad must complete fully before granting Round 5
5. Track all ad events in PostHog (see ANALYTICS.md)
6. Bottom banner must not interfere with tap targets on game screen
