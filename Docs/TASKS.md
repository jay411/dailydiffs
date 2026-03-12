# TASKS.md — DailyDiffs Development Tracker

> This file is the single source of truth for what's done, in progress, and next.
> Both Cursor and Claude Code should read this before starting work and update it after completing tasks.

## Current Status: Day 2

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
- [ ] Regenerate button (per-puzzle) — currently approve/reject only
- [ ] Git commits after each feature

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

## Day 4 — Leaderboard + Social Share

### TODO
- [ ] Leaderboard page (/leaderboard)
- [ ] Daily rankings: score (desc), time (asc) tiebreaker
- [ ] Top 50 players shown
- [ ] Current user highlighted
- [ ] All-time tab (cumulative score)
- [ ] "Your Rank" widget on results screen
- [ ] Share card: canvas → PNG export (1200x630)
- [ ] Share card content: day, score, time, diffs found, streak (NO spoilers)
- [ ] Share buttons: Twitter/X, Instagram Stories, Reddit, Copy Link
- [ ] Web Share API for mobile native share
- [ ] Open Graph meta tags for link previews
- [ ] Write tests for leaderboard ranking query
- [ ] Write tests for share card generation
- [ ] Git commits after each feature

### BLOCKED
- Depends on Day 1-3 completion

### DONE
- (nothing yet)

---

## Day 5 — Ads + Analytics + Polish + Deploy

### TODO
- [ ] Google AdSense bottom banner (persistent)
- [ ] 5-second interstitial overlay between rounds
- [ ] AdMob rewarded video for Round 5 unlock
- [ ] Placeholder ad spaces (until AdSense approval)
- [ ] PostHog setup + all core events (see docs/ANALYTICS.md)
- [ ] Sentry error monitoring setup
- [ ] Mobile responsiveness pass
- [ ] Loading states and error handling
- [ ] Deploy to Vercel
- [ ] Connect dailydiffs.app domain via Cloudflare
- [ ] Full end-to-end test of every flow
- [ ] Apply for AdSense approval
- [ ] Draft Reddit launch posts
- [ ] Git commits after each feature

### BLOCKED
- Depends on Day 1-4 completion

### DONE
- (nothing yet)

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
