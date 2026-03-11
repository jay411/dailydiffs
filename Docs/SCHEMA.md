# SCHEMA.md — DailyDiffs Database & Configuration

## Database: Supabase Postgres

## Tables

### puzzles
Stores each image pair and its differences. One row per round per day.

```sql
CREATE TABLE puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 5),
  art_style TEXT NOT NULL,
  image_original_url TEXT NOT NULL,
  image_modified_url TEXT NOT NULL,
  differences_json JSONB NOT NULL,
  difficulty_score FLOAT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  reviewed_at TIMESTAMPTZ,
  scheduled_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, round_number)
);

-- Index for daily puzzle lookups
CREATE INDEX idx_puzzles_date_status ON puzzles(date, status);
```

**differences_json format:**
```json
[
  { "x": 25.5, "y": 40.2, "radius": 5, "description": "missing apple" },
  { "x": 70.1, "y": 15.8, "radius": 4, "description": "changed clock time" },
  { "x": 50.0, "y": 80.3, "radius": 6, "description": "shirt color changed" },
  { "x": 10.2, "y": 55.0, "radius": 4, "description": "extra flower" },
  { "x": 85.0, "y": 65.5, "radius": 5, "description": "removed bird" }
]
```
All x, y, radius values are percentages (0-100) of image dimensions.

### users
Player profiles linked to Supabase Auth.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE NOT NULL,
  auth_provider TEXT,
  streak_count INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_played_date DATE,
  total_games INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z][a-zA-Z0-9_]{2,15}$')
);
```

### game_sessions
One session per user per day. Tracks overall performance.

```sql
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  rounds_completed INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  total_time_seconds FLOAT DEFAULT 0,
  watched_ad_for_round5 BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Index for leaderboard queries
CREATE INDEX idx_sessions_date_score ON game_sessions(date, total_score DESC);
```

### round_results
Individual round performance within a session.

```sql
CREATE TABLE round_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  puzzle_id UUID REFERENCES puzzles(id),
  round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 5),
  differences_found INTEGER DEFAULT 0,
  total_differences INTEGER NOT NULL DEFAULT 5,
  time_seconds FLOAT NOT NULL,
  score INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### daily_leaderboard
Materialized rankings per day. Updated when sessions complete.

```sql
CREATE TABLE daily_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_score INTEGER NOT NULL,
  total_time_seconds FLOAT NOT NULL,
  rounds_completed INTEGER NOT NULL,
  rank INTEGER,
  UNIQUE(user_id, date)
);

-- Index for ranking queries
CREATE INDEX idx_leaderboard_date_rank ON daily_leaderboard(date, rank);
```

### generation_logs
Tracks image pipeline performance for monitoring.

```sql
CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_date DATE NOT NULL,
  art_style TEXT NOT NULL,
  prompt_used TEXT,
  generation_time_seconds FLOAT,
  qa_score FLOAT,
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'approved', 'rejected', 'failed')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### push_subscriptions
Browser push notification subscriptions.

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);
```

### email_preferences
Email reminder opt-in preferences.

```sql
CREATE TABLE email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_reminders BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  unsubscribe_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

## Row Level Security (RLS) Policies

### puzzles
```sql
-- Anyone can read published puzzles
CREATE POLICY "Published puzzles are viewable by everyone"
  ON puzzles FOR SELECT
  USING (status = 'published');

-- Admin can read all puzzles (including pending/rejected)
CREATE POLICY "Admin can view all puzzles"
  ON puzzles FOR SELECT
  USING (auth.email() = current_setting('app.admin_email'));

-- Admin can update puzzle status
CREATE POLICY "Admin can update puzzles"
  ON puzzles FOR UPDATE
  USING (auth.email() = current_setting('app.admin_email'));

-- Service role only for inserts (pipeline uses service key)
-- No user-facing insert policy needed
```

### users
```sql
-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Public can read display names (for leaderboard)
CREATE POLICY "Display names are public"
  ON users FOR SELECT
  USING (true);
  -- Note: only expose display_name via a view, not email
```

### game_sessions
```sql
-- Users can read their own sessions
CREATE POLICY "Users can view own sessions"
  ON game_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can create own sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON game_sessions FOR UPDATE
  USING (auth.uid() = user_id);
```

### round_results
```sql
-- Users can read their own round results
CREATE POLICY "Users can view own results"
  ON round_results FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM game_sessions WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own results
CREATE POLICY "Users can insert own results"
  ON round_results FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM game_sessions WHERE user_id = auth.uid()
    )
  );
```

### daily_leaderboard
```sql
-- Everyone can read the leaderboard
CREATE POLICY "Leaderboard is public"
  ON daily_leaderboard FOR SELECT
  USING (true);

