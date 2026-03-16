-- Add sequential prediction numbers starting at #100

-- 1. Create sequence starting at 100
CREATE SEQUENCE prediction_number_seq START 100;

-- 2. Add column WITHOUT default (nullable initially for backfill)
ALTER TABLE predictions ADD COLUMN prediction_number INTEGER UNIQUE;

-- 3. Backfill existing rows ordered by created_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) + 99 AS num
  FROM predictions
)
UPDATE predictions SET prediction_number = numbered.num FROM numbered WHERE predictions.id = numbered.id;

-- 4. Set default for future inserts
ALTER TABLE predictions ALTER COLUMN prediction_number SET DEFAULT nextval('prediction_number_seq');

-- 5. Make NOT NULL after backfill
ALTER TABLE predictions ALTER COLUMN prediction_number SET NOT NULL;

-- 6. Advance sequence past highest assigned number
SELECT setval('prediction_number_seq', COALESCE((SELECT MAX(prediction_number) FROM predictions), 99));
