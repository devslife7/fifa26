-- Restructure the scores cache from per-user to per-prediction.
-- The app supports multiple predictions per user (migration 003), and the
-- scoring/leaderboard code keys the cache by prediction (upsert onConflict
-- 'prediction_id'). The original table (001) was keyed by user_id, which no
-- longer matches: recalculateScores() failed with "column scores.prediction_id
-- does not exist" and the leaderboard fell back to placeholder data.
--
-- The scores table is a recalculated cache (rebuilt by recalculateScores from
-- predictions + actual_results), so restructuring it loses nothing permanent.
-- Done additively rather than DROP/CREATE to preserve the RLS policy and index.

-- Drop the old user_id primary key and its FK to profiles. user_id stays as a
-- plain (now-nullable) column so anonymous predictions can be scored too.
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_pkey CASCADE;
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_user_id_fkey;
ALTER TABLE scores ALTER COLUMN user_id DROP NOT NULL;

-- Columns the per-prediction scoring/leaderboard code expects.
ALTER TABLE scores ADD COLUMN IF NOT EXISTS prediction_id UUID;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS prediction_number INTEGER;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS name TEXT;
-- rank / previous_rank were intended by migration 015 (never applied to prod);
-- included here so the trend indicator works.
ALTER TABLE scores ADD COLUMN IF NOT EXISTS rank INTEGER;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS previous_rank INTEGER;

-- prediction_id is the upsert conflict target, so it must be unique.
ALTER TABLE scores ADD CONSTRAINT scores_prediction_id_key UNIQUE (prediction_id);
