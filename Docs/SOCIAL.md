# SOCIAL.md — DailyDiffs Sharing & Leaderboard

## Why This Matters

Social sharing and the leaderboard are DailyDiffs' primary organic growth engines. Every share is a free ad. The leaderboard creates competition that drives daily return visits. These are not V2 features — they ship in V1.

## Share Card

### Design
```
┌──────────────────────────────────┐
│                                  │
│  🔍 DAILYDIFFS                  │
│                                  │
│  Day 42 — March 15, 2026        │
│                                  │
│  Score: 2,450                    │
│  Time: 1m 23s                    │
│  Differences: 23/25              │
│  🔥 Streak: 7 days              │
│                                  │
│  dailydiffs.com                  │
│                                  │
└──────────────────────────────────┘
```

### Rules
- Does NOT reveal difference locations (no spoilers)
- Does NOT show the actual images (prevents sharing answers)
- Includes game branding and URL
- Uses DailyDiffs brand colors
- Clean, minimal, looks good on any social platform
- Generated as a canvas element → exported as PNG image

### Technical Implementation

```
ShareCard.tsx:
1. Create a <canvas> element (1200 x 630px — optimal for social previews)
2. Draw background with DailyDiffs branding
3. Render text: day number, date, score, time, diffs found, streak
4. Export canvas as PNG blob
5. For download: create temporary <a> with blob URL
6. For Web Share API: pass blob as file
```

## Share Targets

### Twitter/X
- Pre-filled tweet text + attached share card image
- Text template:
  ```
  🔍 DailyDiffs — Day {day_number}
  
  Score: {score} | Time: {time} | 🔥 {streak}-day streak
  
  Can you beat me? dailydiffs.com
  ```
- Use Twitter Web Intent: `https://twitter.com/intent/tweet?text=...`

### Instagram Stories
- Download share card image → user uploads to Stories manually
- Button label: "Share to Stories" → triggers image download
- Add instruction tooltip: "Save image and share to your Story!"

### Reddit
- Copy pre-formatted text to clipboard
- Button label: "Share on Reddit"
- Text format optimized for Reddit (markdown):
  ```
  **🔍 DailyDiffs — Day {day_number}**
  
  Score: {score} | Time: {time} | 🔥 {streak}-day streak
  
  [Play today's puzzle](https://dailydiffs.com)
  ```

### Copy Link
- Copies dailydiffs.com to clipboard
- Shows "Copied!" confirmation toast
- URL includes Open Graph meta tags for rich preview when pasted

### Native Share (Mobile)
- Uses Web Share API (navigator.share)
- Passes share card image as file + text
- Falls back to copy link if Web Share API unavailable
- Only show on mobile devices

### Share Button Placement

On results screen (/results):
```
┌──────────────────────────────────┐
│  Your Results                    │
│                                  │
│  Total Score: 2,450              │
│  Total Time: 1m 23s             │
│  Differences: 23/25              │
│  🔥 7-day streak                │
│  📊 Rank: #12 of 847 today     │
│                                  │
│  [Share]  [View Leaderboard]    │
│                                  │
│  ⏰ Next puzzle in 14h 23m     │
└──────────────────────────────────┘
```

Tapping "Share" opens a share sheet:
```
┌──────────────────────────────────┐
│  Share Your Results              │
│                                  │
│  [🐦 Twitter/X]                 │
│  [📷 Instagram Story]           │
│  [🤖 Reddit]                    │
│  [🔗 Copy Link]                 │
│                                  │
└──────────────────────────────────┘
```

On mobile, replace all buttons with single native share button using Web Share API.

## Open Graph Meta Tags

Add to layout.tsx for rich link previews:
```html
<meta property="og:title" content="DailyDiffs — Daily Spot-the-Difference Puzzle" />
<meta property="og:description" content="5 AI-generated puzzles. 5 art styles. New every day at 8 AM. Can you spot all the differences?" />
<meta property="og:image" content="https://dailydiffs.com/og-image.png" />
<meta property="og:url" content="https://dailydiffs.com" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="DailyDiffs — Daily Spot-the-Difference Puzzle" />
<meta name="twitter:description" content="5 AI-generated puzzles. 5 art styles. New every day." />
<meta name="twitter:image" content="https://dailydiffs.com/og-image.png" />
```

Create a static og-image.png (1200x630) with DailyDiffs branding for link previews.

---

## Leaderboard

### Daily Leaderboard (/leaderboard)

Shows today's rankings. Refreshes in real-time as players complete sessions.

```
┌──────────────────────────────────────────────┐
│  🏆 DailyDiffs Leaderboard                  │
│                                              │
│  [Today]  [All Time]                         │
│  March 15, 2026                              │
│                                              │
│  #1  🥇 SarahK        3,210    0:52   5/5   │
│  #2  🥈 MikeD         3,105    1:03   5/5   │
│  #3  🥉 JennyL        2,980    1:15   5/5   │
│  #4     TomR          2,870    1:22   5/5   │
│  #5     AlexP         2,750    1:35   5/5   │
│  ...                                        │
│  ────────────────────────────────────────    │
│  #12 ⭐ You           2,450    1:23   5/5   │  ← highlighted
│  ────────────────────────────────────────    │
│  ...                                        │
│  #50    LastUser      890      3:45   3/5   │
│                                              │
│  847 players today                           │
└──────────────────────────────────────────────┘
```

### Columns
| Column      | Description                    | Sort    |
|-------------|--------------------------------|---------|
| Rank        | Position (1-50 shown)          | —       |
| Name        | display_name from users table  | —       |
| Score       | total_score from session       | Primary (desc) |
| Time        | total_time formatted as m:ss   | Tiebreaker (asc) |
| Rounds      | rounds_completed / 5           | —       |

### Ranking Logic
```sql
SELECT 
  u.display_name,
  gs.total_score,
  gs.total_time_seconds,
  gs.rounds_completed,
  ROW_NUMBER() OVER (ORDER BY gs.total_score DESC, gs.total_time_seconds ASC) as rank
FROM game_sessions gs
JOIN users u ON gs.user_id = u.id
WHERE gs.date = CURRENT_DATE
ORDER BY rank
LIMIT 50;
```

Primary sort: total_score descending (higher is better)
Tiebreaker: total_time_seconds ascending (faster is better)

### All-Time Leaderboard (Tab)
- Aggregates total cumulative score across all days
- Shows: rank, name, total score, games played, longest streak
- Query sums total_score from all game_sessions per user

### Current User Highlight
- Always show the current user's rank, even if outside top 50
- If user is #127, show top 50 then a separator then their row
- Highlighted with a star icon and distinct background color

### Leaderboard on Results Page
- "Your Rank" widget: "#12 of 847 players today"
- Tapping it navigates to /leaderboard with their row highlighted

### Mobile Layout
Leaderboard rows become compact cards:
```
┌─────────────────────────┐
│ #1 🥇 SarahK           │
│ Score: 3,210  Time: 0:52│
└─────────────────────────┘
```

### Edge Cases
- User who only completed 4 rounds (skipped Round 5 ad) is still ranked
- Users who completed more rounds rank higher if scores are equal
- Leaderboard updates in near-real-time (Supabase realtime subscription or polling every 30 seconds)
