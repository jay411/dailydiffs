-- DailyDiffs initial schema (from docs/SCHEMA.md)
-- Do not delete or drop tables/columns without explicit approval.

-- puzzles
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
CREATE INDEX idx_puzzles_date_status ON puzzles(date, status);
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published puzzles are viewable by everyone"
  ON puzzles FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admin can view all puzzles"
  ON puzzles FOR SELECT
  USING (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));

CREATE POLICY "Admin can update puzzles"
  ON puzzles FOR UPDATE
  USING (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));

-- users
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
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Display names are public"
  ON users FOR SELECT
  USING (true);

-- game_sessions
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
CREATE INDEX idx_sessions_date_score ON game_sessions(date, total_score DESC);
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON game_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- round_results
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
ALTER TABLE round_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own results"
  ON round_results FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM game_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own results"
  ON round_results FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM game_sessions WHERE user_id = auth.uid()
    )
  );

-- daily_leaderboard
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
CREATE INDEX idx_leaderboard_date_rank ON daily_leaderboard(date, rank);
ALTER TABLE daily_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard is public"
  ON daily_leaderboard FOR SELECT
  USING (true);

-- generation_logs
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

-- push_subscriptions
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

-- email_preferences
CREATE TABLE email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_reminders BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  unsubscribe_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Functions and triggers
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_session_complete
  AFTER UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard();

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
    UPDATE users SET total_games = total_games + 1 WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_session_created
  AFTER INSERT ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_streak();

-- View for leaderboard (hides emails)
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

-- Storage buckets and policies (puzzles + puzzles-pending)
-- These rely only on Supabase's existing storage schema.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('puzzles', 'puzzles', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('puzzles-pending', 'puzzles-pending', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Puzzle images are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'puzzles');

CREATE POLICY "Pending images are admin only"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'puzzles-pending'
    AND (auth.jwt() ->> 'email') = current_setting('app.admin_email', true)
  );