-- Only service role can write (updated via trigger/function)
```

## Database Functions

### Update Leaderboard (called after session completes)
```sql
CREATE OR REPLACE FUNCTION update_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_leaderboard (user_id, date, total_score, total_time_seconds, rounds_completed)
  VALUES (NEW.user_id, NEW.date, NEW.total_score, NEW.total_time_seconds, NEW.rounds_completed)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    total_score = EXCLUDED.total_score,
    total_time_seconds = EXCLUDED.total_time_seconds,
    rounds_completed = EXCLUDED.rounds_completed;
  
  -- Recalculate ranks for today
  UPDATE daily_leaderboard
  SET rank = sub.rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_score DESC, total_time_seconds ASC) as rank
    FROM daily_leaderboard
    WHERE date = NEW.date
  ) sub
  WHERE daily_leaderboard.id = sub.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_session_complete
AFTER UPDATE ON game_sessions
FOR EACH ROW
EXECUTE FUNCTION update_leaderboard();
```

### Update User Streak (called after game completion)
```sql
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_last_played DATE;
BEGIN
  SELECT last_played_date INTO v_last_played FROM users WHERE id = NEW.user_id;
  
  IF v_last_played = CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE users SET 
      streak_count = streak_count + 1,
      longest_streak = GREATEST(longest_streak, streak_count + 1),
      last_played_date = CURRENT_DATE,
      total_games = total_games + 1
    WHERE id = NEW.user_id;
  ELSIF v_last_played IS NULL OR v_last_played < CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE users SET 
      streak_count = 1,
      longest_streak = GREATEST(longest_streak, 1),
      last_played_date = CURRENT_DATE,
      total_games = total_games + 1
    WHERE id = NEW.user_id;
  ELSIF v_last_played = CURRENT_DATE THEN
    -- Already played today, just update games count
    UPDATE users SET total_games = total_games + 1 WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_session_created
AFTER INSERT ON game_sessions
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();
```

## Supabase Storage

### Bucket: puzzles-pending (PRIVATE)
- Private bucket — only accessible by admin and service role
- Pipeline uploads generated images here
- Admin reviews them in the /admin portal
- File structure: `{date}/{round}_original.png`, `{date}/{round}_modified.png`
- Example: `2026-03-22/3_original.png`, `2026-03-22/3_modified.png`

### Bucket: puzzles (PUBLIC)
- Public bucket — accessible by all players without auth
- Only approved images are moved here from puzzles-pending
- On admin "Approve": copy from puzzles-pending → puzzles, delete from puzzles-pending
- CDN-cached by Cloudflare (same images served to all users)
- File structure: same as puzzles-pending

### Storage Policies
```sql
-- Anyone can read approved puzzle images
CREATE POLICY "Puzzle images are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'puzzles');

-- Only admin/service role can read pending images
CREATE POLICY "Pending images are admin only"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'puzzles-pending' AND auth.email() = current_setting('app.admin_email'));

-- Only service role can upload to either bucket (pipeline uses service key)
```

### Admin Approve Flow
```
1. Admin clicks "Approve" on a puzzle pair
2. Server copies images: puzzles-pending/{date}/{round}_*.png → puzzles/{date}/{round}_*.png
3. Server deletes originals from puzzles-pending
4. Server updates puzzles table: status = 'approved', image URLs point to public bucket
5. Images are now accessible to players
```

## Views (for safe public queries)

### Leaderboard View (hides emails)
```sql
CREATE VIEW public_leaderboard AS
SELECT 
  dl.rank,
  u.username,
  dl.total_score,
  dl.total_time_seconds,
  dl.rounds_completed,
  dl.date
FROM daily_leaderboard dl
JOIN users u ON dl.user_id = u.id;
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Gemini
GEMINI_API_KEY=AIza...

# Ads
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_ADSENSE_BANNER_SLOT=XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_INTERSTITIAL_SLOT=XXXXXXXXXX
NEXT_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID=ca-app-pub-XXXXXXX/XXXXXXX

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_XXXXXXXXXXXX
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://XXXX@sentry.io/XXXX

# Admin
ADMIN_EMAIL=your-email@gmail.com

# Web Push (generate VAPID keys with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BLxxxxxx...
VAPID_PRIVATE_KEY=xxxxxx...

# Email (Resend — free tier: 100 emails/day)
RESEND_API_KEY=re_xxxxxx...
```

**IMPORTANT:** Only `NEXT_PUBLIC_*` variables are exposed to the browser. `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `ADMIN_EMAIL` are server-side only. Never prefix these with `NEXT_PUBLIC_`.

## Initial Data Setup

For Day 1 testing, seed the database with placeholder puzzles:
```sql
-- Insert test puzzles with placeholder images for today
INSERT INTO puzzles (date, round_number, art_style, image_original_url, image_modified_url, differences_json, status, difficulty_score)
VALUES 
  (CURRENT_DATE, 1, 'cartoon', '/test/r1_original.png', '/test/r1_modified.png', 
   '[{"x":25,"y":40,"radius":5,"description":"test diff 1"},{"x":70,"y":15,"radius":4,"description":"test diff 2"},{"x":50,"y":80,"radius":6,"description":"test diff 3"},{"x":10,"y":55,"radius":4,"description":"test diff 4"},{"x":85,"y":65,"radius":5,"description":"test diff 5"}]',
   'published', 7.0),
  -- Repeat for rounds 2-5 with different art styles
;
```
