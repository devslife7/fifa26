-- Migration: Support multiple predictions per user
-- Drops the one-prediction-per-user constraint, adds naming, active flag, and timestamps

-- 1. Add new columns
ALTER TABLE predictions
  ADD COLUMN name TEXT NOT NULL DEFAULT 'My Predictions',
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN third_place_tiebreaker JSONB,
  ADD COLUMN created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Migrate existing rows: mark them as active and backfill timestamps
UPDATE predictions
SET is_active = true,
    created_at = COALESCE(completed_at, now()),
    updated_at = COALESCE(completed_at, now());

-- 3. Drop the UNIQUE constraint on user_id (allows multiple predictions per user)
ALTER TABLE predictions DROP CONSTRAINT predictions_user_id_key;

-- 4. Ensure at most one active prediction per user
CREATE UNIQUE INDEX idx_one_active_per_user ON predictions(user_id) WHERE is_active = true;

-- 5. Index for efficient listing of user predictions
CREATE INDEX idx_predictions_user_id ON predictions(user_id, created_at DESC);

-- 6. Allow users to delete their own predictions
CREATE POLICY "Users can delete own predictions"
  ON predictions FOR DELETE
  USING (auth.uid() = user_id);
