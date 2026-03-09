-- Profiles table (auto-created on signup via trigger)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Predictions table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  group_matches JSONB DEFAULT '{}'::jsonb,
  knockout_matches JSONB DEFAULT '{}'::jsonb,
  champion_code TEXT,
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  share_token TEXT UNIQUE
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own predictions"
  ON predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own predictions"
  ON predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own predictions"
  ON predictions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Public can read complete predictions by share_token"
  ON predictions FOR SELECT
  USING (is_complete = true AND share_token IS NOT NULL);

-- Actual results table (admin-only writes)
CREATE TABLE actual_results (
  match_id TEXT PRIMARY KEY,
  match_type TEXT NOT NULL CHECK (match_type IN ('group', 'knockout')),
  result TEXT NOT NULL CHECK (result IN ('home', 'draw', 'away')),
  winning_team TEXT
);

ALTER TABLE actual_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Actual results are viewable by everyone"
  ON actual_results FOR SELECT
  USING (true);

-- Scores table (leaderboard cache)
CREATE TABLE scores (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  champion_code TEXT,
  display_name TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scores are viewable by everyone"
  ON scores FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX idx_predictions_share_token ON predictions(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_scores_total_points ON scores(total_points DESC);
