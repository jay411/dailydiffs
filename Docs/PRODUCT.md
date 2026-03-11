# PRODUCT.md — DailyDiffs

## What Is DailyDiffs?

A daily spot-the-difference puzzle game. AI generates 5 new image pairs every day across 5 distinct art styles. Players find differences by tapping/clicking on the images. New puzzles unlock at 8 AM local time.

## Core Loop

Visit → Play Round 1 (free) → Login to continue → Rounds 2-4 (with interstitial ads) → Watch rewarded ad → Round 5 → Results → Share → Leaderboard → Come back tomorrow

## Tech Stack

| Layer              | Tool                        |
|--------------------|-----------------------------|
| IDE                | Cursor                      |
| Framework          | Next.js 14 (App Router)     |
| Auth               | Supabase Auth (Google OAuth) |
| Database           | Supabase Postgres           |
| File Storage       | Supabase Storage            |
| Backend Logic      | Supabase Edge Functions     |
| AI (all)           | Gemini API                  |
| Hosting            | Vercel                      |
| Ads - Banner       | Google AdSense              |
| Ads - Rewarded     | Google AdMob                |
| Analytics          | PostHog                     |
| Error Monitoring   | Sentry                      |
| Domain + CDN       | Cloudflare                  |

## Pages & Routes

| Route                | Purpose                                      |
|----------------------|----------------------------------------------|
| /                    | Home — play button, streak, countdown         |
| /play/[round]        | Game screen — image comparison + tap detection|
| /play/transition     | Between rounds — ad + round summary           |
| /auth/login          | Login wall after Round 1                      |
| /results             | Session results + share + leaderboard link    |
| /leaderboard         | Daily + all-time rankings                     |
| /admin               | Admin portal — approve/reject image pairs     |

## Project Structure

```
dailydiffs/
├── docs/                         # Product specs (these files)
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home / landing
│   │   ├── play/
│   │   │   ├── [round]/page.tsx  # Game screen
│   │   │   └── transition/page.tsx
│   │   ├── results/page.tsx
│   │   ├── leaderboard/page.tsx
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── callback/page.tsx
│   │   ├── admin/page.tsx
│   │   └── api/
│   │       ├── validate-score/route.ts
│   │       ├── unlock-round5/route.ts
│   │       ├── daily-puzzle/route.ts
│   │       └── generate-puzzles/route.ts  # Admin-triggered generation
│   ├── components/
│   │   ├── GameCanvas.tsx
│   │   ├── Timer.tsx
│   │   ├── DifferenceMarker.tsx
│   │   ├── RoundTransition.tsx
│   │   ├── AdBanner.tsx
│   │   ├── RewardedAdButton.tsx
│   │   ├── StreakCounter.tsx
│   │   ├── ShareCard.tsx
│   │   └── Leaderboard.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── posthog.ts
│   │   └── ads.ts
│   └── hooks/
│       ├── useGameState.ts
│       ├── usePuzzle.ts
│       └── useCountdown.ts
└── supabase/
    └── migrations/
```

## Build Schedule (5 Days, 2-3 hrs/day)

| Day | Focus                                                    | Docs to Reference          | Hours   |
|-----|----------------------------------------------------------|----------------------------|---------|
| 1   | Supabase setup + Next.js scaffold + auth + game UI       | SCHEMA.md, AUTH.md, GAMEPLAY.md | 2-2.5  |
| 2   | Full game loop + scoring + streaks                       | GAMEPLAY.md                | 1.5-2   |
| 3   | Gemini image pipeline + admin portal                     | PIPELINE.md                | 2-3     |
| 4   | Leaderboard + share                                      | SOCIAL.md                  | 2-2.5   |
| 5   | Ads + analytics + polish + deploy                        | ADS.md, ANALYTICS.md       | 1.5-2   |

**Total: 10-12 hours. Target launch: Saturday March 14, 2026.**

## V2 Features (Post-Launch)

- Friend challenges — invite a friend to compete on the same puzzle
- Weekly "impossible" puzzle (Saturday special)
- Seasonal art style themes
- Sound effects and haptic feedback
- Achievement badges
- Global all-time leaderboard
