CREATE TABLE fixtures (
  api_match_id    INTEGER PRIMARY KEY,
  local_match_id  TEXT,
  home_code       TEXT,
  away_code       TEXT,
  home_name       TEXT,
  away_name       TEXT,
  home_short_name TEXT,
  away_short_name TEXT,
  home_flag       TEXT,
  away_flag       TEXT,
  utc_date        TEXT NOT NULL,
  status          TEXT NOT NULL,
  venue           TEXT,
  score_home      INTEGER,
  score_away      INTEGER,
  actual_result   TEXT CHECK (actual_result IN ('home', 'draw', 'away')),
  stage           TEXT NOT NULL,
  "group"         TEXT,
  refreshed_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fixtures_read" ON fixtures FOR SELECT USING (true);

CREATE INDEX idx_fixtures_stage    ON fixtures(stage);
CREATE INDEX idx_fixtures_group    ON fixtures("group") WHERE "group" IS NOT NULL;
CREATE INDEX idx_fixtures_local_id ON fixtures(local_match_id) WHERE local_match_id IS NOT NULL;
