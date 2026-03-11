# GAMEPLAY.md — DailyDiffs Game Mechanics

## Game Rules

1. Every day at 8 AM local time, 5 new puzzles unlock
2. Each puzzle is a pair of images — one original, one modified with 5 differences
3. Players tap/click where they see differences
4. Each round has a different art style (difficulty increases per round)
5. Round 1 is free for all visitors (no login required)
6. After Round 1, a login wall appears (see AUTH.md)
7. Rounds 2-4 are available to logged-in users
8. Between each round, a 5-second ad interstitial is shown (see ADS.md)
9. Round 5 is locked behind a rewarded video ad
10. After all rounds, the user sees results and can share or view leaderboard (see SOCIAL.md)

## Art Styles (One Per Round, Same Every Day)

| Round | Art Style              | Prompt Keyword                                  | Difficulty  | Differences |
|-------|------------------------|------------------------------------------------|-------------|-------------|
| 1     | Retro newspaper cartoon | "flat color comic strip illustration"           | Easy        | 5           |
| 2     | Pixel art              | "16-bit pixel art scene"                        | Easy-Medium | 5           |
| 3     | Watercolor             | "watercolor painting soft edges"                | Medium      | 5           |
| 4     | Isometric room         | "isometric cutaway room illustration"           | Medium-Hard | 5           |
| 5     | Photorealistic         | "photorealistic detailed photograph"            | Hard        | 5           |

The same 5 styles repeat every day. Only the scene/content changes daily. This creates a predictable difficulty curve and lets players develop style-specific skills.

## Game Screen Layout

### Desktop (>768px)
```
┌─────────────────────────────────────────────────┐
│  DailyDiffs    Round 2/5    ⏱ 00:23    3/5 found│
├────────────────────┬────────────────────────────┤
│                    │                            │
│   Original Image   │   Modified Image           │
│                    │                            │
│   (tap to spot     │   (tap to spot             │
│    differences)    │    differences)            │
│                    │                            │
├────────────────────┴────────────────────────────┤
│  ● ● ● ○ ○  (difference progress dots)         │
├─────────────────────────────────────────────────┤
│  [Ad Banner - persistent bottom]                │
└─────────────────────────────────────────────────┘
```

### Mobile (<768px)
```
┌───────────────────────┐
│ DailyDiffs  Round 2/5 │
│ ⏱ 00:23     3/5 found│
├───────────────────────┤
│                       │
│   Original Image      │
│                       │
├───────────────────────┤
│  [Toggle / Swipe]     │
├───────────────────────┤
│                       │
│   Modified Image      │
│                       │
├───────────────────────┤
│ ● ● ● ○ ○            │
├───────────────────────┤
│ [Ad Banner]           │
└───────────────────────┘
```

On mobile, users can toggle between images or swipe to compare. Tap targets must be minimum 44px.

## Tap / Click Detection

When a user taps on either image:
1. Get the tap coordinates (x, y) relative to the image
2. Normalize coordinates to percentages (0-100) to handle different screen sizes
3. Check against the `differences_json` array from the puzzle data
4. Each difference has: `{ x: number, y: number, radius: number }` (all in percentage coordinates)
5. If tap is within the radius of any unfound difference → mark as found
6. If tap misses all differences → brief red flash animation, no score penalty in V1

```
differences_json format:
[
  { "x": 25.5, "y": 40.2, "radius": 5, "description": "missing apple" },
  { "x": 70.1, "y": 15.8, "radius": 4, "description": "changed clock time" },
  { "x": 50.0, "y": 80.3, "radius": 6, "description": "shirt color changed" },
  { "x": 10.2, "y": 55.0, "radius": 4, "description": "extra flower" },
  { "x": 85.0, "y": 65.5, "radius": 5, "description": "removed bird" }
]
```

All coordinates are percentages (0-100) of image width/height so they work at any resolution.

## Found Difference Animation

When a difference is found:
1. Green circle expands from the tap point with a brief pulse animation
2. Circle remains visible on both images at the difference location
3. Difference counter updates (e.g., "3/5" → "4/5")
4. Brief haptic feedback on mobile (if supported)
5. Satisfying "pop" sound effect (V2)

## Round Completion

A round is complete when:
- All 5 differences are found, OR
- Timer reaches 60 seconds (V1 — no time limit initially, just tracks time)

For V1: No time limit. Players can take as long as they want. Timer just counts up for scoring.

## Round Progression Flow

```
Round 1 (Free, no login)
  ↓ complete
Login Gate (see AUTH.md)
  ↓ authenticated
Round Transition (5-sec ad + Round 1 summary)
  ↓
Round 2
  ↓ complete
Round Transition (5-sec ad + Round 2 summary)
  ↓
Round 3
  ↓ complete
Round Transition (5-sec ad + Round 3 summary)
  ↓
Round 4
  ↓ complete
Rewarded Ad Gate ("Watch ad to unlock Round 5")
  ↓ watched OR skipped
Round 5 (if watched) OR Results (if skipped)
  ↓ complete
Results Screen
```

## Round Transition Screen

Between each round:
1. Show round summary: differences found, time taken, score earned
2. Display 5-second ad interstitial
3. Show preview of next round's art style with label (e.g., "Next: Watercolor — Medium")
4. "Next Round" button appears after ad completes

## Scoring System

```
Per Round:
  base_points = differences_found × 100
  time_bonus = max(0, 300 - time_seconds)
  round_multiplier = varies by round:
    Round 1 = 1.0x
    Round 2 = 1.2x
    Round 3 = 1.5x
    Round 4 = 2.0x
    Round 5 = 3.0x
  
  round_score = (base_points + time_bonus) × round_multiplier

Total Session Score = sum of all round scores

Example:
  Round 3: found 4/5 diffs in 35 seconds
  base_points = 4 × 100 = 400
  time_bonus = max(0, 300 - 35) = 265
  round_multiplier = 1.5
  round_score = (400 + 265) × 1.5 = 997.5 → 998 (rounded)
```

## Streak Logic

```
On game completion (at least Round 1 finished):
  if user.last_played_date == yesterday:
    user.streak_count += 1
  elif user.last_played_date == today:
    // already played today, no change
  else:
    user.streak_count = 1  // streak broken, restart
  
  user.last_played_date = today
  user.longest_streak = max(user.longest_streak, user.streak_count)
  user.total_games += 1
```

Streak milestones to celebrate: 3, 7, 14, 30, 50, 100 days.

## Timezone / Unlock Logic

```javascript
// Client-side unlock logic
const now = new Date();
const localHour = now.getHours();

if (localHour < 8) {
  // Before 8 AM: show countdown to unlock
  // Use yesterday's date for puzzle lookup (yesterday's puzzle still playable)
  const puzzleDate = getYesterdayDateString(); // YYYY-MM-DD
  showCountdown(8 - localHour);
} else {
  // 8 AM or later: today's puzzle is live
  const puzzleDate = getTodayDateString(); // YYYY-MM-DD
  fetchPuzzles(puzzleDate);
}
```

Server-side: Puzzles are stored by date (YYYY-MM-DD). The same puzzle set is available globally for each date. The client determines which date to request based on local time.

## Difference Types (for image generation pipeline reference)

Each puzzle should include a mix of these difference types:
- Color change (e.g., shirt from blue to red)
- Object removal (e.g., remove a book from shelf)
- Object addition (e.g., add a plant on the table)
- Size change (e.g., make the clock bigger)
- Position shift (e.g., move a cup to the left)
- Pattern change (e.g., stripes to polka dots)
- Text change (e.g., change a sign or label)

Each puzzle always has exactly 5 differences.
