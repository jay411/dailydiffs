# TASKS.md — DailyDiffs Development Tracker

> This file is the single source of truth for what's done, in progress, and next.
> Both Cursor and Claude Code should read this before starting work and update it after completing tasks.

## Current Status: Day 5

---

## Day 1 — Foundation + Game UI + Auth

### TODO
- [ ] Run SQL migration in Supabase (use `supabase/migrations/20260310000001_initial_schema.sql`)
- [ ] Create Supabase Storage bucket "puzzles" (Dashboard)
- [ ] Set up Google OAuth in Supabase Dashboard (Auth → Providers → Google)
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` when ready to use real data/auth
- [ ] Run `npm install` (if you see EACCES, run: `sudo chown -R $(whoami) ~/.npm`)
- [ ] Run `npm test` to run unit + UI tests
- [ ] Git commit: "feat: scaffold app with auth and game screen"

### BLOCKED
- (none)

### DONE
- [x] Scaffold Next.js 14 app with App Router and TypeScript
- [x] Install and configure Supabase client (+ @supabase/ssr)
- [x] SQL migration file from docs/SCHEMA.md (tables, indexes, RLS, triggers, functions, view)
- [x] Build auth callback route (GET /auth/callback with exchangeCodeForSession)
- [x] Build home page (/) with "Play Today's Puzzle" button
- [x] Build game screen (/play/[round]) with two images, tap detection, DifferenceMarker, Timer, counter
- [x] Build login wall (/auth/login) with Google OAuth
- [x] Build username creation screen (/auth/username)
- [x] Username validation (validate-username.ts) + /api/check-username, /api/create-user
- [x] Demo puzzle fallback when Supabase not configured or no data (placehold.co images)
- [x] Play transition stub (/play/transition), results stub (/results)
- [x] Unit tests: difference-check, validate-username, Timer; UI test: Home page

---

## Day 2 — Full Game Loop + Scoring + Streaks

### TODO
- (none)

### BLOCKED
- (none)

### DONE
- [x] Round progression: 1 → 2 → 3 → 4 → 5
- [x] Login gate triggers after Round 1 completes
- [x] Round transition screen between rounds (with round summary + score)
- [x] Scoring logic (base points + time bonus + round multiplier) in `src/lib/scoring.ts`
- [x] Streak tracking (consecutive days played) via `/api/session-complete` + DB triggers
- [x] Results screen after final round (round breakdown, total score, streak, link to leaderboard)
- [x] Timezone-based 8 AM unlock logic in `src/lib/puzzle-date.ts` (play + home use it)
- [x] Write unit tests for scoring calculations
- [x] Write unit tests for streak logic
- [x] Git commits after each feature

---

## Day 3 — Gemini Image Pipeline + Admin Portal

### TODO
- (none)

### BLOCKED
- (none)

### DONE
- [x] Build /admin page (restricted to admin email only)
- [x] Admin dashboard: approved queue depth, pending count, rejection rate
- [x] "Generate Single Day" button → calls /api/generate-puzzles round-by-round with progress
- [x] Gemini prompt generation (5 art styles) — `src/lib/gemini.ts` `generateScenePrompt`
- [x] Gemini image generation (base images) — `generateImage`
- [x] Gemini image editing (create differences) — `editImage` (Approach A)
- [x] Content safety check (Gemini Vision scan) — `checkImageSafety`
- [x] QA validation (difficulty scoring) — `scoreQuality`, auto-reject < 4 or > 9
- [x] Upload to Supabase Storage + DB (status: pending) — `puzzles-pending` private bucket
- [x] Admin review interface: grid of pending pairs grouped by date — `PuzzleCard`
- [x] Expanded view: side-by-side images with diff zones highlighted — `ExpandedPuzzleView`
- [x] Approve / Reject buttons (approve copies to public bucket, sets status=published)
- [x] Write tests for safety check logic — 13 tests in `gemini-safety.test.ts`
- [x] `src/lib/supabase-admin.ts` — service-role client
- [x] `src/app/api/admin/stats/route.ts`, `approve/route.ts`, `reject/route.ts`
- [x] `src/app/api/generate-puzzles/route.ts` — full pipeline with logging

---

## Day 4 — Leaderboard + Social Share + Groups

### TODO
- (none)

### BLOCKED
- (none)

### DONE
- [x] `/api/leaderboard` endpoint — daily rankings: score (desc), time (asc) tiebreaker; wired into left panel + mobile sheet
- [x] Leaderboard page (/leaderboard) — full page, top 50, current user highlighted
- [x] All-time tab on leaderboard (cumulative score aggregated from game_sessions)
- [x] "Your Rank" widget on results screen (fetched post session-complete)
- [x] Share card: canvas → PNG export (1200x630), content: day/score/time/diffs/streak (NO spoilers) — `src/lib/share-card.ts`
- [x] Share buttons: wired up Twitter/X, Copy Link, Web Share API (mobile native) on results page
- [x] Open Graph + Twitter Card meta tags for link previews in root layout
- [x] Groups DB migration: `groups` + `group_members` tables with RLS (`supabase/migrations/20260313000001_groups.sql`)
- [x] `/api/groups/create` — create group, generate invite code
- [x] `/api/groups/join` — join by invite code
- [x] `/api/groups/[id]/leaderboard` — members ranked by today's score
- [x] UI: "Create or join a group" modal wired up from left panel + mobile group sheet
- [x] UI: My Group section shows real members + scores (left panel + mobile sheet)
- [x] Invite link sharing (copy link with invite code from group modal)
- [x] Tests: 12 tests for leaderboard ranking, all-time aggregation, group ranking, share card text
- [x] Git commits after each feature
- [x] UI overhaul: home page auto-redirects to `/play/1` (no tap-to-play)
- [x] Play page redesigned — 3-panel desktop layout: left leaderboard panel, center game canvas, right share+ad panel
- [x] Game images: aspect ratio 4:3 (was 16:9), removed `max-w-4xl` constraint — images now ~490×368px on 1440px screen (was ~440×247px)
- [x] `x/y found` label shown under each image independently (removed from header)
- [x] Bottom leaderboard ticker (scrolling, desktop only)
- [x] Mobile: images top-anchored, bottom tab bar (Game / Scores / Group / Share), bottom sheets for leaderboard + share
- [x] Leaderboard UI scaffolded in left panel + mobile sheet (placeholder data — wire to API)
- [x] Share buttons UI scaffolded (Twitter/X, Copy, Link — wire up actions)
- [x] My Group UI scaffolded in left panel + mobile sheet with "+ Create or join a group" hook

### Bug Fixes (post Day 4)
- [x] Click detection + DifferenceMarker positions corrected for object-contain pillarboxing (square Gemini images in 4:3 container were offset by ~12.5%)
- [x] Found differences now persist to sessionStorage — navigating away and back no longer resets progress

---

## Day 5 — Ads + Analytics + Polish + Deploy

### TODO
- [ ] Deploy to Vercel
- [ ] Connect dailydiffs.app domain via Cloudflare
- [ ] Full end-to-end test of every flow
- [ ] Apply for AdSense approval
- [ ] Draft Reddit launch posts
- [ ] Git commits after each feature

### BLOCKED
- (none)

### DONE
- [x] Google AdSense bottom banner (persistent) — `src/components/ads/BannerAd.tsx`; fixed to bottom of all pages; shows real AdSense when `NEXT_PUBLIC_ADSENSE_CLIENT_ID` set, falls back to placeholder
- [x] 5-second interstitial overlay between rounds — `src/components/ads/InterstitialAd.tsx`; countdown progress bar; "Next Round" button locked until ad completes
- [x] AdMob rewarded video for Round 5 unlock — `src/components/ads/RewardedVideoAd.tsx`; full IMA SDK integration with placeholder fallback; `/api/unlock-round5` server verification
- [x] Placeholder ad spaces (until AdSense approval) — all ad components show styled grey "Advertisement" boxes when env vars are absent
- [x] Transition screen redesigned — side-by-side layout: round stats + mini leaderboard (left), ad panel (right); mobile stacked
- [x] PostHog setup + all core events — `src/lib/posthog.ts`, `src/components/PostHogProvider.tsx`; events: puzzle_started, difference_found, difference_wrong_tap, round_completed, session_completed, login_gate_shown, ad_*, share_clicked, leaderboard_viewed, home_page_viewed
- [x] Sentry error monitoring setup — `sentry.client/server/edge.config.ts`; `next.config.mjs` wrapped with `withSentryConfig`
- [x] Admin puzzle generation: use admin's local date — fixed `tomorrow()` in `AdminClient.tsx` to use local date math instead of `toISOString()` (UTC)
- [x] Mobile responsiveness pass — all pages have `pb-[50px] xl:pb-[90px]` padding to account for fixed banner; mobile ad strip removed from play page
- [x] Loading states and error handling — skeleton loader in play page; image error state in GameCanvas; `onMiss` prop for wrong-tap tracking
- [x] `watchedAdForRound5` wired end-to-end: GameSessionContext → transition page → results page → `/api/session-complete`
- [x] Tests: 12 test suites, 71 tests passing (added posthog, InterstitialAd, RewardedVideoAd tests)
- [x] Tap hit area: minimum effective radius 5% so small diff circles still register (`difference-check.ts`)
- [x] Puzzle date: use local date parts for `puzzleDate` (fix timezone bugs; was `toISOString` UTC) — `puzzle-date.ts`
- [x] Jest: ignore `.claude/worktrees/` so `npm test` only runs main src tests

---

## Notes

### How to Use This File
- **Before starting work:** Read this file to know what's next
- **After completing a task:** Check it off `[x]` and move to DONE section
- **If blocked:** Add to BLOCKED with the reason
- **If scope changes:** Update the TODO list

### Tool Assignment
- **Cursor:** UI components, page layouts, styling, visual iteration
- **Claude Code:** API routes, database queries, Gemini pipeline, testing, git operations
- **Either:** Bug fixes, refactoring, configuration

### Git
- **Prefer smaller commits per feature** (e.g. one commit for scoring, one for session-complete API, one for timer persistence) so history stays easy to review and revert.
