-- Persist user-defined ordering for group point ties.
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS group_tiebreakers JSONB DEFAULT '{}'::jsonb;

UPDATE predictions
SET group_tiebreakers = '{}'::jsonb
WHERE group_tiebreakers IS NULL;

ALTER TABLE predictions
  ALTER COLUMN group_tiebreakers SET DEFAULT '{}'::jsonb;
