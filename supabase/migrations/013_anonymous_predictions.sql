-- Support guest submissions before a profile exists.
-- Anonymous predictions are later claimed by matching submitter_email.

ALTER TABLE predictions
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS submitter_name TEXT,
  ADD COLUMN IF NOT EXISTS submitter_email TEXT;

UPDATE predictions
SET submitter_email = lower(trim(submitter_email))
WHERE submitter_email IS NOT NULL
  AND submitter_email <> lower(trim(submitter_email));

CREATE INDEX IF NOT EXISTS idx_predictions_unclaimed_submitter_email
  ON predictions(submitter_email)
  WHERE user_id IS NULL AND submitter_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_predictions_unclaimed_submitter_email_lower
  ON predictions(lower(submitter_email))
  WHERE user_id IS NULL AND submitter_email IS NOT NULL;
