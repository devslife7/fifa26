-- Remove the single-active-prediction model.
DROP INDEX IF EXISTS idx_one_active_per_user;

ALTER TABLE predictions
  DROP COLUMN IF EXISTS is_active;

-- Scores now cache one leaderboard row per completed prediction, not per user.
TRUNCATE TABLE scores;

ALTER TABLE scores
  DROP CONSTRAINT IF EXISTS scores_pkey,
  ADD COLUMN IF NOT EXISTS prediction_id UUID,
  ADD COLUMN IF NOT EXISTS prediction_number INTEGER,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE scores
  ALTER COLUMN prediction_id SET NOT NULL,
  ADD CONSTRAINT scores_pkey PRIMARY KEY (prediction_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scores_prediction_id_fkey'
  ) THEN
    ALTER TABLE scores
      ADD CONSTRAINT scores_prediction_id_fkey
      FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scores_prediction_number ON scores(prediction_number);
