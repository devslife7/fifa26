-- Track rank history on the scores cache so the leaderboard trend indicator
-- reflects real movement since the last scoring change, instead of being
-- reconstructed per request by stripping the most recent match.
ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS rank INTEGER,
  ADD COLUMN IF NOT EXISTS previous_rank INTEGER;
