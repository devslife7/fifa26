ALTER TABLE predictions
  ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT false;
